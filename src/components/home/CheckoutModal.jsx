import { useMemo, useState } from 'react'
import { Banknote, Check, CreditCard, Smartphone, Wallet, X } from 'lucide-react'
import { PAYMENT_METHODS } from '../../data/catalog'
import { summarize, usePos } from '../../context/PosContext'
import { lineMeta, pkr } from '../../utils/format'
import Overlay from '../ui/Overlay'

const quickCash = [1000, 2000, 5000]

export default function CheckoutModal({ onClose }) {
  const { cart, placeOrder } = usePos()
  const totals = summarize(cart)
  const [method, setMethod] = useState('cash')
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
  const balance = useMemo(() => {
    if (method === 'credit') return Math.max(0, totals.total - receivedNum)
    if (method === 'cash') return Math.max(0, totals.total - receivedNum)
    return 0
  }, [method, receivedNum, totals.total])

  const charge = async () => {
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
      setDone({ ...order, change, wallet, txn, creditName })
    } catch (error) {
      setError(error.message || 'The order did not reach Orra')
    }
  }

  if (done) {
    return (
      <Overlay onClose={onClose} className="max-w-lg rounded-[32px]">
        <div id="receipt" className="p-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-good/15 text-good">
            <Check size={28} />
          </div>
          <h2 className="mt-3 text-center font-display text-2xl">Ticket sent</h2>
          <p className="text-center text-sm text-muted">{done.id} is on the kitchen pass</p>
          <div className="mt-5 space-y-2 rounded-3xl bg-soft p-4 text-sm">
            <div className="flex justify-between"><span>Total</span><strong>{pkr(done.amount)}</strong></div>
            <div className="flex justify-between"><span>Method</span><strong className="capitalize">{done.paymentMethod}</strong></div>
            {done.paymentMethod === 'cash' && <div className="flex justify-between"><span>Change</span><strong>{pkr(done.change)}</strong></div>}
            {done.balance > 0 && <div className="flex justify-between"><span>Balance</span><strong>{pkr(done.balance)}</strong></div>}
          </div>
          <div className="mt-4 flex gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="h-12 flex-1 rounded-2xl bg-soft font-bold">Print receipt</button>
            <button type="button" onClick={onClose} className="h-12 flex-1 rounded-2xl bg-ink font-bold text-white">New order</button>
          </div>
        </div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose} className="max-w-5xl rounded-t-[32px] sm:rounded-[32px]">
      <div className="grid max-h-[94vh] lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Order summary</p>
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
            {cart.lines.map((line) => (
              <div key={line.id} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold">{line.qty} × {line.name}</p>
                  {lineMeta(line) && <p className="text-xs text-muted">{lineMeta(line)}</p>}
                </div>
                <p className="font-bold">{pkr(line.unitPrice * line.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <Mini label="Subtotal" value={pkr(totals.subtotal)} />
            <Mini label="Discount" value={pkr(totals.discount)} />
            <Mini label="Tax" value={pkr(totals.tax)} />
            <Mini label="Delivery" value={pkr(totals.delivery)} />
          </div>
          <p className="mt-3 font-display text-3xl leading-none text-orange-500">{pkr(totals.total)}</p>
        </div>
        <div className="flex max-h-[94vh] flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Payment</h2>
            <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-soft"><X /></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setMethod(item.id); setError('') }}
                className={`flex h-20 flex-col items-start justify-between rounded-3xl border px-3 py-3 text-left ${method === item.id ? 'border-orange-500 bg-orange-500 text-white' : 'border-line'}`}
              >
                <PayIcon id={item.id} />
                <span className="text-sm font-extrabold">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {(method === 'cash' || method === 'credit') && (
              <>
                <Field label={method === 'cash' ? 'Amount received' : 'Amount received now'} value={received} onChange={setReceived} />
                {method === 'cash' && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setReceived(String(totals.total))} className="rounded-full bg-soft px-3 py-2 text-xs font-bold">Exact</button>
                    {quickCash.map((amount) => (
                      <button key={amount} type="button" onClick={() => setReceived(String(amount))} className="rounded-full bg-soft px-3 py-2 text-xs font-bold">{pkr(amount)}</button>
                    ))}
                  </div>
                )}
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
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl bg-soft p-3 text-center">
            <Stat label="Received" value={pkr(method === 'mixed' ? cashNum + cardNum : method === 'card' || method === 'easypaisa' || method === 'jazzcash' ? totals.total : receivedNum)} />
            <Stat label="Balance" value={pkr(method === 'credit' ? balance : method === 'cash' ? Math.max(0, totals.total - receivedNum) : 0)} />
            <Stat label="Change" value={pkr(change)} />
          </div>
          {error && <p className="mt-3 text-sm font-bold text-red-500">{error}</p>}
          <button type="button" onClick={charge} className="mt-4 h-14 rounded-2xl bg-ink text-base font-extrabold text-white">
            {method === 'later' ? `Pay later · ${pkr(totals.total)} due` : `Take payment · ${pkr(totals.total)}`}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function PayIcon({ id }) {
  const map = { cash: Banknote, card: CreditCard, easypaisa: Smartphone, jazzcash: Smartphone, mixed: Wallet, credit: Wallet }
  const Icon = map[id] || Banknote
  return <Icon size={18} />
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:border-orange-400" />
    </label>
  )
}

function Mini({ label, value }) {
  return <div className="flex justify-between text-muted"><span>{label}</span><span className="font-semibold text-ink">{value}</span></div>
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-extrabold">{value}</p>
    </div>
  )
}
