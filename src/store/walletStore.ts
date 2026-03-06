import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Wallet, Transaction, Currency } from '../types'
import { EXCHANGE_RATES, COMMISSION_RATE } from '../types'

interface WalletState {
  wallets: Wallet[]
  transactions: Transaction[]
  loading: boolean
  fetchWallets: (userId: string) => Promise<void>
  fetchTransactions: (userId: string) => Promise<void>
  sendMoney: (senderId: string, receiverEmail: string, amount: number, currency: Currency, description?: string) => Promise<void>
  convertCurrency: (userId: string, fromCurrency: Currency, toCurrency: Currency, amount: number) => Promise<void>
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  transactions: [],
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

  sendMoney: async (senderId, receiverEmail, amount, currency, description) => {
    set({ loading: true })
    try {
      // Find receiver
      const { data: receiver } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', receiverEmail)
        .single()

      if (!receiver) throw new Error('Usuario no encontrado')
      if (receiver.id === senderId) throw new Error('No puedes enviarte dinero a ti mismo')

      // Get sender wallet
      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', senderId)
        .eq('currency', currency)
        .single()

      if (!senderWallet) throw new Error('Wallet no encontrada')
      if (senderWallet.balance < amount) throw new Error('Saldo insuficiente')

      // Get receiver wallet
      const { data: receiverWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', receiver.id)
        .eq('currency', currency)
        .single()

      if (!receiverWallet) throw new Error('El destinatario no tiene wallet de ' + currency)

      // Atomic transaction: deduct from sender, add to receiver
      const { error: e1 } = await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance - amount })
        .eq('id', senderWallet.id)
        .eq('balance', senderWallet.balance) // optimistic lock

      if (e1) throw new Error('Error al procesar la transaccion')

      const { error: e2 } = await supabase
        .from('wallets')
        .update({ balance: receiverWallet.balance + amount })
        .eq('id', receiverWallet.id)

      if (e2) {
        // Rollback sender
        await supabase.from('wallets').update({ balance: senderWallet.balance }).eq('id', senderWallet.id)
        throw new Error('Error al acreditar al destinatario')
      }

      // Record transaction
      await supabase.from('transactions').insert({
        sender_id: senderId,
        receiver_id: receiver.id,
        sender_wallet_id: senderWallet.id,
        receiver_wallet_id: receiverWallet.id,
        amount,
        currency,
        type: 'transfer',
        status: 'completed',
        description: description || `Envio de ${currency}`,
        fee: 0,
        sender_email: senderWallet.user_id,
        receiver_email: receiverEmail,
      })

      await get().fetchWallets(senderId)
      await get().fetchTransactions(senderId)
    } finally {
      set({ loading: false })
    }
  },

  convertCurrency: async (userId, fromCurrency, toCurrency, amount) => {
    set({ loading: true })
    try {
      const rateKey = `${fromCurrency}_${toCurrency}`
      const rate = EXCHANGE_RATES[rateKey]
      if (!rate) throw new Error('Conversion no disponible')

      const fee = amount * COMMISSION_RATE
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

      await supabase.from('transactions').insert({
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
      })

      await get().fetchWallets(userId)
      await get().fetchTransactions(userId)
    } finally {
      set({ loading: false })
    }
  },
}))
