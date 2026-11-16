import { Percent, Printer, Save, UserRound } from 'lucide-react'
import { summarize, usePos } from '../context/PosContext'
import { ORDER_TYPES, PAYMENT_METHODS } from '../data/catalog'
import Button from './Button'
import CartItem from './CartItem'
import Chip from './Chip'
import OrderSummary from './OrderSummary'
import TotalBar from './TotalBar'

export default function OrderPanel({ payMethod, onEdit, onCustomer, onMenu, onMethod, onSave, onPrint, onDiscount, onPay }) {
  const { cart, updateCart, setQty, removeLine } = usePos()
  const totals = summarize(cart)
  const methodLabel = PAYMENT_METHODS.find((item) => item.id === payMethod)?.label || 'Cash'
  const countLabel = `${totals.count} item${totals.count === 1 ? '' : 's'}`

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white shadow-[var(--pos-shadow)] lg:w-[40%]">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
        <h2 className="text-base font-semibold">New order</h2>
        <div className="flex items-center gap-1.5 text-xs text-[var(--pos-muted)]">
          <button type="button" onClick={onCustomer} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--pos-border)] px-2.5 text-[11px] font-semibold text-[var(--pos-text)] active:bg-[#eef3fb]">
            <UserRound size={14} />
            Customer
          </button>
          <span>{countLabel}</span>
          <button type="button" aria-label="Order menu" onClick={onMenu} className="grid h-8 w-8 place-items-center rounded-full active:bg-[#eef3fb]">···</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        {ORDER_TYPES.map((type) => (
          <Chip key={type.id} compact className="uppercase" active={cart.orderType === type.id} onClick={() => updateCart({ orderType: type.id })}>
            {type.label}
          </Chip>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.lines.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--pos-muted)]">Tap a product to start this order.</p>
        )}
        {cart.lines.map((line) => (
          <CartItem
            key={line.id}
            line={line}
            onEdit={() => onEdit(line)}
            onQty={(qty) => setQty(line.id, qty)}
            onRemove={() => removeLine(line.id)}
          />
        ))}
      </div>
      <OrderSummary totals={totals} methodLabel={methodLabel} onMethod={onMethod} />
      <div className="grid grid-cols-3 gap-2 px-3 pb-3">
        <Button onClick={onSave}><Save size={16} /> Save</Button>
        <Button onClick={onPrint}><Printer size={16} /> Print</Button>
        <Button onClick={onDiscount}><Percent size={16} /> Discounts</Button>
      </div>
      <TotalBar total={totals.total} onPay={onPay} />
    </section>
  )
}
