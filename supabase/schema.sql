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
  type TEXT NOT NULL CHECK (type IN ('transfer', 'conversion', 'deposit', 'p2p')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
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
  fee_type TEXT NOT NULL CHECK (fee_type IN ('conversion', 'transfer', 'p2p')),
  wallet_address TEXT DEFAULT 'TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt',
  txid TEXT,
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

-- Rate history (Binance P2P rates)
CREATE TABLE IF NOT EXISTS rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'binance_p2p',
  from_currency TEXT NOT NULL DEFAULT 'USD',
  to_currency TEXT NOT NULL DEFAULT 'VES',
  rate NUMERIC(20, 4) NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USDT Deposits (recargas)
CREATE TABLE IF NOT EXISTS usdt_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(20, 2) NOT NULL,
  tx_hash TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  deposit_address TEXT NOT NULL DEFAULT 'TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- P2P Orders (USD/VES marketplace)
CREATE TABLE IF NOT EXISTS p2p_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('sell', 'buy')),
  amount_usdt NUMERIC(20, 2) NOT NULL,
  rate NUMERIC(20, 4) NOT NULL,
  amount_ves NUMERIC(20, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pago_movil',
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'taken', 'paid', 'completed', 'cancelled', 'disputed', 'expired')),
  fee NUMERIC(20, 2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- P2P Chat Messages
CREATE TABLE IF NOT EXISTS p2p_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES p2p_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_messages ENABLE ROW LEVEL SECURITY;

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

-- Fees collected policies
DROP POLICY IF EXISTS "Anyone can view fees" ON fees_collected;
CREATE POLICY "Anyone can view fees" ON fees_collected
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert fees" ON fees_collected;
CREATE POLICY "Anyone can insert fees" ON fees_collected
  FOR INSERT WITH CHECK (true);

-- Exchange rates policies
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can view exchange rates" ON exchange_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can manage exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can manage exchange rates" ON exchange_rates
  FOR ALL USING (true);

-- Rate history policies
DROP POLICY IF EXISTS "Anyone can view rate history" ON rate_history;
CREATE POLICY "Anyone can view rate history" ON rate_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert rate history" ON rate_history;
CREATE POLICY "Anyone can insert rate history" ON rate_history
  FOR INSERT WITH CHECK (true);

-- USDT Deposits policies
DROP POLICY IF EXISTS "Users can view own deposits" ON usdt_deposits;
CREATE POLICY "Users can view own deposits" ON usdt_deposits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own deposits" ON usdt_deposits;
CREATE POLICY "Users can insert own deposits" ON usdt_deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all deposits" ON usdt_deposits;
CREATE POLICY "Admins can view all deposits" ON usdt_deposits
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update deposits" ON usdt_deposits;
CREATE POLICY "Admins can update deposits" ON usdt_deposits
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- P2P Orders policies
DROP POLICY IF EXISTS "Anyone can view p2p orders" ON p2p_orders;
CREATE POLICY "Anyone can view p2p orders" ON p2p_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert p2p orders" ON p2p_orders;
CREATE POLICY "Users can insert p2p orders" ON p2p_orders
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can update own p2p orders" ON p2p_orders;
CREATE POLICY "Users can update own p2p orders" ON p2p_orders
  FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- P2P Messages policies
DROP POLICY IF EXISTS "Order participants can view messages" ON p2p_messages;
CREATE POLICY "Order participants can view messages" ON p2p_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM p2p_orders WHERE id = order_id AND (seller_id = auth.uid() OR buyer_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Order participants can send messages" ON p2p_messages;
CREATE POLICY "Order participants can send messages" ON p2p_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

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
CREATE INDEX IF NOT EXISTS idx_rate_history_created ON rate_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_deposits_user ON usdt_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_deposits_status ON usdt_deposits(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_seller ON p2p_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_buyer ON p2p_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_p2p_messages_order ON p2p_messages(order_id);

-- Seed exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'USDT', 1.0),
  ('USDT', 'USD', 1.0),
  ('USD', 'VES', 78.50),
  ('VES', 'USD', 0.012739),
  ('USDT', 'VES', 78.50),
  ('VES', 'USDT', 0.012739)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();
