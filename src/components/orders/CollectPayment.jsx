import { useState } from 'react'
import { X } from 'lucide-react'
import { usePos } from '../../context/PosContext'
import { lineMeta, orderLabel, pkr, typeLabel } from '../../utils/format'

const quickCash = [1000, 2000, 5000]

export default function CollectPayment() {
  const { collectingId } = usePos()
  if (!collectingId) return null
  return <CollectForm key={collectingId} orderId={collectingId} />
}

function CollectForm({ orderId }) {
  const { orders, history, cancelCollect, settleOrder, paymentTypes } = usePos()
  const methods = paymentTypes.filter((item) => item.kind !== 'later')
  const order = orders.find((item) => item.id === orderId) || history.find((item) => item.id === orderId)
  const due = order ? Math.max(0, Number(order.balance) || Number(order.amount) - Number(order.received || 0)) : 0
  const [method, setMethod] = useState(methods[0]?.kind || 'cash')
  const [paymentTypeId, setPaymentTypeId] = useState(methods[0]?.id || '')
  const [received, setReceived] = useState(String(due))
  const [cashPart, setCashPart] = useState('')
  const [cardPart, setCardPart] = useState('')
  const [wallet, setWallet] = useState('')
  const [txn, setTxn] = useState('')
  const [creditName, setCreditName] = useState(order?.customer || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!order) return null

  const receivedNum = Number(received) || 0
  const cashNum = Number(cashPart) || 0
  const cardNum = Number(cardPart) || 0
  const change = method === 'cash' ? Math.max(0, receivedNum - due) : 0

  const charge = async () => {
    if (busy) return
    if (method === 'cash' && receivedNum < due) {
      setError('Amount received is less than the balance')
      return
    }
    if ((method === 'easypaisa' || method === 'jazzcash') && (!wallet.trim() || !txn.trim())) {
      setError('Add the wallet number and transaction id')
      return
    }
    if (method === 'mixed' && cashNum + cardNum !== due) {
      setError('Cash and card must add up to the balance')
      return
    }
    if (method === 'credit' && !creditName.trim()) {
      setError('Add the account name for credit')
      return
    }
    setBusy(true)
    try {
      await settleOrder(order.id, {
        method,
        paymentTypeId,
        received: method === 'credit' ? receivedNum : method === 'cash' ? receivedNum : due,
        change: method === 'cash' ? change : 0,
        cashAmount: method === 'cash' ? due : method === 'mixed' ? cashNum : method === 'credit' ? Math.min(receivedNum, due) : 0,
        cardAmount: method === 'card' ? due : method === 'mixed' ? cardNum : 0,
        txn,
        notes: [wallet, txn].filter(Boolean).join(' · ') || undefined,
      })
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={cancelCollect} />
      <div role="dialog" aria-modal="true" aria-label={`Pay ${orderLabel(order)}`} className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface text-ink shadow-dock">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-500">{typeLabel(order.type)} · {order.customer || 'Walk-in'}</p>
            <h2 className="text-xl font-semibold">{orderLabel(order)}</h2>
            <p className="text-sm text-muted">{order.table || 'No table'} · due {pkr(due)}</p>
          </div>
          <button type="button" aria-label="Close payment" onClick={cancelCollect} className="grid h-11 w-11 place-items-center rounded-full bg-soft">
            <X size={18} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-3 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.qty} × {item.name}
                  {lineMeta(item) ? <span className="block text-xs text-muted">{lineMeta(item)}</span> : null}
                </span>
                <span className="font-semibold">{pkr(item.unitPrice * item.qty)}</span>
              </div>
            ))}
            <p className="border-t border-line pt-2 text-lg font-bold">{pkr(due)}</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {methods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMethod(item.kind)
                    setPaymentTypeId(item.id)
                    setError('')
                  }}
                  className={`h-12 rounded-2xl text-sm font-bold ${method === item.kind ? 'bg-ink text-white' : 'bg-soft'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {(method === 'cash' || method === 'credit') && (
              <>
                <Field label={method === 'cash' ? 'Amount received' : 'Amount received now'} value={received} onChange={setReceived} />
                {method === 'cash' && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setReceived(String(due))} className="h-10 rounded-full bg-soft px-3 text-xs font-bold">Exact</button>
                    {quickCash.map((amount) => (
                      <button key={amount} type="button" onClick={() => setReceived(String(amount))} className="h-10 rounded-full bg-soft px-3 text-xs font-bold">{pkr(amount)}</button>
                    ))}
                  </div>
                )}
                {method === 'cash' && <p className="text-sm text-muted">Change {pkr(change)}</p>}
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
            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={cancelCollect} className="h-12 rounded-2xl bg-soft px-4 text-sm font-bold">Cancel</button>
          <button type="button" onClick={charge} disabled={busy} className="h-12 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white disabled:opacity-60">Take {pkr(due)}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none" />
    </label>
  )
}
