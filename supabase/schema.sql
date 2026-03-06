-- DalePay Database Schema
-- Run this in the Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- For P2P: allow updating receiver wallet
CREATE POLICY "Users can update receiver wallets for transfers" ON wallets
  FOR UPDATE USING (true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ============================================
-- SEED DATA: Test Users
-- ============================================
-- Note: You need to create these users in Supabase Auth first:
-- 1. demo@dalepay.com / Demo123456!
-- 2. maria@dalepay.com / Demo123456!
-- Then run the INSERT statements below using the UUIDs from auth.users

-- After creating users in Auth, run:
-- INSERT INTO profiles (id, email, full_name) VALUES
--   ('<demo-uuid>', 'demo@dalepay.com', 'Demo User'),
--   ('<maria-uuid>', 'maria@dalepay.com', 'Maria Garcia');

-- INSERT INTO wallets (user_id, currency, balance) VALUES
--   ('<demo-uuid>', 'USD', 500.00),
--   ('<demo-uuid>', 'USDT', 250.00),
--   ('<demo-uuid>', 'VES', 10000000.00),
--   ('<maria-uuid>', 'USD', 1200.00),
--   ('<maria-uuid>', 'USDT', 800.00),
--   ('<maria-uuid>', 'VES', 25000000.00);
