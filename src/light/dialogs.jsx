import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ORDER_TYPES, PAYMENT_METHODS } from '../data/catalog'
import { notifications } from '../data/seed'
import { summarize, usePos } from '../context/PosContext'
import { formatTime, lineMeta, prepLabel } from '../utils/format'
import Button from './Button'
import Chip from './Chip'
import { buildLine } from './line'
import Modal from './Modal'
import { money } from './money'

const quickCash = [1000, 2000, 5000]

export default function LightDialogs({ dialog, close, editor, payMethod, setPayMethod, onAdd, onUpdate }) {
  if (!dialog) return null
  if (dialog === 'clear') return <ClearDialog close={close} />
  if (dialog === 'discount') return <DiscountDialog close={close} />
  if (dialog === 'customer') return <CustomerDialog close={close} />
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
  const { cart, updateCart, tables, waiters, zones, riders } = usePos()
  const [draft, setDraft] = useState({
    customer: cart.customer,
    phone: cart.phone,
    address: cart.address,
    tableId: cart.tableId,
    waiterId: cart.waiterId,
    zoneId: cart.zoneId,
    rider: cart.rider,
    externalRef: cart.externalRef,
  })
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }))
  const type = cart.orderType

  return (
    <Modal
      title="Customer"
      onClose={close}
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={() => { updateCart(draft); close() }}>Save</Button>
        </>
      )}
    >
      <div className="space-y-3">
        {type === 'dine-in' && (
          <>
            <Picker label="Table" options={tables} value={draft.tableId} onChange={(tableId) => set({ tableId })} />
            <Picker label="Waiter" options={waiters} value={draft.waiterId} onChange={(waiterId) => set({ waiterId })} />
          </>
        )}
        <Field label="Name" value={draft.customer} onChange={(customer) => set({ customer })} />
        {type !== 'dine-in' && <Field label="Phone" value={draft.phone} onChange={(phone) => set({ phone })} />}
        {type === 'delivery' && (
          <>
            <Field label="Address" value={draft.address} onChange={(address) => set({ address })} />
            <Picker label="Zone" options={zones} value={draft.zoneId} onChange={(zoneId) => set({ zoneId })} />
            <label className="block text-xs font-medium text-[var(--pos-muted)]">
              Rider
              <select value={draft.rider} onChange={(event) => set({ rider: event.target.value })} className="mt-2 h-12 w-full rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white px-3 text-sm text-[var(--pos-text)]">
                <option value="">Select rider</option>
                {riders.filter((rider) => rider.id !== 'panda').map((rider) => (
                  <option key={rider.id} value={rider.name}>{rider.name}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {(type === 'foodpanda' || type === 'bite') && (
          <Field label="Platform order no." value={draft.externalRef} onChange={(externalRef) => set({ externalRef })} />
        )}
      </div>
    </Modal>
  )
}

function TypeDialog({ close }) {
  const { cart, updateCart } = usePos()
  return (
    <Modal title="Order type" onClose={close}>
      <div className="flex flex-wrap gap-2">
        {ORDER_TYPES.map((type) => (
          <Chip key={type.id} className="uppercase" active={cart.orderType === type.id} onClick={() => { updateCart({ orderType: type.id }); close() }}>
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
  const draft = { variationId, choiceMap, addonIds, qty, instructions }
  const preview = buildLine(product, draft)

  const save = () => {
    const missing = product.choiceGroups.find((group) => group.required && !choiceMap[group.id])
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
        {product.choiceGroups.map((group) => (
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

function PayDialog({ close, payMethod, setPayMethod, take }) {
  const { cart, placeOrder, toast } = usePos()
  const totals = summarize(cart)
  const [method, setMethod] = useState(payMethod || 'cash')
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

  const choose = (id) => {
    setMethod(id)
    setPayMethod(id)
    setError('')
  }

  const charge = async () => {
    if (!cart.lines.length) {
      toast('Add a dish to start the order', 'warn')
      return
    }
    if (cart.orderType === 'dine-in' && !cart.tableId) {
      toast('Choose a table', 'warn')
      return
    }
    if (cart.orderType === 'delivery' && !cart.zoneId) {
      toast('Choose a delivery zone', 'warn')
      return
    }
    if ((cart.orderType === 'foodpanda' || cart.orderType === 'bite') && !cart.externalRef.trim()) {
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
      status: method === 'credit' ? (receivedNum > 0 && receivedNum < totals.total ? 'partial' : receivedNum >= totals.total ? 'paid' : 'credit') : 'paid',
      received: method === 'mixed' ? totals.total : method === 'cash' || method === 'credit' ? receivedNum : totals.total,
      cashAmount: method === 'cash' ? totals.total : method === 'mixed' ? cashNum : method === 'credit' ? Math.min(receivedNum, totals.total) : 0,
      cardAmount: method === 'card' ? totals.total : method === 'mixed' ? cardNum : 0,
      balance: method === 'credit' ? Math.max(0, totals.total - receivedNum) : 0,
    }
    try {
      const order = await placeOrder({ ...payment, wallet, txn })
      setDone({ ...order, change })
    } catch (err) {
      setError(err.message || 'Payment did not go through')
    }
  }

  if (!take) {
    return (
      <Modal title="Payment method" onClose={close} footer={<Button variant="primary" onClick={close}>Done</Button>}>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((item) => (
            <Button key={item.id} variant={method === item.id ? 'dark' : 'secondary'} onClick={() => choose(item.id)}>{item.label}</Button>
          ))}
        </div>
      </Modal>
    )
  }

  if (done) {
    return (
      <Modal title="Ticket sent" onClose={close} footer={<Button variant="primary" onClick={close}>New order</Button>}>
        <div id="receipt" className="space-y-2 text-sm">
          <p className="font-semibold">{done.id} is on the kitchen pass</p>
          <p>Total {money(done.amount)}</p>
          <p className="capitalize">Method {done.paymentMethod}</p>
          {done.change > 0 && <p>Change {money(done.change)}</p>}
          {done.paymentMethod === 'later' && <p>Pay later · due {money(done.balance)}</p>}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Take payment"
      onClose={close}
      wide
      footer={(
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="success" onClick={charge}>{method === 'later' ? 'Send unpaid' : `Take ${money(totals.total)}`}</Button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          {cart.lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-3">
              <span>{line.qty} × {line.name}{lineMeta(line) ? ` · ${lineMeta(line)}` : ''}</span>
              <span className="font-semibold tabular-nums">{money(line.unitPrice * line.qty)}</span>
            </div>
          ))}
          <p className="border-t border-[var(--pos-border)] pt-2 text-lg font-bold tabular-nums">{money(totals.total)}</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((item) => (
              <Button key={item.id} variant={method === item.id ? 'dark' : 'secondary'} onClick={() => choose(item.id)}>{item.label}</Button>
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
          {method === 'later' && <p className="text-sm text-[var(--pos-muted)]">The ticket goes to the kitchen unpaid. The full {money(totals.total)} stays due.</p>}
          {error && <p className="text-sm font-semibold text-[var(--pos-danger)]">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}

function SaveDialog({ close }) {
  const { cart } = usePos()
  const totals = summarize(cart)
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
  const { cart } = usePos()
  const totals = summarize(cart)
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
              <p className="font-semibold">{order.id}</p>
              <p className="font-semibold tabular-nums">{money(order.amount)}</p>
            </div>
            <p className="text-xs text-[var(--pos-muted)]">{order.customer} · {formatTime(order.createdAt)} · {prepLabel(order.prepStatus)} · {order.paymentStatus}</p>
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
        <Button variant="danger" onClick={() => { close(); signOut() }}>Log out</Button>
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
