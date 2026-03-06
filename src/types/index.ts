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
  type: 'transfer' | 'conversion' | 'deposit'
  status: 'completed' | 'pending' | 'failed'
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
  'USD_VES': 78.50,
  'VES_USD': 1 / 78.50,
  'USDT_VES': 78.50,
  'VES_USDT': 1 / 78.50,
}

export const COMMISSION_RATE = 0.005
