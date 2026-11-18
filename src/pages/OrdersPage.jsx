import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Pencil, Rows3, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { channelFromOrderCode } from '../api'
import { usePos } from '../context/PosContext'
import { formatTime, itemsLabel, orderLabel, pkr, prepLabel, sameDay, typeLabel } from '../utils/format'
import Badge from '../components/ui/Badge'
import OrderDrawer from '../components/orders/OrderDrawer'

const payments = ['all', 'paid', 'unpaid', 'partial']
const preps = ['all', 'new', 'preparing', 'ready', 'dispatched', 'cancelled']
const flow = ['new', 'preparing', 'ready', 'dispatched']

export default function OrdersPage({ source = 'today' }) {
  const { orders, history, orderTypes, loadOrders, ordersLoading, branchId, setPrepStatus, startCollect, startEditOrder, canEditOrder } = usePos()
  const navigate = useNavigate()
  const readOnly = source === 'history'
  const pool = readOnly ? history : orders
  const [mode, setMode] = useState('cards')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [payment, setPayment] = useState('all')
  const [prep, setPrep] = useState('all')
  const [date, setDate] = useState('')
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (branchId) loadOrders().catch(() => {})
  }, [branchId, source])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((order) => {
      const itemText = (order.items || []).map((item) => item.name).join(' ')
      const text = `${orderLabel(order)} ${order.customer} ${order.table} ${order.phone} ${itemText}`.toLowerCase()
      if (q && !text.includes(q)) return false
      if (type !== 'all' && order.type !== type && channelFromOrderCode(order.type) !== channelFromOrderCode(type)) return false
      if (payment !== 'all' && order.paymentStatus !== payment) return false
      if (prep !== 'all' && order.prepStatus !== prep) return false
      if (date && !sameDay(order.createdAt, new Date(date))) return false
      return true
    })
  }, [pool, query, type, payment, prep, date])

  const advance = (order) => {
    if (readOnly) return
    const next = flow[Math.min(flow.indexOf(order.prepStatus) + 1, flow.length - 1)]
    if (next && next !== order.prepStatus) setPrepStatus(order.id, next)
  }

  const pay = (order) => {
    if (readOnly) return
    startCollect(order.id)
    navigate('/')
  }

  const edit = (order) => {
    if (readOnly) return
    if (!canEditOrder(order)) {
      return
    }
    if (startEditOrder(order)) navigate('/')
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">{readOnly ? 'Browse only' : 'Live service'}</p>
          <h1 className="font-display text-2xl leading-none">{readOnly ? 'Order history' : 'Today’s orders'}</h1>
          {ordersLoading && <p className="mt-1 text-xs font-bold text-muted">Syncing…</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => loadOrders().catch(() => {})} className="h-10 rounded-full bg-surface px-4 text-sm font-bold shadow-card">
            Refresh
          </button>
          <div className="flex rounded-full bg-surface p-1 shadow-card">
            <button type="button" onClick={() => setMode('cards')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${mode === 'cards' ? 'bg-ink text-white' : ''}`}><LayoutGrid size={15} /> Cards</button>
            <button type="button" onClick={() => setMode('table')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${mode === 'table' ? 'bg-ink text-white' : ''}`}><Rows3 size={15} /> Table</button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticket, guest, table, or item" className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-3 text-sm font-semibold outline-none" />
        </div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold" />
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold">
          <option value="all">All types</option>
          {orderTypes.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select value={payment} onChange={(event) => setPayment(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold">
          {payments.map((item) => <option key={item} value={item}>{item === 'all' ? 'All payments' : item}</option>)}
        </select>
        <select value={prep} onChange={(event) => setPrep(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold">
          {preps.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : prepLabel(item)}</option>)}
        </select>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-20">
        {filtered.length === 0 && (
          <div className="rounded-[28px] bg-surface px-6 py-16 text-center">
            <p className="font-display text-3xl">No tickets here</p>
            <p className="text-sm text-muted">{readOnly ? 'Try different filters.' : 'Change the filters or take a new order.'}</p>
          </div>
        )}
        {mode === 'cards' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  readOnly={readOnly}
                  canEdit={!readOnly && canEditOrder(order)}
                  onOpen={() => setActive(order)}
                  onAdvance={() => advance(order)}
                  onPay={() => pay(order)}
                  onEdit={() => edit(order)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[28px] bg-surface">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  {(readOnly
                    ? ['Ticket', 'Items', 'Guest', 'Time', 'Type', 'Amount', 'Payment', 'Prep']
                    : ['Ticket', 'Items', 'Guest', 'Time', 'Type', 'Amount', 'Payment', 'Prep', 'Actions']
                  ).map((head) => (
                    <th key={head} className="px-4 py-3 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const next = flow[Math.min(flow.indexOf(order.prepStatus) + 1, flow.length - 1)]
                  const canAdvance = !readOnly && order.prepStatus !== 'dispatched' && order.prepStatus !== 'cancelled' && next !== order.prepStatus
                  const canPay = !readOnly && order.paymentStatus !== 'paid' && order.prepStatus !== 'cancelled'
                  const showEdit = !readOnly && canEditOrder(order)
                  return (
                    <tr key={order.id} className="border-t border-line hover:bg-soft">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setActive(order)} className="text-left font-extrabold hover:text-orange-500">
                          {orderLabel(order)}
                        </button>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-muted">{itemsLabel(order)}</td>
                      <td className="px-4 py-3">{order.customer || 'Walk-in'}</td>
                      <td className="px-4 py-3">{formatTime(order.createdAt)}</td>
                      <td className="px-4 py-3">{typeLabel(order.type)}</td>
                      <td className="px-4 py-3 font-bold">{pkr(order.amount)}</td>
                      <td className="px-4 py-3"><Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={order.prepStatus}>{prepLabel(order.prepStatus)}</Badge></td>
                      {!readOnly && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {showEdit && (
                              <button type="button" onClick={() => edit(order)} className="inline-flex h-9 items-center gap-1 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                                <Pencil size={12} /> Edit
                              </button>
                            )}
                            {canAdvance && (
                              <button type="button" onClick={() => advance(order)} className="h-9 rounded-full bg-ink px-3 text-xs font-bold text-white">
                                {prepLabel(next)}
                              </button>
                            )}
                            {canPay && (
                              <button type="button" onClick={() => pay(order)} className="h-9 rounded-full bg-orange-500 px-3 text-xs font-bold text-white">
                                Pay
                              </button>
                            )}
                            <button type="button" onClick={() => setActive(order)} className="h-9 rounded-full bg-soft px-3 text-xs font-bold">
                              Details
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {active && (
          <OrderDrawer
            order={pool.find((item) => item.id === active.id) || active}
            readOnly={readOnly}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function OrderCard({ order, onOpen, onAdvance, onPay, onEdit, readOnly, canEdit }) {
  const next = flow[Math.min(flow.indexOf(order.prepStatus) + 1, flow.length - 1)]
  const canAdvance = !readOnly && order.prepStatus !== 'dispatched' && order.prepStatus !== 'cancelled' && next !== order.prepStatus
  const canPay = !readOnly && order.paymentStatus !== 'paid' && order.prepStatus !== 'cancelled'
  const items = order.items || []

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-2xl bg-surface p-3 text-left shadow-card"
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold leading-none">{orderLabel(order)}</p>
            <p className="mt-1 truncate text-sm font-semibold">{order.customer || 'Walk-in'}</p>
          </div>
          <p className="shrink-0 text-sm font-extrabold">{pkr(order.amount)}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge tone={order.prepStatus}>{prepLabel(order.prepStatus)}</Badge>
          <Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge>
          <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold uppercase">{typeLabel(order.type)}</span>
        </div>
        <ul className="mt-2 space-y-1">
          {items.slice(0, 4).map((item) => (
            <li key={item.id} className="truncate text-xs font-semibold text-ink">
              {item.qty} × {item.name}
              {lineMetaShort(item) ? <span className="font-medium text-muted"> · {lineMetaShort(item)}</span> : null}
            </li>
          ))}
          {items.length > 4 && (
            <li className="text-[11px] font-bold text-muted">+{items.length - 4} more</li>
          )}
          {!items.length && <li className="text-xs text-muted">No items</li>}
        </ul>
        <p className="mt-2 truncate text-[11px] text-muted">
          {formatTime(order.createdAt)} · {order.table || order.externalRef || 'Counter'}
          {order.balance > 0 ? ` · due ${pkr(order.balance)}` : ''}
        </p>
      </button>
      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canEdit && (
            <button type="button" onClick={onEdit} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-xs font-extrabold text-white">
              <Pencil size={14} /> Edit
            </button>
          )}
          {canAdvance && (
            <button type="button" onClick={onAdvance} className="h-10 flex-1 rounded-xl bg-ink text-xs font-extrabold text-white">
              {prepLabel(next)}
            </button>
          )}
          {canPay && (
            <button type="button" onClick={onPay} className="h-10 flex-1 rounded-xl bg-orange-500 text-xs font-extrabold text-white">
              Take payment
            </button>
          )}
          {!canEdit && !canAdvance && !canPay && (
            <button type="button" onClick={onOpen} className="h-10 flex-1 rounded-xl bg-soft text-xs font-extrabold">
              Details
            </button>
          )}
        </div>
      )}
    </motion.article>
  )
}

function lineMetaShort(item) {
  return [item.variation, ...(item.choices || [])].filter(Boolean).join(', ')
}
