import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePos } from '../../context/PosContext'
import { formatTime, lineMeta, pkr, prepLabel, typeLabel } from '../../utils/format'
import Badge from '../ui/Badge'

const flow = ['new', 'preparing', 'ready', 'dispatched']

export default function OrderDrawer({ order, onClose }) {
  const { setPrepStatus, startCollect } = usePos()
  const navigate = useNavigate()
  const next = flow[Math.min(flow.indexOf(order.prepStatus) + 1, flow.length - 1)]

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
            <h2 className="font-display text-2xl">{order.id}</h2>
            <p className="font-semibold">{order.customer}</p>
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
              {item.instructions && <p className="text-xs italic text-orange-600">“{item.instructions}”</p>}
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">{item.station}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-line p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-2xl leading-none">{pkr(order.amount)}</span>
          </div>
          {order.balance > 0 && <p className="text-sm font-bold text-orange-500">Balance {pkr(order.balance)}</p>}
          <div className="flex gap-2">
            {order.prepStatus !== 'dispatched' && (
              <button type="button" onClick={() => setPrepStatus(order.id, next)} className="h-12 flex-1 rounded-2xl bg-ink font-bold text-white">
                Move to {prepLabel(next)}
              </button>
            )}
            {order.paymentStatus !== 'paid' && (
              <button
                type="button"
                onClick={() => {
                  startCollect(order.id)
                  onClose()
                  navigate('/')
                }}
                className="h-12 flex-1 rounded-2xl bg-orange-500 font-bold text-white"
              >
                Take payment
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
