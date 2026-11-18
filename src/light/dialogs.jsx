import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Bike, Check, Users } from 'lucide-react'
import { groupTablesByFloor } from '../api'
import { channelFromOrderCode } from '../api'
import { notifications } from '../data/seed'
import { summarize, usePos } from '../context/PosContext'
import { formatTime, itemsLabel, lineMeta, orderLabel, prepLabel } from '../utils/format'
import Button from './Button'
import Chip from './Chip'
import { buildLine } from './line'
import Modal from './Modal'
import { money } from './money'

const quickCash = [1000, 2000, 5000]

const tableStatusMeta = {
  AVAILABLE: { label: 'Free', tone: 'free' },
  OCCUPIED: { label: 'Busy', tone: 'busy' },
  RESERVED: { label: 'Held', tone: 'held' },
  OUT_OF_SERVICE: { label: 'Closed', tone: 'closed' },
}

export default function LightDialogs({ dialog, close, editor, payMethod, setPayMethod, onAdd, onUpdate }) {
  if (!dialog) return null
  if (dialog === 'clear') return <ClearDialog close={close} />
  if (dialog === 'discount') return <DiscountDialog close={close} />
  if (dialog === 'customer') return <CustomerDialog close={close} />
  if (dialog === 'table') return <TableDialog close={close} />
  if (dialog === 'rider') return <RiderDialog close={close} />
  if (dialog === 'type' || dialog === 'menu') return <TypeDialog close={close} />
  if (dialog === 'item' && editor) return <ItemDialog editor={editor} close={close} onAdd={onAdd} onUpdate={onUpdate} />
  if (dialog === 'method' || dialog === 'pay') return <PayDialog close={close} payMethod={payMethod} setPayMethod={setPayMethod} take={dialog === 'pay'} />
  if (dialog === 'save') return <SaveDialog close={close} />
  if (dialog === 'print') return <PrintDialog close={close} />
  if (dialog === 'pending') return <TicketList close={close} mode="pending" />
  if (dialog === 'history') return <TicketList close={close} mode="history" />
  if (dialog === 'shift') return <ShiftDialog close={close} />
  if (dialog === 'bell') return <BellDialog close={close} />
  if (dialog === 'nav') return <NavDialog close={close} />
  return null
}

function ClearDialog({ close }) {
  const { clearCart, cart } = usePos()
  return (
    <Modal
      title="Clear order?"
      onClose={close}
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (cart.lines.length) clearCart()
              close()
            }}
          >
            Clear
          </Button>
        </>
      )}
    >
      <p className="text-sm text-[var(--pos-muted)]">This removes every item on the open ticket. It does not delete orders already sent.</p>
    </Modal>
  )
}

function DiscountDialog({ close }) {
  const { cart, updateCart } = usePos()
  const [value, setValue] = useState(String(cart.discount || ''))
  return (
    <Modal
      title="Discount"
      onClose={close}
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={() => { updateCart({ discount: Math.max(0, Number(value) || 0) }); close() }}>Apply</Button>
        </>
      )}
    >
      <label className="block text-xs font-medium text-[var(--pos-muted)]">
        Amount off the subtotal
        <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" className="mt-2 h-12 w-full rounded-[var(--pos-radius)] border border-[var(--pos-border)] px-3 text-base text-[var(--pos-text)] outline-none focus:border-[var(--pos-accent)]" />
      </label>
    </Modal>
  )
}

