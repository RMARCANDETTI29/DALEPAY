export type Currency = 'USD' | 'USDT' | 'VES'

export interface Wallet {
  id: string
  user_id: string
  currency: Currency
  balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  sender_id: string | null
  receiver_id: string | null
  sender_wallet_id: string | null
  receiver_wallet_id: string | null
  amount: number
  currency: Currency
  type: 'transfer' | 'conversion' | 'deposit' | 'p2p'
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  description: string | null
  fee: number
  created_at: string
  sender_email?: string
  receiver_email?: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  is_admin?: boolean
  created_at: string
}

export interface FeeCollected {
  id: string
  transaction_id: string | null
  user_id: string | null
  amount: number
  currency: string
  fee_type: 'conversion' | 'transfer' | 'p2p'
  wallet_address: string
  txid: string | null
  created_at: string
}

export interface ExchangeRate {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  updated_at: string
}

export interface RateHistory {
  id: string
  source: string
  from_currency: string
  to_currency: string
  rate: number
  raw_data: unknown
  created_at: string
}

export interface UsdtDeposit {
  id: string
  user_id: string
  amount: number
  tx_hash: string
  network: string
  deposit_address: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface P2POrder {
  id: string
  seller_id: string
  buyer_id: string | null
  type: 'sell' | 'buy'
  amount_usdt: number
  rate: number
  amount_ves: number
  payment_method: string
  payment_details: Record<string, string> | null
  status: 'open' | 'taken' | 'paid' | 'completed' | 'cancelled' | 'disputed' | 'expired'
  fee: number
  expires_at: string | null
  created_at: string
  updated_at: string
  seller_profile?: Profile
  buyer_profile?: Profile
}

export interface P2PMessage {
  id: string
  order_id: string
  sender_id: string
  message: string
  created_at: string
  sender_profile?: Profile
}

export interface Merchant {
  id: string
  user_id: string | null
  business_name: string
  rif: string
  plan: 'basico' | 'pro'
  plan_price: number
  expires_at: string | null
  active: boolean
  created_at: string
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'Dolares',
  USDT: 'Tether',
  VES: 'Bolivares'
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  USDT: '₮',
  VES: 'Bs.'
}

export const EXCHANGE_RATES: Record<string, number> = {
  'USD_USDT': 1.0,
  'USDT_USD': 1.0,
  'USD_VES': 603.00,
  'VES_USD': 1 / 603.00,
  'USDT_VES': 603.00,
  'VES_USDT': 1 / 603.00,
}

export const COMMISSION_RATE = 0.005
export const TRANSFER_FEE_RATE = 0.003
export const P2P_FEE_RATE = 0.005

export const COMMISSION_WALLET = 'TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt'
export const DEPOSIT_ADDRESS = 'TBTeqEJ4PAVxBrcSvWaACCkVzGwM6Sk6Zt'
