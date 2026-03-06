import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Wallet, Transaction, Currency, ExchangeRate } from '../types'
import { EXCHANGE_RATES, COMMISSION_RATE, TRANSFER_FEE_RATE } from '../types'

interface WalletState {
  wallets: Wallet[]
  transactions: Transaction[]
  exchangeRates: Record<string, number>
  loading: boolean
  fetchWallets: (userId: string) => Promise<void>
  fetchTransactions: (userId: string) => Promise<void>
  fetchExchangeRates: () => Promise<void>
  getRate: (from: Currency, to: Currency) => number
  sendMoney: (senderId: string, senderEmail: string, receiverEmail: string, amount: number, currency: Currency, description?: string) => Promise<void>
  convertCurrency: (userId: string, fromCurrency: Currency, toCurrency: Currency, amount: number) => Promise<void>
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  transactions: [],
  exchangeRates: {},
  loading: false,

  fetchWallets: async (userId) => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('currency')
    if (data) set({ wallets: data })
  },

  fetchTransactions: async (userId) => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) set({ transactions: data })
  },

  fetchExchangeRates: async () => {
    const { data } = await supabase.from('exchange_rates').select('*')
    if (data && data.length > 0) {
      const rates: Record<string, number> = {}
      data.forEach((r: ExchangeRate) => {
        rates[`${r.from_currency}_${r.to_currency}`] = Number(r.rate)
      })
      set({ exchangeRates: rates })
    }
  },

  getRate: (from, to) => {
    const { exchangeRates } = get()
    const key = `${from}_${to}`
    return exchangeRates[key] || EXCHANGE_RATES[key] || 0
  },

  sendMoney: async (senderId, senderEmail, receiverEmail, amount, currency, description) => {
    set({ loading: true })
    try {
      const { data: receiver } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', receiverEmail)
        .single()

      if (!receiver) throw new Error('Usuario no encontrado')
      if (receiver.id === senderId) throw new Error('No puedes enviarte dinero a ti mismo')

      // Calculate P2P fee (0.3%)
      const fee = Math.round(amount * TRANSFER_FEE_RATE * 100) / 100
      const netAmount = amount - fee

      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', senderId)
        .eq('currency', currency)
        .single()

      if (!senderWallet) throw new Error('Wallet no encontrada')
      if (senderWallet.balance < amount) throw new Error('Saldo insuficiente')

      const { data: receiverWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', receiver.id)
        .eq('currency', currency)
        .single()

      if (!receiverWallet) throw new Error('El destinatario no tiene wallet de ' + currency)

      // Deduct full amount from sender
      const { error: e1 } = await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance - amount })
        .eq('id', senderWallet.id)
        .eq('balance', senderWallet.balance)

      if (e1) throw new Error('Error al procesar la transaccion')

      // Credit net amount to receiver (amount minus fee)
      const { error: e2 } = await supabase
        .from('wallets')
        .update({ balance: receiverWallet.balance + netAmount })
        .eq('id', receiverWallet.id)

      if (e2) {
        await supabase.from('wallets').update({ balance: senderWallet.balance }).eq('id', senderWallet.id)
        throw new Error('Error al acreditar al destinatario')
      }

      // Record transaction
      const { data: txData } = await supabase.from('transactions').insert({
        sender_id: senderId,
        receiver_id: receiver.id,
        sender_wallet_id: senderWallet.id,
        receiver_wallet_id: receiverWallet.id,
        amount,
        currency,
        type: 'transfer',
        status: 'completed',
        description: description || `Envio de ${currency}`,
        fee,
        sender_email: senderEmail,
        receiver_email: receiverEmail,
      }).select('id').single()

      // Record fee collected
      if (fee > 0 && txData) {
        await supabase.from('fees_collected').insert({
          transaction_id: txData.id,
          user_id: senderId,
          amount: fee,
          currency,
          fee_type: 'transfer',
        })
      }

      await get().fetchWallets(senderId)
      await get().fetchTransactions(senderId)
    } finally {
      set({ loading: false })
    }
  },

  convertCurrency: async (userId, fromCurrency, toCurrency, amount) => {
    set({ loading: true })
    try {
      const rate = get().getRate(fromCurrency, toCurrency)
      if (!rate) throw new Error('Conversion no disponible')

      const fee = Math.round(amount * COMMISSION_RATE * 100) / 100
      const netAmount = amount - fee
      const convertedAmount = netAmount * rate

      const { data: fromWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', fromCurrency)
        .single()

      const { data: toWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('currency', toCurrency)
        .single()

      if (!fromWallet || !toWallet) throw new Error('Wallets no encontradas')
      if (fromWallet.balance < amount) throw new Error('Saldo insuficiente')

      await supabase
        .from('wallets')
        .update({ balance: fromWallet.balance - amount })
        .eq('id', fromWallet.id)

      await supabase
        .from('wallets')
        .update({ balance: toWallet.balance + convertedAmount })
        .eq('id', toWallet.id)

      const { data: txData } = await supabase.from('transactions').insert({
        sender_id: userId,
        receiver_id: userId,
        sender_wallet_id: fromWallet.id,
        receiver_wallet_id: toWallet.id,
        amount,
        currency: fromCurrency,
        type: 'conversion',
        status: 'completed',
        description: `Conversion ${fromCurrency} a ${toCurrency}`,
        fee,
      }).select('id').single()

      // Record fee collected
      if (fee > 0 && txData) {
        await supabase.from('fees_collected').insert({
          transaction_id: txData.id,
          user_id: userId,
          amount: fee,
          currency: fromCurrency,
          fee_type: 'conversion',
        })
      }

      await get().fetchWallets(userId)
      await get().fetchTransactions(userId)
    } finally {
      set({ loading: false })
    }
  },
}))
