import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { money } from './money'

export default function OrderSummary({ totals, methodLabel, onMethod }) {
  const [open, setOpen] = useState(false)
  const charges = totals.taxInclusive ? totals.delivery : totals.tax + totals.delivery
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
      {open && (
        <div className="mt-2 space-y-1 text-xs text-[var(--pos-muted)]">
          <Row label="Subtotal" value={money(totals.subtotal)} />
          <Row label="Discount" value={money(totals.discount)} />
          <Row label="Taxable" value={money(totals.taxable ?? Math.max(0, totals.subtotal - totals.discount))} />
          <Row label={taxLabel} value={money(totals.tax)} />
          <Row label="Service / delivery" value={money(totals.delivery)} />
          <Row label="Total" value={money(totals.total)} />
        </div>
      )}
    </div>
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
