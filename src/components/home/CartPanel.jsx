import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bike, Minus, Pencil, Plus, ShoppingBag, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { usePos, summarize } from '../../context/PosContext'
import { lineMeta, pkr } from '../../utils/format'
import FoodImage from '../ui/FoodImage'

const icons = {
  'dine-in': UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Bike,
  foodpanda: ShoppingBag,
  bite: Bike,
}

export default function CartPanel({ onEdit, onCheckout, onClose, mobile }) {
  const { cart, updateCart, setOrderType, setQty, removeLine, clearCart, riders, tables, waiters, zones, orderTypes, orderChannel, toast, paymentTypes, taxInclusive, editingOrder, saveEditedOrder, cancelEditOrder } = usePos()
  const serviceTypes = orderTypes
  const selectedPayment = paymentTypes.find((item) => item.id === cart.paymentTypeId)
  const totals = summarize(cart, selectedPayment?.tax, taxInclusive)
  const [confirmClear, setConfirmClear] = useState(false)
  const editing = Boolean(editingOrder?.id)

  const missing = useMemo(() => {
    if (!cart.lines.length) return 'Add a dish to start the order'
    if (orderChannel === 'dine-in' && !cart.tableId) return 'Choose a table'
    if (['delivery', 'foodpanda', 'bite'].includes(orderChannel) && !String(cart.address || '').trim()) return 'Add a delivery address'
    if ((orderChannel === 'foodpanda' || orderChannel === 'bite') && !String(cart.externalRef || '').trim()) return 'Add the platform order number'
    return ''
  }, [cart, orderChannel])

  return (
    <section className={`flex h-full min-h-0 flex-col bg-surface ${mobile ? '' : 'border-l border-line'}`}>
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
            {editing ? `Editing ${editingOrder.orderNumber}` : 'This order'}
          </p>
          <h2 className="font-display text-xl leading-none">{totals.count} items</h2>
        </div>
        <div className="flex items-center gap-2">
          {cart.lines.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true)
                  return
                }
                clearCart()
                setConfirmClear(false)
              }}
              className="text-xs font-bold text-muted"
            >
              {confirmClear ? 'Confirm clear' : 'Clear'}
            </button>
          )}
          {mobile && (
            <button type="button" aria-label="Close cart" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-soft">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-1.5 px-3 ${serviceTypes.length > 3 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3'}`}>
        {serviceTypes.map((type) => {
          const Icon = icons[type.channel]
          const selected = cart.orderType === type.code
          return (
            <button
              key={type.code}
              type="button"
              onClick={() => setOrderType(type)}
              className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border text-[10px] font-bold ${selected ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-300' : 'border-line text-muted'}`}
            >
              {Icon ? <Icon size={16} /> : <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[9px] text-white">{type.label.slice(0, 1)}</span>}
              {type.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <AnimatePresence initial={false}>
          {orderChannel === 'dine-in' && (
            <motion.div key="dine" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <ChipRow label="Table" options={tables} value={cart.tableId} onChange={(tableId) => updateCart({ tableId })} />
              <ChipRow label="Waiter" options={waiters} value={cart.waiterId} onChange={(waiterId) => updateCart({ waiterId })} />
              <Field label="Guest name" value={cart.customer} onChange={(customer) => updateCart({ customer })} placeholder="Optional" />
            </motion.div>
          )}
          {orderChannel === 'takeaway' && (
            <motion.div key="take" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <Field label="Guest name" value={cart.customer} onChange={(customer) => updateCart({ customer })} placeholder="Name on the bag" />
              <Field label="Phone" value={cart.phone} onChange={(phone) => updateCart({ phone })} placeholder="03xx" />
            </motion.div>
          )}
          {orderChannel === 'delivery' && (
            <motion.div key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <Field label="Guest name" value={cart.customer} onChange={(customer) => updateCart({ customer })} placeholder="Required" />
              <Field label="Phone" value={cart.phone} onChange={(phone) => updateCart({ phone })} placeholder="Required" />
              <Field label="Address" value={cart.address} onChange={(address) => updateCart({ address })} placeholder="House, street, area" />
              <ChipRow label="Zone" options={zones} value={cart.zoneId} onChange={(zoneId) => updateCart({ zoneId })} />
              <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Rider
                <select
                  value={cart.riderId}
                  onChange={(event) => {
                    const rider = riders.find((row) => row.id === event.target.value)
                    updateCart({ riderId: rider?.id || '', rider: rider?.name || '' })
                  }}
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold text-ink"
                >
                  <option value="">Select rider</option>
                  {riders.map((rider) => (
                    <option key={rider.id} value={rider.id}>{rider.name}</option>
                  ))}
                </select>
              </label>
            </motion.div>
          )}
          {(orderChannel === 'foodpanda' || orderChannel === 'bite') && (
            <motion.div key="platform" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <Field label="Platform order no." value={cart.externalRef} onChange={(externalRef) => updateCart({ externalRef })} placeholder={orderChannel === 'bite' ? 'BT-00000' : 'FP-00000'} />
              <Field label="Guest name" value={cart.customer} onChange={(customer) => updateCart({ customer })} placeholder="From the ticket" />
            </motion.div>
          )}
        </AnimatePresence>

        {cart.lines.length === 0 && (
          <div className="rounded-[28px] bg-soft px-4 py-10 text-center">
            <p className="font-display text-2xl">The pass is clear</p>
            <p className="mt-1 text-sm text-muted">Tap a dish to build this ticket.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {cart.lines.map((line) => (
            <motion.article key={line.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 rounded-3xl border border-line p-2.5">
              <FoodImage src={line.image} alt={line.name} className="h-16 w-16 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-extrabold">{line.name}</p>
                  <p className="shrink-0 text-sm font-extrabold">{pkr(line.unitPrice * line.qty)}</p>
                </div>
                {lineMeta(line) && <p className="truncate text-xs text-muted">{lineMeta(line)}</p>}
                {line.instructions && <p className="truncate text-xs italic text-orange-600">“{line.instructions}”</p>}
                <div className="mt-2 flex items-center gap-1.5">
                  <Stepper value={line.qty} onChange={(qty) => setQty(line.id, qty)} />
                  <button type="button" aria-label="Edit item" onClick={() => onEdit(line)} className="grid h-9 w-9 place-items-center rounded-full bg-soft"><Pencil size={14} /></button>
                  <button type="button" aria-label="Remove item" onClick={() => removeLine(line.id)} className="grid h-9 w-9 place-items-center rounded-full bg-soft text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>

        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          Discount
          <input
            type="number"
            min="0"
            value={cart.discount}
            onChange={(event) => updateCart({ discount: Number(event.target.value) })}
            className="mt-1 h-11 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold text-ink"
          />
        </label>
      </div>

      <div className="m-3 rounded-[28px] bg-nav p-4 text-white shadow-dock">
        <Row label="Subtotal" value={pkr(totals.subtotal)} />
        <Row label="Discount" value={pkr(totals.discount)} />
        <Row label="Tax 15%" value={pkr(totals.tax)} />
        <Row label="Delivery" value={pkr(totals.delivery)} />
        <div className="mt-3 flex items-end justify-between">
          <span className="text-xs uppercase tracking-[0.16em] text-white/50">Grand total</span>
          <span className="font-display text-2xl leading-none text-orange-400">{pkr(totals.total)}</span>
        </div>
        {editing ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                cancelEditOrder()
                toast('Edit cancelled')
              }}
              className="h-11 rounded-2xl bg-white/10 text-sm font-extrabold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (missing) {
                  toast(missing, 'warn')
                  return
                }
                try {
                  await saveEditedOrder({ method: 'later', paymentTypeId: cart.paymentTypeId })
                  onClose?.()
                } catch (error) {
                  toast(error.message || 'Could not save order', 'bad')
                }
              }}
              className="h-11 rounded-2xl bg-blue-500 text-sm font-extrabold text-white"
            >
              Save · {pkr(totals.total)}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (missing) {
                toast(missing, 'warn')
                return
              }
              onCheckout()
            }}
            className="mt-3 h-11 w-full rounded-2xl bg-orange-500 text-sm font-extrabold text-white"
          >
            Checkout · {pkr(totals.total)}
          </button>
        )}
      </div>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm text-white/70">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:border-orange-400" />
    </label>
  )
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const id = option.id ?? option
          const text = option.label ?? option
          return (
            <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${value === id ? 'bg-ink text-white' : 'bg-soft text-ink'}`}>
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stepper({ value, onChange }) {
  return (
    <div className="flex h-9 items-center rounded-full bg-soft">
      <button type="button" aria-label="Decrease" onClick={() => onChange(value - 1)} className="grid h-9 w-9 place-items-center"><Minus size={14} /></button>
      <span className="w-5 text-center text-sm font-extrabold">{value}</span>
      <button type="button" aria-label="Increase" onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center"><Plus size={14} /></button>
    </div>
  )
}
