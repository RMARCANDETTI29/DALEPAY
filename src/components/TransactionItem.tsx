import { IoArrowUpCircle, IoArrowDownCircle, IoSwapHorizontal } from 'react-icons/io5'
import type { Transaction } from '../types'
import { CURRENCY_SYMBOLS } from '../types'

interface Props {
  tx: Transaction
  userId: string
}

export default function TransactionItem({ tx, userId }: Props) {
  const isSender = tx.sender_id === userId
  const isConversion = tx.type === 'conversion'

  const icon = isConversion
    ? <IoSwapHorizontal className="text-warning" size={28} />
    : isSender
      ? <IoArrowUpCircle className="text-danger" size={28} />
      : <IoArrowDownCircle className="text-success" size={28} />

  const label = isConversion
    ? tx.description || 'Conversion'
    : isSender
      ? `Enviado a ${tx.receiver_email || 'usuario'}`
      : `Recibido de ${tx.sender_email || 'usuario'}`

  const amountStr = `${isSender && !isConversion ? '-' : '+'}${CURRENCY_SYMBOLS[tx.currency]} ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  const amountColor = isSender && !isConversion ? 'text-danger' : 'text-success'

  const date = new Date(tx.created_at).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-lighter last:border-0">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">{label}</p>
        <p className="text-xs text-text-secondary">{date}</p>
      </div>
      <p className={`text-sm font-semibold ${amountColor}`}>{amountStr}</p>
    </div>
  )
}
