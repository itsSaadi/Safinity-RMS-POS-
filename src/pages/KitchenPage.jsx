import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChefHat } from 'lucide-react'
import { usePos } from '../context/PosContext'
import { elapsedLabel, lineMeta, typeLabel } from '../utils/format'

const columns = [
  { id: 'new', title: 'New orders', action: 'Start', next: 'preparing', wash: 'bg-orange-100/80 dark:bg-orange-500/10', count: 'bg-orange-500 text-white' },
  { id: 'preparing', title: 'Preparing', action: 'Ready', next: 'ready', wash: 'bg-amber-100/80 dark:bg-amber-500/10', count: 'bg-amber-500 text-white' },
  { id: 'ready', title: 'Ready', action: 'Dispatch', next: 'dispatched', wash: 'bg-emerald-100/90 dark:bg-emerald-500/10', count: 'bg-emerald-600 text-white' },
  { id: 'dispatched', title: 'Dispatch', action: '', next: '', wash: 'bg-stone-200/70 dark:bg-white/5', count: 'bg-stone-700 text-white' },
]

const stations = ['All', 'Grill', 'Hot Kitchen', 'Fryer', 'Cold', 'Pastry', 'Bar']
const DELAY = 12 * 60 * 1000

function audioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioContext.ctx) audioContext.ctx = new Ctx()
  if (audioContext.ctx.state === 'suspended') audioContext.ctx.resume()
  return audioContext.ctx
}

function playLateAlarm() {
  const ctx = audioContext()
  if (!ctx) return
  const start = ctx.currentTime + 0.02
  for (let i = 0; i < 5; i += 1) {
    const at = start + i * 0.13
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(i % 2 === 0 ? 1240 : 980, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.1)
  }
}

function playReadyBell() {
  const ctx = audioContext()
  if (!ctx) return
  const start = ctx.currentTime + 0.02
  const strike = (at, freq, peak, decay) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + decay + 0.05)
  }
  strike(start, 784, 0.22, 0.55)
  strike(start, 1568, 0.07, 0.4)
  strike(start + 0.16, 988, 0.18, 0.7)
  strike(start + 0.16, 1976, 0.05, 0.45)
}

