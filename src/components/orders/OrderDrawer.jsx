import { motion } from 'framer-motion'
import { Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePos } from '../../context/PosContext'
import { formatTime, lineMeta, orderLabel, pkr, prepLabel, typeLabel } from '../../utils/format'
import Badge from '../ui/Badge'
import DealLines from '../ui/DealLines'
import PrintInvoiceMenu from './PrintInvoiceMenu'

const flow = ['new', 'preparing', 'ready', 'dispatched']

export default function OrderDrawer({ order, onClose, readOnly = false }) {
  const { setPrepStatus, startCollect, cancelOrder, can, startEditOrder, canEditOrder, productById } = usePos()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const next = flow[Math.min(flow.indexOf(order.prepStatus) + 1, flow.length - 1)]
  const canCancel = !readOnly && can('order:cancel') && order.apiStatus !== 'CANCELLED' && order.prepStatus !== 'cancelled'
  const showEdit = !readOnly && canEditOrder(order)

  const onCancel = async () => {
    if (busy) return
    const reason = window.prompt('Cancel reason (optional)')
    if (reason === null) return
    setBusy(true)
    try {
      await cancelOrder(order.id, reason)
      onClose()
    } catch {
      // toast handled in context
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close details" onClick={onClose} />
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        className="absolute inset-y-0 right-0 flex w-[min(100%,440px)] flex-col bg-surface shadow-dock"
      >
        <div className="flex items-start justify-between p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{typeLabel(order.type)} · {order.source}</p>
            <h2 className="font-display text-2xl">{orderLabel(order)}</h2>
            <p className="font-semibold">{order.customer || 'Walk-in'}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-soft"><X /></button>
        </div>
        <div className="flex gap-2 px-5">
          <Badge tone={order.prepStatus}>{prepLabel(order.prepStatus)}</Badge>
          <Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 px-5 text-sm">
          <Meta label="Time" value={formatTime(order.createdAt)} />
          <Meta label="Table" value={order.table || '—'} />
          <Meta label="Waiter" value={order.waiter || '—'} />
          <Meta label="Rider" value={order.rider || '—'} />
          {order.address && <Meta label="Address" value={order.address} />}
          {order.externalRef && <Meta label="Platform ref" value={order.externalRef} />}
        </div>
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto px-5">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-soft px-3 py-3">
              <div className="flex justify-between font-bold">
                <span>{item.qty} × {item.name}</span>
                <span>{pkr(item.unitPrice * item.qty)}</span>
              </div>
              {lineMeta(item) && <p className="text-xs text-muted">{lineMeta(item)}</p>}
              <DealLines source={productById(item.productId) || item} className="mt-1 space-y-0.5 text-xs text-muted" />
              {item.instructions && <p className="text-xs italic text-orange-600">“{item.instructions}”</p>}
              {item.station && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">{item.station}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-line p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-2xl leading-none">{pkr(order.amount)}</span>
          </div>
          {order.balance > 0 && <p className="text-sm font-bold text-orange-500">Balance {pkr(order.balance)}</p>}
          <div className="grid grid-cols-2 gap-2">
            <PrintInvoiceMenu
              order={order}
              label="Print"
              className="w-full"
              buttonClassName="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-soft text-sm font-bold"
            />
            {!readOnly && showEdit && (
              <button
                type="button"
                onClick={() => {
                  if (startEditOrder(order)) {
                    onClose()
                    navigate('/')
                  }
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#fff4d6] px-3 text-sm font-bold text-[#b45309]"
              >
                <Pencil size={16} className="shrink-0" />
                Edit order
              </button>
            )}
            {!readOnly && order.prepStatus !== 'dispatched' && order.prepStatus !== 'cancelled' && (
              <button
                type="button"
                onClick={() => setPrepStatus(order.id, next)}
                className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-[#e0f2fe] px-3 text-sm font-bold text-[#0369a1]"
              >
                Move to {prepLabel(next)}
              </button>
            )}
            {!readOnly && order.paymentStatus !== 'paid' && order.prepStatus !== 'cancelled' && (
              <button
                type="button"
                onClick={() => {
                  startCollect(order.id)
                  onClose()
                  navigate('/')
                }}
                className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-[#16a34a] px-3 text-sm font-bold text-white"
              >
                Take payment
              </button>
            )}
            {!readOnly && canCancel && (
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="col-span-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-red-500/10 text-sm font-bold text-red-600 disabled:opacity-60"
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div className="rounded-2xl bg-soft px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
