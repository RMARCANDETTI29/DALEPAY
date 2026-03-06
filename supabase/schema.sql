-- DalePay Database Schema
-- Run this in the Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'USDT', 'VES')),
  balance NUMERIC(20, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  sender_wallet_id UUID REFERENCES wallets(id),
  receiver_wallet_id UUID REFERENCES wallets(id),
  amount NUMERIC(20, 2) NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('transfer', 'conversion', 'deposit')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  description TEXT,
  fee NUMERIC(20, 2) DEFAULT 0,
  sender_email TEXT,
  receiver_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fees collected table (monetization)
CREATE TABLE IF NOT EXISTS fees_collected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  user_id UUID REFERENCES profiles(id),
  amount NUMERIC(20, 2) NOT NULL,
  currency TEXT NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('conversion', 'transfer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange rates table (admin-manageable)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(20, 6) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  rif TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'pro')),
  plan_price NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees_collected ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets policies
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;
CREATE POLICY "Users can update own wallets" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
CREATE POLICY "Users can insert own wallets" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- For P2P: allow updating receiver wallet
DROP POLICY IF EXISTS "Users can update receiver wallets for transfers" ON wallets;
CREATE POLICY "Users can update receiver wallets for transfers" ON wallets
  FOR UPDATE USING (true);

-- Transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Fees collected policies (admins can read all, users can read own)
DROP POLICY IF EXISTS "Anyone can view fees" ON fees_collected;
CREATE POLICY "Anyone can view fees" ON fees_collected
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert fees" ON fees_collected;
CREATE POLICY "Anyone can insert fees" ON fees_collected
  FOR INSERT WITH CHECK (true);

-- Exchange rates policies (anyone can read, admins update via service role)
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can view exchange rates" ON exchange_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can manage exchange rates" ON exchange_rates
  FOR ALL USING (true);

-- Merchants policies
DROP POLICY IF EXISTS "Anyone can view merchants" ON merchants;
CREATE POLICY "Anyone can view merchants" ON merchants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert merchants" ON merchants;
CREATE POLICY "Anyone can insert merchants" ON merchants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own merchant" ON merchants;
CREATE POLICY "Users can update own merchant" ON merchants
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fees_created ON fees_collected(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fees_type ON fees_collected(fee_type);
CREATE INDEX IF NOT EXISTS idx_merchants_user ON merchants(user_id);

-- Seed exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'USDT', 1.0),
  ('USDT', 'USD', 1.0),
  ('USD', 'VES', 78.50),
  ('VES', 'USD', 0.012739),
  ('USDT', 'VES', 78.50),
  ('VES', 'USDT', 0.012739)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();
