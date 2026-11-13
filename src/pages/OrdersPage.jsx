import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Rows3, Search } from 'lucide-react'
import { ORDER_TYPES } from '../data/catalog'
import { usePos } from '../context/PosContext'
import { formatTime, pkr, prepLabel, sameDay, typeLabel } from '../utils/format'
import Badge from '../components/ui/Badge'
import OrderDrawer from '../components/orders/OrderDrawer'

const payments = ['all', 'paid', 'unpaid', 'partial', 'credit']
const preps = ['all', 'new', 'preparing', 'ready', 'dispatched']

export default function OrdersPage({ source = 'today' }) {
  const { orders, history } = usePos()
  const pool = source === 'history' ? history : orders
  const [mode, setMode] = useState('cards')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [payment, setPayment] = useState('all')
  const [prep, setPrep] = useState('all')
  const [date, setDate] = useState('')
  const [active, setActive] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((order) => {
      const text = `${order.id} ${order.customer} ${order.table} ${order.phone}`.toLowerCase()
      if (q && !text.includes(q)) return false
      if (type !== 'all' && order.type !== type) return false
      if (payment !== 'all' && order.paymentStatus !== payment) return false
      if (prep !== 'all' && order.prepStatus !== prep) return false
      if (date && !sameDay(order.createdAt, new Date(date))) return false
      return true
    })
  }, [pool, query, type, payment, prep, date])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">{source === 'history' ? 'Previous services' : 'Live service'}</p>
          <h1 className="font-display text-2xl leading-none">{source === 'history' ? 'Order history' : 'Today’s orders'}</h1>
        </div>
        <div className="flex rounded-full bg-surface p-1 shadow-card">
          <button type="button" onClick={() => setMode('cards')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${mode === 'cards' ? 'bg-ink text-white' : ''}`}><LayoutGrid size={15} /> Cards</button>
          <button type="button" onClick={() => setMode('table')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${mode === 'table' ? 'bg-ink text-white' : ''}`}><Rows3 size={15} /> Table</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, guest, or table" className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-3 text-sm font-semibold outline-none" />
        </div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold" />
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-full border border-line bg-surface px-3 text-sm font-semibold">
          <option value="all">All types</option>
          {ORDER_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
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
            <p className="text-sm text-muted">Change the filters or take a new order.</p>
          </div>
        )}
        {mode === 'cards' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence>
              {filtered.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={() => setActive(order)} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[28px] bg-surface">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  {['Order', 'Guest', 'Time', 'Type', 'Source', 'Amount', 'Payment', 'Prep', 'Table', 'Waiter', 'Rider'].map((head) => (
                    <th key={head} className="px-4 py-3 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} onClick={() => setActive(order)} className="cursor-pointer border-t border-line hover:bg-soft">
                    <td className="px-4 py-3 font-extrabold">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3">{formatTime(order.createdAt)}</td>
                    <td className="px-4 py-3">{typeLabel(order.type)}</td>
                    <td className="px-4 py-3">{order.source}</td>
                    <td className="px-4 py-3 font-bold">{pkr(order.amount)}</td>
                    <td className="px-4 py-3"><Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={order.prepStatus}>{prepLabel(order.prepStatus)}</Badge></td>
                    <td className="px-4 py-3">{order.table || '—'}</td>
                    <td className="px-4 py-3">{order.waiter || '—'}</td>
                    <td className="px-4 py-3">{order.rider || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AnimatePresence>
        {active && <OrderDrawer order={pool.find((item) => item.id === active.id) || active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  )
}

function OrderCard({ order, onOpen }) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className="rounded-2xl bg-surface px-3 py-2.5 text-left shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold leading-none">{order.id}</p>
          <p className="mt-1 truncate text-sm font-semibold">{order.customer}</p>
        </div>
        <p className="shrink-0 text-sm font-extrabold">{pkr(order.amount)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={order.prepStatus}>{prepLabel(order.prepStatus)}</Badge>
        <Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge>
        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold uppercase">{typeLabel(order.type)}</span>
      </div>
      <p className="mt-2 truncate text-[11px] text-muted">
        {formatTime(order.createdAt)} · {order.table || order.externalRef || 'Counter'} · {order.waiter || 'No waiter'}
      </p>
    </motion.button>
  )
}
