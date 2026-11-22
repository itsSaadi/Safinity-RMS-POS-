import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { channelFromOrderCode } from '../api'
import { cartCharges, usePos } from '../context/PosContext'
import { DELIVERY_FEE } from '../data/catalog'
import { money } from './money'

export default function OrderSummary({ totals, methodLabel, onMethod }) {
  const [open, setOpen] = useState(false)
  const { cart, updateCart } = usePos()
  const channel = channelFromOrderCode(cart.orderType)
  const serviceValue = cart.serviceCharge == null || cart.serviceCharge === '' ? 0 : cart.serviceCharge
  const deliveryValue = cart.deliveryCharge == null || cart.deliveryCharge === ''
    ? (channel === 'delivery' ? DELIVERY_FEE : 0)
    : cart.deliveryCharge
  const { service, delivery } = cartCharges(cart)
  const charges = (totals.taxInclusive ? 0 : totals.tax) + service + delivery
  const taxLabel = totals.taxPercent != null
    ? `${totals.taxInclusive ? 'Tax incl.' : 'Tax'} ${totals.taxPercent}%`
    : (totals.taxInclusive ? 'Tax incl.' : 'Tax')

  return (
    <div className="border-t border-[var(--pos-border)] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-11 items-center gap-2 text-left text-xs text-[var(--pos-muted)]">
          Subtotal {money(totals.subtotal)} · Charges {money(charges)}
          <ChevronDown size={16} className={open ? 'rotate-180' : ''} />
        </button>
        <button type="button" onClick={onMethod} className="h-11 rounded-full border border-[var(--pos-border)] px-4 text-xs font-semibold uppercase tracking-wide active:bg-[#eef3fb]">
          {methodLabel}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ChargeField
          label="Service"
          value={serviceValue}
          onChange={(serviceCharge) => updateCart({ serviceCharge })}
        />
        <ChargeField
          label="Delivery"
          value={deliveryValue}
          onChange={(deliveryCharge) => updateCart({ deliveryCharge })}
        />
      </div>
      {open && (
        <div className="mt-2 space-y-1 text-xs text-[var(--pos-muted)]">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          <Row label="Discount" value={money(totals.discount)} />
          <Row label="Taxable" value={money(totals.taxable ?? Math.max(0, totals.subtotal - totals.discount))} />
          <Row label={taxLabel} value={money(totals.tax)} />
          <Row label="Service" value={money(service)} />
          <Row label="Delivery" value={money(delivery)} />
          <Row label="Total" value={money(totals.total)} />
        </div>
      )}
    </div>
  )
}

function ChargeField({ label, value, onChange }) {
  return (
    <label className="block text-[11px] font-semibold text-[var(--pos-muted)]">
      {label}
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        className="mt-1 h-9 w-full rounded-lg border border-[var(--pos-border)] bg-white px-2 text-sm font-semibold text-[var(--pos-text)] outline-none focus:border-[var(--pos-accent)]"
      />
    </label>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