function CustomerDialog({ close }) {
  const { cart, updateCart, waiters, zones, searchCustomers, addCustomer, toast } = usePos()
  const [draft, setDraft] = useState({
    customerId: cart.customerId,
    customer: cart.customer,
    phone: cart.phone,
    address: cart.address,
    waiterId: cart.waiterId,
    zoneId: cart.zoneId,
    externalRef: cart.externalRef,
  })
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }))
  const type = channelFromOrderCode(cart.orderType)
  const searchTerm = query.trim()

  useEffect(() => {
    if (searchTerm.length < 2) {
      setHits([])
      setSearching(false)
      return undefined
    }
    let stop = false
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const rows = await searchCustomers(searchTerm)
        if (!stop) setHits(rows)
      } catch {
        if (!stop) setHits([])
      } finally {
        if (!stop) setSearching(false)
      }
    }, 450)
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [searchTerm])

  const pickCustomer = (row) => {
    set({
      customerId: row.id,
      customer: row.name,
      phone: row.phone || draft.phone,
      address: row.address || draft.address,
    })
    setQuery('')
    setHits([])
  }

  const save = async () => {
    let next = { ...draft }
    if (!next.customerId && next.customer.trim()) {
      setSaving(true)
      try {
        const created = await addCustomer({
          name: next.customer.trim(),
          phone: next.phone.trim() || undefined,
          address: next.address.trim() || undefined,
        })
        next = {
          ...next,
          customerId: created.id,
          customer: created.name,
          phone: created.phone || next.phone,
          address: created.address || next.address,
        }
      } catch (error) {
        toast(error.message || 'Could not save customer', 'bad')
        setSaving(false)
        return
      }
      setSaving(false)
    }
    updateCart(next)
    close()
  }

  return (
    <Modal
      title="Customer"
      onClose={close}
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {type === 'dine-in' && (
          <Picker label="Waiter" options={waiters} value={draft.waiterId} onChange={(waiterId) => set({ waiterId })} />
        )}
        <label className="block text-xs font-medium text-[var(--pos-muted)]">
          Search customers
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or phone"
            className="mt-2 h-12 w-full rounded-[var(--pos-radius)] border border-[var(--pos-border)] px-3 text-sm text-[var(--pos-text)] outline-none focus:border-[var(--pos-accent)]"
          />
        </label>
        {(searching || hits.length > 0) && (
          <div className="max-h-40 overflow-y-auto rounded-[var(--pos-radius)] border border-[var(--pos-border)]">
            {searching && <p className="px-3 py-2 text-xs text-[var(--pos-muted)]">Searching…</p>}
            {hits.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => pickCustomer(row)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-[var(--pos-border)] px-3 py-2 text-left last:border-b-0 hover:bg-[#f5f8fc]"
              >
                <span className="text-sm font-semibold text-[var(--pos-text)]">{row.name}</span>
                <span className="text-xs text-[var(--pos-muted)]">{[row.phone, row.address].filter(Boolean).join(' · ') || 'No contact details'}</span>
              </button>
            ))}
          </div>
        )}
        <Field label="Name" value={draft.customer} onChange={(customer) => set({ customer, customerId: '' })} />
        {type !== 'dine-in' && <Field label="Phone" value={draft.phone} onChange={(phone) => set({ phone })} />}
        {type === 'delivery' && (
          <>
            <Field label="Address" value={draft.address} onChange={(address) => set({ address })} />
            <Picker label="Zone" options={zones} value={draft.zoneId} onChange={(zoneId) => set({ zoneId })} />
          </>
        )}
        {(type === 'foodpanda' || type === 'bite') && (
          <Field label="Platform order no." value={draft.externalRef} onChange={(externalRef) => set({ externalRef })} />
        )}
      </div>
    </Modal>
  )
}