export default function KitchenPage() {
  const { orders, setPrepStatus, setItemReady } = usePos()
  const [station, setStation] = useState('All')
  const [now, setNow] = useState(Date.now())
  const [ringing, setRinging] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overColumn, setOverColumn] = useState(null)
  const seenReady = useRef(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const ids = orders.filter((order) => order.prepStatus === 'ready').map((order) => order.id)
    if (seenReady.current === null) {
      seenReady.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !seenReady.current.has(id))
    seenReady.current = new Set(ids)
    if (!fresh.length) return
    playReadyBell()
    setRinging(true)
    const timer = window.setTimeout(() => setRinging(false), 1400)
    return () => window.clearTimeout(timer)
  }, [orders])

  const lateKey = orders
    .filter((order) => (order.prepStatus === 'new' || order.prepStatus === 'preparing') && now - order.createdAt > DELAY)
    .map((order) => order.id)
    .join('|')

  useEffect(() => {
    if (!lateKey) return undefined
    playLateAlarm()
    const id = window.setInterval(playLateAlarm, 5000)
    return () => window.clearInterval(id)
  }, [lateKey])

  const board = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      tickets: orders.filter((order) => {
        if (order.prepStatus !== column.id) return false
        if (station === 'All') return true
        return order.items.some((item) => item.station === station)
      }),
    }))
  }, [orders, station])

  const advance = (orderId, next) => {
    audioContext()
    setPrepStatus(orderId, next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-3 py-3 md:px-4" onPointerDown={() => audioContext()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Kitchen display</p>
          <h1 className="font-display text-2xl leading-none">The pass</h1>
          <p className="mt-1 text-[11px] font-bold text-stone-500">Drag a ticket into another column</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold ${lateKey ? 'animate-pulse bg-red-600 text-white' : 'bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-stone-300'}`}>
            Late alarm
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold ${ringing ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'}`}>
            <Bell size={14} className={ringing ? 'animate-bounce' : ''} />
            Bell on ready
          </span>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {stations.map((name) => (
              <button key={name} type="button" onClick={() => setStation(name)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${station === name ? 'bg-orange-500 text-white' : 'bg-white text-ink shadow-card dark:bg-white/10 dark:text-white'}`}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-20 md:grid-cols-2 xl:grid-cols-4 xl:overflow-hidden">
        {board.map((column) => (
          <section
            key={column.id}
            onDragOver={(event) => {
              event.preventDefault()
              setOverColumn(column.id)
            }}
            onDragLeave={() => setOverColumn((current) => (current === column.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData('text/plain') || dragId
              setOverColumn(null)
              setDragId(null)
              if (id) setPrepStatus(id, column.id)
            }}
            className={`flex min-h-[220px] flex-col rounded-2xl p-2 xl:min-h-0 ${column.wash} ${overColumn === column.id ? 'ring-2 ring-orange-500' : column.id === 'ready' && ringing ? 'ring-2 ring-emerald-500' : ''}`}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.14em]">
                {column.id === 'ready' && <Bell size={15} className={ringing ? 'animate-bounce text-emerald-700' : 'text-emerald-700'} />}
                {column.title}
              </h2>
              <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-extrabold ${column.count}`}>{column.tickets.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              <AnimatePresence>
                {column.tickets.map((order) => (
                  <Ticket
                    key={order.id}
                    order={order}
                    now={now}
                    station={station}
                    action={column.action}
                    dragging={dragId === order.id}
                    onAdvance={column.next ? () => advance(order.id, column.next) : null}
                    onItem={(itemId, ready) => {
                      audioContext()
                      setItemReady(order.id, itemId, ready)
                    }}
                    onDragStart={() => setDragId(order.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setOverColumn(null)
                    }}
                  />
                ))}
              </AnimatePresence>
              {column.tickets.length === 0 && (
                <p className="px-2 py-8 text-center text-xs font-bold uppercase tracking-wide text-stone-500">Clear</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Ticket({ order, now, station, action, onAdvance, onItem, dragging, onDragStart, onDragEnd }) {
  const late = (order.prepStatus === 'new' || order.prepStatus === 'preparing') && now - order.createdAt > DELAY
  const items = station === 'All' ? order.items : order.items.filter((item) => item.station === station)
  const buttonTone = action === 'Ready' ? 'bg-emerald-600' : action === 'Start' ? 'bg-orange-500' : 'bg-[#111827]'
  return (
    <motion.article
      layout
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', order.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dragging ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`cursor-grab rounded-xl border bg-white px-2.5 py-2 text-[#1c1917] shadow-card active:cursor-grabbing dark:bg-[#241c16] dark:text-[#f6efe6] ${late ? 'border-red-400' : order.prepStatus === 'ready' ? 'border-emerald-300' : 'border-white/80 dark:border-white/10'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-extrabold leading-none">{order.id}</p>
        <p className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${late ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-800 dark:bg-white/10'}`}>
          {elapsedLabel(order.createdAt, now)}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-orange-700 dark:text-orange-200">{typeLabel(order.type)}</span>
        {order.table && <span className="text-[10px] font-bold uppercase text-stone-500">{order.table}</span>}
        {late && <span className="text-[10px] font-extrabold uppercase text-red-600">Late</span>}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={() => onItem(item.id, !item.ready)}
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] font-bold ${item.ready ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white dark:border-white/20 dark:bg-transparent'}`}
              aria-label={`${item.ready ? 'Undo' : 'Mark'} ${item.name}`}
            >
              {item.ready ? '✓' : ''}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold leading-4 ${item.ready ? 'text-stone-400 line-through' : ''}`}>{item.qty} × {item.name}</p>
              {lineMeta(item) && <p className="text-[10px] leading-4 text-stone-500">{lineMeta(item)}</p>}
              {item.instructions && <p className="text-[10px] font-bold leading-4 text-orange-800 dark:text-orange-200">Note: {item.instructions}</p>}
              {item.station && <p className="text-[9px] font-bold uppercase leading-4 tracking-wide text-stone-400">{item.station}</p>}
            </div>
          </li>
        ))}
      </ul>
      {onAdvance && (
        <button type="button" onClick={onAdvance} className={`mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-extrabold text-white ${buttonTone}`}>
          {action === 'Ready' ? <Bell size={13} /> : action === 'Start' ? <ChefHat size={13} /> : null}
          {action}
        </button>
      )}
    </motion.article>
  )
}
