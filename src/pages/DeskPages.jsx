import { useMemo, useState } from 'react'
import { usePos } from '../context/PosContext'
import { pkr } from '../utils/format'
import DeskHeader from '../components/layout/DeskHeader'

export function StatsPage() {
  const { orders, orderTypes } = usePos()
  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === 'paid' || order.paymentStatus === 'partial')
    const revenue = paid.reduce((sum, order) => sum + (order.paymentStatus === 'partial' ? order.received : order.amount), 0)
    const avg = orders.length ? Math.round(orders.reduce((sum, order) => sum + order.amount, 0) / orders.length) : 0
    const types = orderTypes.map((item) => ({
      type: item.code,
      label: item.label,
      count: orders.filter((order) => order.type === item.code || order.type === item.channel).length,
    }))
    const max = Math.max(1, ...types.map((item) => item.count))
    const dishes = {}
    orders.forEach((order) => {
      order.items.forEach((item) => {
        dishes[item.name] = (dishes[item.name] || 0) + item.qty
      })
    })
    const top = Object.entries(dishes).sort((a, b) => b[1] - a[1]).slice(0, 5)
    return { revenue, avg, types, max, top, open: orders.filter((order) => order.prepStatus !== 'dispatched').length }
  }, [orders, orderTypes])

  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <DeskHeader kicker="More" title="Tonight" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Tile label="Collected" value={pkr(stats.revenue)} />
        <Tile label="Tickets" value={String(orders.length)} />
        <Tile label="Still on the pass" value={String(stats.open)} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-[28px] bg-surface p-5 shadow-card">
          <h2 className="font-extrabold">Order mix</h2>
          <div className="mt-4 space-y-3">
            {stats.types.map((item) => (
              <div key={item.type}>
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{item.label || item.type}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-soft">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(item.count / stats.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Average ticket {pkr(stats.avg)}</p>
        </section>
        <section className="rounded-[28px] bg-surface p-5 shadow-card">
          <h2 className="font-extrabold">Most plated</h2>
          <ol className="mt-4 space-y-3">
            {stats.top.map(([name, qty], index) => (
              <li key={name} className="flex items-center justify-between">
                <span className="font-semibold"><span className="mr-3 text-muted">{index + 1}</span>{name}</span>
                <span className="font-extrabold">{qty}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value }) {
  return (
    <article className="rounded-[28px] bg-nav p-5 text-white">
      <p className="text-xs uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </article>
  )
}

export function ExpensesPage() {
  const { expenses, addExpense } = usePos()
  const [category, setCategory] = useState('Petty cash')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <DeskHeader kicker="More" title="Expenses" />
      <form
        className="mt-5 grid gap-2 rounded-[28px] bg-surface p-4 shadow-card md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault()
          const value = Number(amount)
          if (!value || value < 0) return
          addExpense({ category, note: note || category, amount: value, method })
          setNote('')
          setAmount('')
        }}
      >
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-2xl border border-line bg-bg px-3 text-sm font-semibold">
          {['Petty cash', 'Ice', 'Utilities', 'Staff meal', 'Repair'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" className="h-12 rounded-2xl border border-line bg-bg px-3 text-sm font-semibold md:col-span-2" />
        <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="1" placeholder="Amount" className="h-12 rounded-2xl border border-line bg-bg px-3 text-sm font-semibold" required />
        <button className="h-12 rounded-2xl bg-orange-500 font-extrabold text-white">Add {method}</button>
        <div className="md:col-span-5 flex gap-2">
          {['cash', 'card'].map((item) => (
            <button key={item} type="button" onClick={() => setMethod(item)} className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${method === item ? 'bg-ink text-white' : 'bg-soft'}`}>{item}</button>
          ))}
          <span className="ml-auto text-sm font-bold">Shift expenses {pkr(total)}</span>
        </div>
      </form>
      <div className="mt-4 space-y-2">
        {expenses.map((expense) => (
          <article key={expense.id} className="flex items-center justify-between rounded-3xl bg-surface px-4 py-3">
            <div>
              <p className="font-extrabold">{expense.category}</p>
              <p className="text-sm text-muted">{expense.note} · {expense.method}</p>
            </div>
            <p className="font-extrabold">{pkr(expense.amount)}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

const notes = [5000, 1000, 500, 100, 50, 20, 10]

export function CashPage() {
  const { orders, expenses, openingFloat, closing, setClosing, toast } = usePos()
  const [counts, setCounts] = useState(() => Object.fromEntries(notes.map((note) => [note, ''])))
  const cashSales = orders.reduce((sum, order) => sum + (order.cashAmount || 0), 0)
  const cashExpenses = expenses.filter((item) => item.method === 'cash').reduce((sum, item) => sum + item.amount, 0)
  const expected = openingFloat + cashSales - cashExpenses
  const counted = notes.reduce((sum, note) => sum + note * (Number(counts[note]) || 0), 0)
  const variance = counted - expected

  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <DeskHeader kicker="More" title="Cash closing" />
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[28px] bg-surface p-5 shadow-card">
          <h2 className="font-extrabold">Count</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {notes.map((note) => (
              <label key={note} className="text-xs font-bold text-muted">
                Rs {note.toLocaleString('en-PK')}
                <input
                  inputMode="numeric"
                  value={counts[note]}
                  onChange={(event) => setCounts((current) => ({ ...current, [note]: event.target.value }))}
                  className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-3 text-base font-extrabold text-ink"
                  placeholder="0"
                />
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-[28px] bg-nav p-5 text-white">
          <Line label="Opening float" value={pkr(openingFloat)} />
          <Line label="Cash sales" value={pkr(cashSales)} />
          <Line label="Cash expenses" value={pkr(cashExpenses)} />
          <Line label="Expected" value={pkr(expected)} />
          <Line label="Counted" value={pkr(counted)} />
          <p className={`mt-3 font-display text-2xl ${variance === 0 ? 'text-emerald-300' : 'text-orange-300'}`}>
            {variance === 0 ? 'Balanced' : `${variance > 0 ? 'Over' : 'Short'} ${pkr(Math.abs(variance))}`}
          </p>
          <button
            type="button"
            onClick={() => {
              setClosing({ expected, counted, variance, at: Date.now() })
              toast('Drawer closing saved for this shift')
            }}
            className="mt-4 h-12 w-full rounded-2xl bg-orange-500 font-extrabold"
          >
            {closing ? 'Update closing' : 'Post closing'}
          </button>
        </section>
      </div>
    </div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-2 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}