function RiderDialog({ close }) {
  const { cart, updateCart, riders } = usePos()

  const pick = (rider) => {
    updateCart({ riderId: rider.id, rider: rider.name })
    close()
  }

  return (
    <Modal
      title="Choose a rider"
      onClose={close}
      footer={(
        <>
          {cart.riderId ? (
            <Button onClick={() => { updateCart({ riderId: '', rider: '' }); close() }}>Clear rider</Button>
          ) : null}
          <Button variant="primary" onClick={close}>Done</Button>
        </>
      )}
    >
      {riders.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--pos-muted)]">No riders loaded for this branch.</p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {riders.map((rider) => {
            const selected = cart.riderId === rider.id
            const free = rider.status !== 'out'
            return (
              <button
                key={rider.id}
                type="button"
                onClick={() => pick(rider)}
                className={`relative flex items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition ${
                  selected
                    ? 'border-[var(--pos-accent)] bg-[#eff6ff] shadow-[0_0_0_1px_var(--pos-accent)]'
                    : 'border-[var(--pos-border)] bg-white active:scale-[0.99] active:bg-[#f8fbff]'
                }`}
              >
                {selected && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--pos-accent)] text-white">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selected ? 'bg-[var(--pos-accent)] text-white' : 'bg-[#eef3fb] text-[var(--pos-accent)]'}`}>
                  <Bike size={16} />
                </span>
                <span className="min-w-0 flex-1 pr-4">
                  <span className="block truncate text-sm font-bold text-[var(--pos-text)]">{rider.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className={`rounded-full px-1.5 py-px font-bold uppercase ${free ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {free ? 'Free' : 'Out'}
                    </span>
                    {rider.phone ? <span className="truncate text-[var(--pos-muted)]">{rider.phone}</span> : null}
                    {rider.vehicle ? <span className="truncate text-[var(--pos-muted)]">· {rider.vehicle}</span> : null}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function TableDialog({ close }) {
  const { cart, updateCart, tables } = usePos()
  const floors = useMemo(() => groupTablesByFloor(tables), [tables])
  const initialFloor = floors.find((group) => group.tables.some((table) => table.id === cart.tableId))?.floor
    || floors[0]?.floor
    || ''
  const [floor, setFloor] = useState(initialFloor)
  const activeFloor = floors.find((group) => group.floor === floor) || floors[0]
  const activeTables = activeFloor?.tables || []

  const pick = (table) => {
    if (table.status === 'OUT_OF_SERVICE') return
    updateCart({ tableId: table.id })
    close()
  }

  return (
    <Modal
      title="Choose a table"
      onClose={close}
      wide
      footer={(
        <>
          {cart.tableId ? (
            <Button onClick={() => { updateCart({ tableId: '' }); close() }}>Clear table</Button>
          ) : null}
          <Button variant="primary" onClick={close}>Done</Button>
        </>
      )}
    >
      {tables.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--pos-muted)]">No tables loaded for this branch.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {floors.map((group) => {
              const selected = group.floor === (activeFloor?.floor || '')
              return (
                <button
                  key={group.floor}
                  type="button"
                  onClick={() => setFloor(group.floor)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${selected ? 'bg-[var(--pos-dark)] text-white' : 'border border-[var(--pos-border)] bg-white text-[var(--pos-text)] active:bg-[#eef3fb]'}`}
                >
                  {group.floor}
                  <span className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${selected ? 'bg-white/20 text-white' : 'bg-[#eef3fb] text-[var(--pos-muted)]'}`}>
                    {group.tables.length}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {activeTables.map((table) => {
              const meta = tableStatusMeta[table.status] || tableStatusMeta.AVAILABLE
              const selected = cart.tableId === table.id
              const closed = table.status === 'OUT_OF_SERVICE'
              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={closed}
                  onClick={() => pick(table)}
                  className={`relative flex min-h-[64px] flex-col items-start justify-between rounded-[10px] border px-2 py-1.5 text-left transition ${
                    selected
                      ? 'border-[var(--pos-accent)] bg-[#eff6ff] shadow-[0_0_0_1px_var(--pos-accent)]'
                      : closed
                        ? 'cursor-not-allowed border-[var(--pos-border)] bg-[#f8fafc] opacity-55'
                        : meta.tone === 'busy'
                          ? 'border-amber-200 bg-amber-50 active:scale-[0.98]'
                          : meta.tone === 'held'
                            ? 'border-sky-200 bg-sky-50 active:scale-[0.98]'
                            : 'border-[var(--pos-border)] bg-white active:scale-[0.98] active:bg-[#f8fbff]'
                  }`}
                >
                  {selected && (
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--pos-accent)] text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                  <div className="flex w-full min-w-0 items-center gap-1.5 pr-3">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${selected ? 'bg-[var(--pos-accent)] text-white' : 'bg-[#eef3fb] text-[var(--pos-accent)]'}`}>
                      <Armchair size={13} />
                    </span>
                    <p className="truncate text-xs font-bold text-[var(--pos-text)]">{table.label}</p>
                  </div>
                  <div className="mt-1 flex w-full items-center justify-between gap-1">
                    <span className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                      meta.tone === 'busy' ? 'bg-amber-100 text-amber-800'
                        : meta.tone === 'held' ? 'bg-sky-100 text-sky-800'
                          : meta.tone === 'closed' ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-100 text-emerald-800'
                    }`}
                    >
                      {meta.label}
                    </span>
                    {table.capacity ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--pos-muted)]">
                        <Users size={10} />
                        {table.capacity}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}

function TypeDialog({ close }) {
  const { cart, setOrderType, orderTypes } = usePos()
  return (
    <Modal title="Order type" onClose={close}>
      <div className="flex flex-wrap gap-2">
        {orderTypes.map((type) => (
          <Chip key={type.code} className="uppercase" active={cart.orderType === type.code} onClick={() => { setOrderType(type); close() }}>
            {type.label}
          </Chip>
        ))}
      </div>
    </Modal>
  )
}

function ItemDialog({ editor, close, onAdd, onUpdate }) {
  const { product, line } = editor
  const [variationId, setVariationId] = useState(line?.variationId || product.variations[0]?.id || null)
  const [choiceMap, setChoiceMap] = useState(line?.choiceMap || {})
  const [addonIds, setAddonIds] = useState(line?.addonIds || [])
  const [qty, setQty] = useState(line?.qty || 1)
  const [instructions, setInstructions] = useState(line?.instructions || '')
  const [error, setError] = useState('')
  const variation = product.variations.find((item) => item.id === variationId) || null
  const groups = [...(product.choiceGroups || []), ...((variation?.choiceGroups) || [])]
  const draft = { variationId, choiceMap, addonIds, qty, instructions }
  const preview = buildLine(product, draft)

  const save = () => {
    const missing = groups.find((group) => group.required && !choiceMap[group.id])
    if (missing) {
      setError(`Choose ${missing.name}`)
      return
    }
    if (line) onUpdate(line.id, preview)
    else onAdd(preview)
    close()
  }

  return (
    <Modal
      title={line ? 'Edit item' : product.name}
      onClose={close}
      wide
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save}>{line ? 'Update' : 'Add'} · {money(preview.unitPrice * qty)}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {product.variations.length > 0 && (
          <ChoiceRow label="Size">
            {product.variations.map((option) => (
              <Chip key={option.id} active={variationId === option.id} onClick={() => setVariationId(option.id)}>{option.name}</Chip>
            ))}
          </ChoiceRow>
        )}
        {groups.map((group) => (
          <ChoiceRow key={group.id} label={group.name}>
            {group.options.map((option) => (
              <Chip key={option.id} active={choiceMap[group.id] === option.id} onClick={() => setChoiceMap((current) => ({ ...current, [group.id]: option.id }))}>
                {option.name}
              </Chip>
            ))}
          </ChoiceRow>
        ))}
        {product.addons.length > 0 && (
          <ChoiceRow label="Add-ons">
            {product.addons.map((addon) => {
              const active = addonIds.includes(addon.id)
              return (
                <Chip key={addon.id} active={active} onClick={() => setAddonIds((current) => (active ? current.filter((id) => id !== addon.id) : [...current, addon.id]))}>
                  {addon.name}
                </Chip>
              )
            })}
          </ChoiceRow>
        )}
        <label className="block text-xs font-medium text-[var(--pos-muted)]">
          Note
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={2} className="mt-2 w-full rounded-[var(--pos-radius)] border border-[var(--pos-border)] px-3 py-2 text-sm text-[var(--pos-text)] outline-none" />
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={() => setQty((value) => Math.max(1, value - 1))}>−</Button>
          <span className="w-8 text-center text-base font-semibold">{qty}</span>
          <Button onClick={() => setQty((value) => value + 1)}>+</Button>
        </div>
        {error && <p className="text-sm font-semibold text-[var(--pos-danger)]">{error}</p>}
      </div>
    </Modal>
  )
}

function OrderCalc({ totals, lines = [] }) {
  return (
    <div className="space-y-2 text-sm">
      {lines.length > 0 && (
        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-3">
              <span>{line.qty} × {line.name}{lineMeta(line) ? ` · ${lineMeta(line)}` : ''}</span>
              <span className="font-semibold tabular-nums">{money(line.unitPrice * line.qty)}</span>
            </div>
          ))}
        </div>
      )}
      <div className={`space-y-1.5 text-[var(--pos-muted)] ${lines.length ? 'border-t border-[var(--pos-border)] pt-2' : ''}`}>
        <CalcRow label="Subtotal" value={money(totals.subtotal)} />
        <CalcRow label="Discount" value={money(totals.discount)} />
        <CalcRow label="Taxable" value={money(totals.taxable)} />
        <CalcRow
          label={`${totals.taxInclusive ? 'Tax incl.' : 'Tax'} (${totals.taxPercent}%)`}
          value={money(totals.tax)}
        />
        <CalcRow label="Delivery / service" value={money(totals.delivery)} />
        <div className="flex justify-between border-t border-[var(--pos-border)] pt-2 text-base font-bold text-[var(--pos-text)]">
          <span>Total</span>
          <span className="tabular-nums">{money(totals.total)}</span>
        </div>
      </div>
    </div>
  )
}

function CalcRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tabular-nums text-[var(--pos-text)]">{value}</span>
    </div>
  )
}

function PayDialog({ close, payMethod, setPayMethod, take }) {
  const { cart, placeOrder, toast, paymentTypes, updateCart, taxInclusive } = usePos()
  const payNowMethods = paymentTypes.filter((item) => item.kind !== 'later')
  const [method, setMethod] = useState(payMethod === 'later' && take ? 'later' : (payMethod && payMethod !== 'later' ? payMethod : payNowMethods[0]?.kind || 'cash'))
  const [paymentTypeId, setPaymentTypeId] = useState(() => {
    const match = paymentTypes.find((item) => item.id === cart.paymentTypeId)
      || payNowMethods.find((item) => item.kind === method)
      || payNowMethods[0]
    return match?.id || ''
  })
  const [busy, setBusy] = useState(false)
  const selectedPayment = paymentTypes.find((item) => item.id === paymentTypeId)
    || payNowMethods.find((item) => item.kind === method)
  const totals = summarize(cart, selectedPayment?.tax ?? 0, taxInclusive)
  const [received, setReceived] = useState(String(totals.total))
  const [cashPart, setCashPart] = useState('')
  const [cardPart, setCardPart] = useState('')
  const [wallet, setWallet] = useState('')
  const [txn, setTxn] = useState('')
  const [creditName, setCreditName] = useState(cart.customer)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const receivedNum = Number(received) || 0
  const cashNum = Number(cashPart) || 0
  const cardNum = Number(cardPart) || 0
  const change = method === 'cash' ? Math.max(0, receivedNum - totals.total) : 0

  useEffect(() => {
    setReceived(String(totals.total))
  }, [totals.total, method, paymentTypeId])

  const choose = (item) => {
    const kind = item.kind || item.id
    setMethod(kind)
    setPaymentTypeId(item.id)
    setPayMethod(kind)
    updateCart({ paymentTypeId: item.id })
    setError('')
  }

  const charge = async () => {
    if (busy) return
    if (!cart.lines.length) {
      toast('Add a dish to start the order', 'warn')
      return
    }
    const channel = channelFromOrderCode(cart.orderType)
    if (channel === 'dine-in' && !cart.tableId) {
      toast('Choose a table', 'warn')
      return
    }
    if (['delivery', 'foodpanda', 'bite'].includes(channel) && !String(cart.address || '').trim()) {
      toast('Add a delivery address', 'warn')
      return
    }
    if ((channel === 'foodpanda' || channel === 'bite') && !String(cart.externalRef || '').trim()) {
      toast('Add the platform order number', 'warn')
      return
    }
    if (method === 'cash' && receivedNum < totals.total) {
      setError('Amount received is less than the total')
      return
    }
    if ((method === 'easypaisa' || method === 'jazzcash') && (!wallet.trim() || !txn.trim())) {
      setError('Add the wallet number and transaction id')
      return
    }
    if (method === 'mixed' && cashNum + cardNum !== totals.total) {
      setError('Cash and card must add up to the total')
      return
    }
    if (method === 'credit' && !creditName.trim()) {
      setError('Add the account name for credit')
      return
    }
    const payment = {
      method,
      paymentTypeId: selectedPayment?.id || paymentTypeId,
      taxPercent: totals.taxPercent,
      tax: totals.tax,
      status: method === 'later'
        ? 'unpaid'
        : method === 'credit'
          ? (receivedNum > 0 && receivedNum < totals.total ? 'partial' : receivedNum >= totals.total ? 'paid' : 'credit')
          : 'paid',
      received: method === 'later' ? 0 : method === 'mixed' ? totals.total : method === 'cash' || method === 'credit' ? receivedNum : totals.total,
      change: method === 'cash' ? Math.max(0, receivedNum - totals.total) : 0,
      cashAmount: method === 'cash' ? totals.total : method === 'mixed' ? cashNum : method === 'credit' ? Math.min(receivedNum, totals.total) : 0,
      cardAmount: method === 'card' ? totals.total : method === 'mixed' ? cardNum : 0,
      balance: method === 'later' ? totals.total : method === 'credit' ? Math.max(0, totals.total - receivedNum) : 0,
    }
    setBusy(true)
    try {
      const order = await placeOrder({ ...payment, wallet, txn })
      setDone({ ...order, change })
    } catch (err) {
      setError(err.message || 'Payment did not go through')
    } finally {
      setBusy(false)
    }
  }

  if (!take) {
    return (
      <Modal title="Payment method" onClose={close} footer={<Button variant="primary" onClick={close}>Done</Button>}>
        <div className="space-y-4">
          <OrderCalc totals={totals} />
          <div className="grid grid-cols-2 gap-2">
            {payNowMethods.map((item) => (
              <Button key={item.id} variant={paymentTypeId === item.id || method === item.kind ? 'dark' : 'secondary'} onClick={() => choose(item)}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{item.label}</span>
                  <span className="text-[10px] font-medium opacity-80">Tax {item.tax}%</span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    )
  }

  if (done) {
    return (
      <Modal title="Ticket sent" onClose={close} footer={<Button variant="primary" onClick={close}>New order</Button>}>
        <div id="receipt" className="space-y-2 text-sm">
          <p className="font-semibold">{orderLabel(done)} is on the kitchen pass</p>
          <p>Total {money(done.amount)}</p>
          <p className="capitalize">Method {done.paymentMethod}</p>
          {done.change > 0 && <p>Change {money(done.change)}</p>}
          {done.paymentStatus === 'unpaid' && <p>Pay later · due {money(done.balance)}</p>}
        </div>
      </Modal>
    )
  }

  if (method === 'later') {
    const laterTotals = summarize(cart, selectedPayment?.tax ?? 0, taxInclusive)
    return (
      <Modal
        title="Pay later"
        onClose={close}
        footer={(
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="dark" onClick={charge} disabled={busy}>Send unpaid · {money(laterTotals.total)}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <OrderCalc totals={laterTotals} lines={cart.lines} />
          <p className="text-sm text-[var(--pos-muted)]">
            The ticket goes to the kitchen unpaid. The full amount stays due until payment is collected.
          </p>
          {error && <p className="text-sm font-semibold text-[var(--pos-danger)]">{error}</p>}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Pay now"
      onClose={close}
      wide
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="success" onClick={charge} disabled={busy}>Take {money(totals.total)}</Button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <OrderCalc totals={totals} lines={cart.lines} />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {payNowMethods.map((item) => (
              <Button key={item.id} variant={paymentTypeId === item.id || method === item.kind ? 'dark' : 'secondary'} onClick={() => choose(item)}>
                <span className="flex flex-col items-center leading-tight">
                  <span>{item.label}</span>
                  <span className="text-[10px] font-medium opacity-80">Tax {item.tax}%</span>
                </span>
              </Button>
            ))}
          </div>
          {(method === 'cash' || method === 'credit') && (
            <>
              <Field label="Received" value={received} onChange={setReceived} />
              {method === 'cash' && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setReceived(String(totals.total))}>Exact</Button>
                  {quickCash.map((amount) => (
                    <Button key={amount} onClick={() => setReceived(String(amount))}>{money(amount)}</Button>
                  ))}
                </div>
              )}
              {method === 'cash' && <p className="text-sm text-[var(--pos-muted)]">Change {money(change)}</p>}
            </>
          )}
          {method === 'mixed' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cash" value={cashPart} onChange={setCashPart} />
              <Field label="Card" value={cardPart} onChange={setCardPart} />
            </div>
          )}
          {(method === 'easypaisa' || method === 'jazzcash') && (
            <>
              <Field label="Wallet number" value={wallet} onChange={setWallet} />
              <Field label="Transaction id" value={txn} onChange={setTxn} />
            </>
          )}
          {method === 'card' && <Field label="Approval code" value={txn} onChange={setTxn} />}
          {method === 'credit' && <Field label="Account name" value={creditName} onChange={setCreditName} />}
          {error && <p className="text-sm font-semibold text-[var(--pos-danger)]">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}

function SaveDialog({ close }) {
  const { cart, paymentTypes, taxInclusive } = usePos()
  const selectedPayment = paymentTypes.find((item) => item.id === cart.paymentTypeId)
  const totals = summarize(cart, selectedPayment?.tax, taxInclusive)
  return (
    <Modal title="Ticket kept" onClose={close} footer={<Button variant="primary" onClick={close}>Keep open</Button>}>
      <p className="text-sm text-[var(--pos-muted)]">
        {cart.lines.length
          ? `${cart.lines.length} item${cart.lines.length === 1 ? '' : 's'} stay on this counter until you take payment or clear the ticket. Total ${money(totals.total)}.`
          : 'Add a dish first. An empty ticket has nothing to keep.'}
      </p>
    </Modal>
  )
}

function PrintDialog({ close }) {
  const { cart, paymentTypes, taxInclusive } = usePos()
  const selectedPayment = paymentTypes.find((item) => item.id === cart.paymentTypeId)
  const totals = summarize(cart, selectedPayment?.tax, taxInclusive)
  return (
    <Modal title="Print ticket" onClose={close} footer={<Button variant="primary" onClick={() => window.print()} disabled={!cart.lines.length}>Print</Button>}>
      <div id="receipt" className="space-y-1 text-sm">
        {cart.lines.length === 0 && <p className="text-[var(--pos-muted)]">Nothing to print yet.</p>}
        {cart.lines.map((line) => (
          <div key={line.id} className="flex justify-between gap-3">
            <span>{line.qty} × {line.name}</span>
            <span>{money(line.unitPrice * line.qty)}</span>
          </div>
        ))}
        {cart.lines.length > 0 && <p className="pt-2 font-bold">Total {money(totals.total)}</p>}
      </div>
    </Modal>
  )
}

function TicketList({ close, mode }) {
  const { orders, history } = usePos()
  const navigate = useNavigate()
  const rows = useMemo(() => {
    if (mode === 'history') return history
    return orders.filter((order) => order.paymentStatus !== 'paid' || order.prepStatus !== 'dispatched')
  }, [history, mode, orders])

  return (
    <Modal
      title={mode === 'history' ? 'History' : 'Pending'}
      onClose={close}
      footer={(
        <Button variant="primary" onClick={() => { close(); navigate(mode === 'history' ? '/history' : '/orders') }}>
          Open full list
        </Button>
      )}
    >
      {rows.length === 0 && <p className="text-sm text-[var(--pos-muted)]">Nothing in this list.</p>}
      <ul className="space-y-2">
        {rows.map((order) => (
          <li key={order.id} className="rounded-[var(--pos-radius)] border border-[var(--pos-border)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{orderLabel(order)}</p>
              <p className="font-semibold tabular-nums">{money(order.amount)}</p>
            </div>
            <p className="mt-1 text-xs text-[var(--pos-text)]">{itemsLabel(order)}</p>
            <p className="text-xs text-[var(--pos-muted)]">{order.customer || 'Walk-in'} · {formatTime(order.createdAt)} · {prepLabel(order.prepStatus)} · {order.paymentStatus}</p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function ShiftDialog({ close }) {
  const { staff, setStaffStatus } = usePos()
  return (
    <Modal title="Shift open" onClose={close} footer={<Button onClick={close}>Close</Button>}>
      <ul className="space-y-3">
        {staff.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-xs text-[var(--pos-muted)]">{person.role} · {person.station}</p>
            </div>
            <div className="flex gap-2">
              {['on', 'break'].map((status) => (
                <Button key={status} variant={person.status === status ? 'dark' : 'secondary'} onClick={() => setStaffStatus(person.id, status)}>
                  {status === 'on' ? 'On' : 'Break'}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function BellDialog({ close }) {
  return (
    <Modal title="Notifications" onClose={close} footer={<Button onClick={close}>Close</Button>}>
      <ul className="space-y-3">
        {notifications.map((note) => (
          <li key={note.id}>
            <p className="font-medium">{note.title}</p>
            <p className="text-sm text-[var(--pos-muted)]">{note.body}</p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function NavDialog({ close }) {
  const navigate = useNavigate()
  const { signOut } = usePos()
  const go = (path) => {
    close()
    navigate(path)
  }
  return (
    <Modal title="Menu" onClose={close}>
      <div className="grid gap-2">
        <Button onClick={() => go('/orders')}>Today’s orders</Button>
        <Button onClick={() => go('/kitchen')}>Kitchen</Button>
        <Button onClick={() => go('/more')}>More tools</Button>
        <Button onClick={() => go('/settings')}>Layout settings</Button>
        <Button variant="danger" onClick={async () => { close(); await signOut() }}>Log out</Button>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-xs font-medium text-[var(--pos-muted)]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-[var(--pos-radius)] border border-[var(--pos-border)] px-3 text-sm font-medium normal-case tracking-normal text-[var(--pos-text)] outline-none focus:border-[var(--pos-accent)]" />
    </label>
  )
}

function Picker({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--pos-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = option.id ?? option
          const text = option.label ?? option
          return <Chip key={id} active={value === id} onClick={() => onChange(id)}>{text}</Chip>
        })}
      </div>
    </div>
  )
}

function ChoiceRow({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--pos-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
