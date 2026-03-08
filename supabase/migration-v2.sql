-- DalePay V2 Migration — Run this in Supabase SQL Editor
-- Adds: rate_history, usdt_deposits, p2p_orders, p2p_messages
-- Updates: fees_collected, transactions

-- Update transactions type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('transfer', 'conversion', 'deposit', 'p2p'));

-- Update transactions status constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('completed', 'pending', 'failed', 'cancelled'));

-- Update fees_collected fee_type constraint and add columns
ALTER TABLE fees_collected DROP CONSTRAINT IF EXISTS fees_collected_fee_type_check;
ALTER TABLE fees_collected ADD CONSTRAINT fees_collected_fee_type_check CHECK (fee_type IN ('conversion', 'transfer', 'p2p'));
ALTER TABLE fees_collected ADD COLUMN IF NOT EXISTS wallet_address TEXT DEFAULT 'TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt';
ALTER TABLE fees_collected ADD COLUMN IF NOT EXISTS txid TEXT;

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

-- Enable RLS on new tables
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usdt_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_messages ENABLE ROW LEVEL SECURITY;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_history_created ON rate_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_deposits_user ON usdt_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_deposits_status ON usdt_deposits(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_seller ON p2p_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_buyer ON p2p_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_p2p_messages_order ON p2p_messages(order_id);
