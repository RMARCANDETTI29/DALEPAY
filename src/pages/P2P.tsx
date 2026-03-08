import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'
import { supabase } from '../lib/supabase'
import { formatRate } from '../lib/binanceRate'
import type { P2POrder, P2PMessage } from '../types'
import { P2P_FEE_RATE, COMMISSION_WALLET } from '../types'

type Tab = 'market' | 'create' | 'my' | 'order'

export default function P2P() {
  const { user } = useAuthStore()
  const { binanceRate, fetchBinanceRate, wallets, fetchWallets } = useWalletStore()
  const [tab, setTab] = useState<Tab>('market')
  const [orders, setOrders] = useState<P2POrder[]>([])
  const [myOrders, setMyOrders] = useState<P2POrder[]>([])
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null)
  const [messages, setMessages] = useState<P2PMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Create order form
  const [orderType, setOrderType] = useState<'sell' | 'buy'>('sell')
  const [orderAmount, setOrderAmount] = useState('')
  const [orderRate, setOrderRate] = useState('')
  const [paymentPhone, setPaymentPhone] = useState('')
  const [paymentBank, setPaymentBank] = useState('')
  const [paymentCi, setPaymentCi] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const chatRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchBinanceRate()
    if (user) fetchWallets(user.id)
  }, [fetchBinanceRate, user, fetchWallets])

  useEffect(() => {
    if (binanceRate) setOrderRate(binanceRate.toFixed(2))
  }, [binanceRate])

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('p2p_orders')
      .select('*, seller_profile:profiles!p2p_orders_seller_id_fkey(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }, [])

  const fetchMyOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('p2p_orders')
      .select('*, seller_profile:profiles!p2p_orders_seller_id_fkey(*), buyer_profile:profiles!p2p_orders_buyer_id_fkey(*)')
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setMyOrders(data)
  }, [user])

  useEffect(() => {
    fetchOrders()
    fetchMyOrders()
  }, [fetchOrders, fetchMyOrders])

  const fetchMessages = useCallback(async (orderId: string) => {
    const { data } = await supabase
      .from('p2p_messages')
      .select('*, sender_profile:profiles!p2p_messages_sender_id_fkey(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }, [])

  useEffect(() => {
    if (activeOrder) {
      fetchMessages(activeOrder.id)
      // Poll messages every 5 seconds
      pollRef.current = setInterval(() => {
        fetchMessages(activeOrder.id)
        // Refresh order status
        supabase.from('p2p_orders').select('*').eq('id', activeOrder.id).single()
          .then(({ data }) => { if (data) setActiveOrder(data as P2POrder) })
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeOrder?.id, fetchMessages])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const rateDeviation = binanceRate && orderRate
    ? ((parseFloat(orderRate) - binanceRate) / binanceRate) * 100
    : 0

  const numAmount = parseFloat(orderAmount) || 0
  const numRate = parseFloat(orderRate) || 0
  const amountVes = numAmount * numRate
  const fee = Math.round(numAmount * P2P_FEE_RATE * 100) / 100

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreateError('')
    setCreateSuccess('')
    setLoading(true)

    try {
      if (numAmount <= 0) throw new Error('Monto invalido')
      if (numRate <= 0) throw new Error('Tasa invalida')

      if (orderType === 'sell') {
        const usdtWallet = wallets.find(w => w.currency === 'USDT')
        if (!usdtWallet || usdtWallet.balance < numAmount) {
          throw new Error('Saldo USDT insuficiente')
        }
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      const { error } = await supabase.from('p2p_orders').insert({
        seller_id: user.id,
        type: orderType,
        amount_usdt: numAmount,
        rate: numRate,
        amount_ves: Math.round(amountVes * 100) / 100,
        payment_method: 'pago_movil',
        payment_details: { phone: paymentPhone, bank: paymentBank, ci: paymentCi },
        status: 'open',
        fee,
        expires_at: expiresAt,
      })

      if (error) throw new Error(error.message)

      setCreateSuccess('Orden creada exitosamente')
      setOrderAmount('')
      fetchOrders()
      fetchMyOrders()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear orden')
    } finally {
      setLoading(false)
    }
  }

  const handleTakeOrder = async (order: P2POrder) => {
    if (!user) return
    setLoading(true)
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('p2p_orders')
        .update({
          buyer_id: user.id,
          status: 'taken',
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('status', 'open')

      if (error) throw new Error(error.message)

      // Send initial message
      await supabase.from('p2p_messages').insert({
        order_id: order.id,
        sender_id: user.id,
        message: `Orden tomada. Tienes 30 minutos para completar el pago.`,
      })

      const updatedOrder = { ...order, buyer_id: user.id, status: 'taken' as const, expires_at: expiresAt }
      setActiveOrder(updatedOrder)
      setTab('order')
      fetchOrders()
      fetchMyOrders()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al tomar orden')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!activeOrder || !user) return
    setLoading(true)
    try {
      await supabase
        .from('p2p_orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', activeOrder.id)

      await supabase.from('p2p_messages').insert({
        order_id: activeOrder.id,
        sender_id: user.id,
        message: 'Pago Movil enviado. Esperando confirmacion del vendedor.',
      })

      setActiveOrder({ ...activeOrder, status: 'paid' })
    } catch { /* */ } finally { setLoading(false) }
  }

  const handleReleaseUsdt = async () => {
    if (!activeOrder || !user) return
    setLoading(true)
    try {
      // Transfer USDT from seller to buyer
      const buyerId = activeOrder.buyer_id
      if (!buyerId) throw new Error('No hay comprador')

      const { data: sellerWallet } = await supabase
        .from('wallets').select('*').eq('user_id', activeOrder.seller_id).eq('currency', 'USDT').single()
      const { data: buyerWallet } = await supabase
        .from('wallets').select('*').eq('user_id', buyerId).eq('currency', 'USDT').single()

      if (!sellerWallet || !buyerWallet) throw new Error('Wallets no encontradas')

      const netAmount = activeOrder.amount_usdt - activeOrder.fee

      if (sellerWallet.balance < activeOrder.amount_usdt) throw new Error('Saldo insuficiente')

      await supabase.from('wallets').update({ balance: sellerWallet.balance - activeOrder.amount_usdt }).eq('id', sellerWallet.id)
      await supabase.from('wallets').update({ balance: buyerWallet.balance + netAmount }).eq('id', buyerWallet.id)

      // Record transaction
      const { data: txData } = await supabase.from('transactions').insert({
        sender_id: activeOrder.seller_id,
        receiver_id: buyerId,
        sender_wallet_id: sellerWallet.id,
        receiver_wallet_id: buyerWallet.id,
        amount: activeOrder.amount_usdt,
        currency: 'USDT',
        type: 'p2p',
        status: 'completed',
        description: `P2P: ${activeOrder.amount_usdt} USDT a ${activeOrder.rate} Bs`,
        fee: activeOrder.fee,
      }).select('id').single()

      if (activeOrder.fee > 0 && txData) {
        await supabase.from('fees_collected').insert({
          transaction_id: txData.id,
          user_id: activeOrder.seller_id,
          amount: activeOrder.fee,
          currency: 'USDT',
          fee_type: 'p2p',
          wallet_address: COMMISSION_WALLET,
        })
      }

      await supabase.from('p2p_orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', activeOrder.id)

      await supabase.from('p2p_messages').insert({
        order_id: activeOrder.id,
        sender_id: user.id,
        message: 'USDT liberados. Orden completada exitosamente.',
      })

      setActiveOrder({ ...activeOrder, status: 'completed' })
      if (user) fetchWallets(user.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrder || !user || !newMessage.trim()) return
    await supabase.from('p2p_messages').insert({
      order_id: activeOrder.id,
      sender_id: user.id,
      message: newMessage.trim(),
    })
    setNewMessage('')
    fetchMessages(activeOrder.id)
  }

  const openOrder = (order: P2POrder) => {
    setActiveOrder(order)
    setTab('order')
  }

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expirado'
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto w-full animate-fade-in">
      <h1 className="text-2xl font-extrabold mb-2">P2P Marketplace</h1>

      {/* Binance Rate Banner */}
      {binanceRate && (
        <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Tasa Binance P2P</p>
            <p className="text-lg font-extrabold text-success">1 USD = {formatRate(binanceRate)} Bs</p>
          </div>
          <span className="text-xs text-text-secondary">Referencia</span>
        </div>
      )}

      {/* Tabs */}
      {tab !== 'order' && (
        <div className="flex gap-2 mb-4">
          {([['market', 'Mercado'], ['create', 'Crear'], ['my', 'Mis ordenes']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'gradient-purple text-white' : 'glass text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Market Tab */}
      {tab === 'market' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-text-secondary text-sm">No hay ordenes disponibles</p>
              <button onClick={() => setTab('create')} className="text-primary-light text-sm font-semibold mt-2">
                Crea la primera orden
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      order.type === 'sell' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'
                    }`}>
                      {order.type === 'sell' ? 'Vende' : 'Compra'}
                    </span>
                    <span className="text-sm font-medium">
                      {(order as P2POrder & { seller_profile?: { full_name: string } }).seller_profile?.full_name || 'Usuario'}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">Pago Movil</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-extrabold">{Number(order.amount_usdt).toFixed(2)} USDT</p>
                    <p className="text-sm text-text-secondary">
                      {formatRate(Number(order.rate))} Bs/USD
                    </p>
                  </div>
                  <p className="text-lg font-bold text-success">
                    {Number(order.amount_ves).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                  </p>
                </div>
                {user && order.seller_id !== user.id && (
                  <button
                    onClick={() => handleTakeOrder(order)}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl gradient-green text-white font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    Tomar orden
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Order Tab */}
      {tab === 'create' && (
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setOrderType('sell')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${orderType === 'sell' ? 'gradient-green text-white' : 'glass text-text-secondary'}`}>
              Vender USDT
            </button>
            <button type="button" onClick={() => setOrderType('buy')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${orderType === 'buy' ? 'gradient-blue text-white' : 'glass text-text-secondary'}`}>
              Comprar USDT
            </button>
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-sm text-text-secondary mb-1 block font-medium">Cantidad USDT</label>
              <input type="number" step="0.01" min="1" placeholder="0.00" value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-text text-xl font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block font-medium">
                Tasa (Bs por USDT)
                {binanceRate && (
                  <span className="text-xs text-primary-light ml-1">(Binance: {formatRate(binanceRate)})</span>
                )}
              </label>
              <input type="number" step="0.01" min="1" placeholder="0.00" value={orderRate}
                onChange={(e) => setOrderRate(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl bg-white/5 text-text text-xl font-bold placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              {Math.abs(rateDeviation) > 5 && (
                <p className="text-xs text-warning mt-1">
                  Advertencia: Tu tasa esta {rateDeviation > 0 ? '+' : ''}{rateDeviation.toFixed(1)}% respecto a Binance (maximo ±5%)
                </p>
              )}
            </div>

            {numAmount > 0 && numRate > 0 && (
              <div className="bg-white/5 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Total VES</span>
                  <span className="font-bold text-success">{amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Comision (0.5%)</span>
                  <span>{fee.toFixed(2)} USDT</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">Datos Pago Movil</p>
            <input type="tel" placeholder="Telefono (04XX-XXXXXXX)" value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" placeholder="Banco" value={paymentBank}
              onChange={(e) => setPaymentBank(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" placeholder="Cedula" value={paymentCi}
              onChange={(e) => setPaymentCi(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {createError && <p className="text-danger text-sm text-center animate-fade-in">{createError}</p>}
          {createSuccess && <p className="text-success text-sm text-center animate-fade-in">{createSuccess}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-purple text-white font-semibold transition-all disabled:opacity-50 active:scale-[0.98]">
            {loading ? 'Creando...' : 'Crear orden'}
          </button>
        </form>
      )}

      {/* My Orders Tab */}
      {tab === 'my' && (
        <div className="space-y-3">
          {myOrders.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-text-secondary text-sm">No tienes ordenes</p>
            </div>
          ) : (
            myOrders.map((order) => {
              const statusColors: Record<string, string> = {
                open: 'bg-accent/15 text-accent',
                taken: 'bg-warning/15 text-warning',
                paid: 'bg-primary/15 text-primary-light',
                completed: 'bg-success/15 text-success',
                cancelled: 'bg-danger/15 text-danger',
                expired: 'bg-white/10 text-text-secondary',
                disputed: 'bg-danger/15 text-danger',
              }
              return (
                <button key={order.id} onClick={() => openOrder(order)} className="w-full text-left glass rounded-2xl p-4 hover:scale-[1.01] transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{Number(order.amount_usdt).toFixed(2)} USDT</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {formatRate(Number(order.rate))} Bs/USD — {new Date(order.created_at).toLocaleString('es-VE')}
                  </p>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Active Order / Chat */}
      {tab === 'order' && activeOrder && (
        <div className="space-y-4">
          <button onClick={() => { setTab('my'); setActiveOrder(null) }} className="text-sm text-primary-light font-medium">
            ← Volver
          </button>

          {/* Order Summary */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{Number(activeOrder.amount_usdt).toFixed(2)} USDT</span>
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                activeOrder.status === 'completed' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}>
                {activeOrder.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              Tasa: {formatRate(Number(activeOrder.rate))} Bs — Total: {Number(activeOrder.amount_ves).toLocaleString('es-VE')} Bs
            </p>
            {activeOrder.payment_details && (
              <div className="mt-2 bg-white/5 rounded-xl p-3 text-sm space-y-1">
                <p><span className="text-text-secondary">Tel:</span> {activeOrder.payment_details.phone}</p>
                <p><span className="text-text-secondary">Banco:</span> {activeOrder.payment_details.bank}</p>
                <p><span className="text-text-secondary">CI:</span> {activeOrder.payment_details.ci}</p>
              </div>
            )}
            {activeOrder.expires_at && ['taken', 'paid'].includes(activeOrder.status) && (
              <p className="text-xs text-warning mt-2">Tiempo restante: {getTimeRemaining(activeOrder.expires_at)}</p>
            )}
          </div>

          {/* Action Buttons */}
          {user && activeOrder.buyer_id === user.id && activeOrder.status === 'taken' && (
            <button onClick={handleConfirmPayment} disabled={loading}
              className="w-full py-3 rounded-xl gradient-green text-white font-semibold text-sm disabled:opacity-50">
              Confirmar Pago Movil enviado
            </button>
          )}
          {user && activeOrder.seller_id === user.id && activeOrder.status === 'paid' && (
            <button onClick={handleReleaseUsdt} disabled={loading}
              className="w-full py-3 rounded-xl gradient-purple text-white font-semibold text-sm disabled:opacity-50">
              Liberar USDT (confirmo que recibi el pago)
            </button>
          )}

          {/* Chat */}
          <div className="glass rounded-2xl overflow-hidden">
            <div ref={chatRef} className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMe ? 'bg-primary/20' : 'bg-white/10'}`}>
                      {!isMe && (
                        <p className="text-xs text-primary-light font-semibold mb-0.5">
                          {(msg as P2PMessage & { sender_profile?: { full_name: string } }).sender_profile?.full_name || 'Usuario'}
                        </p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-text-secondary mt-0.5 text-right">
                        {new Date(msg.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <p className="text-text-secondary text-sm text-center py-8">Sin mensajes aun</p>
              )}
            </div>

            {['taken', 'paid'].includes(activeOrder.status) && (
              <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-white/5">
                <input type="text" placeholder="Escribe un mensaje..." value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 text-text text-sm placeholder:text-text-secondary focus:outline-none" />
                <button type="submit" className="px-4 py-2 rounded-xl gradient-purple text-white text-sm font-semibold">
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
