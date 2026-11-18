import { Bike, Percent, Printer, Save, Table2, UserRound, X } from 'lucide-react'
import { summarize, usePos } from '../context/PosContext'
import Button from './Button'
import CartItem from './CartItem'
import Chip from './Chip'
import OrderSummary from './OrderSummary'
import TotalBar from './TotalBar'

export default function OrderPanel({ payMethod, onEdit, onCustomer, onTable, onRider, onMenu, onMethod, onSave, onPrint, onDiscount, onPayNow, onPayLater, onSaveEdit, onCancelEdit }) {
  const { cart, updateCart, setOrderType, setQty, removeLine, paymentTypes, tables, riders, orderTypes, orderChannel, taxInclusive, editingOrder } = usePos()
  const selectedPayment = paymentTypes.find((item) => item.id === cart.paymentTypeId)
    || paymentTypes.find((item) => item.kind === payMethod || item.id === payMethod)
  const totals = summarize(cart, selectedPayment?.tax, taxInclusive)
  const methodLabel = selectedPayment?.label || 'Cash'
  const countLabel = `${totals.count} item${totals.count === 1 ? '' : 's'}`
  const selectedTable = tables.find((table) => table.id === cart.tableId)
  const selectedRider = riders.find((rider) => rider.id === cart.riderId)
  const tableLabel = selectedTable
    ? `${selectedTable.label} · ${selectedTable.floor || 'Main floor'}`
    : 'Table'
  const riderLabel = selectedRider?.name || cart.rider || 'Rider'
  const customerLabel = [cart.customer, cart.phone].filter(Boolean).join(' · ')
  const editing = Boolean(editingOrder?.id)

  return (
    <section className="flex h-full min-h-0 w-full flex-col rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white shadow-[var(--pos-shadow)] lg:w-[40%]">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
        <h2 className="text-base font-semibold">{editing ? `Edit ${editingOrder.orderNumber}` : 'New order'}</h2>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-xs text-[var(--pos-muted)]">
          <span className="shrink-0">{countLabel}</span>
          <button type="button" aria-label="Order menu" onClick={onMenu} className="grid h-8 w-8 shrink-0 place-items-center rounded-full active:bg-[#eef3fb]">···</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
        {orderChannel === 'dine-in' && (
          <button
            type="button"
            onClick={onTable}
            className={`inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold ${selectedTable ? 'border-[var(--pos-accent)] bg-[#eef5ff] text-[var(--pos-text)]' : 'border-[var(--pos-border)] text-[var(--pos-text)] active:bg-[#eef3fb]'}`}
          >
            <Table2 size={15} className="shrink-0" />
            <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{tableLabel}</span>
          </button>
        )}
        {orderChannel === 'delivery' && (
          <div className={`inline-flex h-9 max-w-full items-center gap-1 rounded-full border py-0 pl-3 ${selectedRider || cart.rider ? 'border-[var(--pos-accent)] bg-[#eef5ff] pr-1' : 'border-[var(--pos-border)] pr-3'}`}>
            <button
              type="button"
              onClick={onRider}
              className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--pos-text)]"
            >
              <Bike size={15} className="shrink-0" />
              <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{riderLabel}</span>
            </button>
            {(selectedRider || cart.rider) ? (
              <button
                type="button"
                aria-label="Clear rider"
                onClick={() => updateCart({ riderId: '', rider: '' })}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--pos-muted)] active:bg-white/70"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        )}
        <div className={`inline-flex h-9 max-w-full items-center gap-1 rounded-full border py-0 pl-3 ${customerLabel ? 'border-[var(--pos-accent)] bg-[#eef5ff] pr-1' : 'border-[var(--pos-border)] pr-3'}`}>
          <button
            type="button"
            onClick={onCustomer}
            className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--pos-text)]"
          >
            <UserRound size={15} className="shrink-0" />
            <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{customerLabel || 'Customer'}</span>
          </button>
          {customerLabel ? (
            <button
              type="button"
              aria-label="Clear customer"
              onClick={() => updateCart({ customerId: '', customer: '', phone: '', address: '' })}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--pos-muted)] active:bg-white/70"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        {orderTypes.map((type) => (
          <Chip key={type.code} compact className="uppercase" active={cart.orderType === type.code} onClick={() => setOrderType(type)}>
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
      <TotalBar
        total={totals.total}
        editing={editing}
        onPayNow={onPayNow}
        onPayLater={onPayLater}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
      />
    </section>
  )
}
