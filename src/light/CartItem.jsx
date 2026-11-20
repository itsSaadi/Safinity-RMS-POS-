import { Pencil } from 'lucide-react'
import { lineMeta } from '../utils/format'
import { money } from './money'
import DealLines from '../components/ui/DealLines'
import QuantityStepper from './QuantityStepper'

export default function CartItem({ line, onEdit, onQty, onRemove }) {
  const note = lineMeta(line)
  return (
    <article className="border-b border-[var(--pos-border)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex min-h-11 items-center gap-2 text-left text-base font-medium active:opacity-70">
          {line.name}
          <Pencil size={14} className="text-[var(--pos-muted)]" />
        </button>
        <p className="pt-2 text-base font-bold tabular-nums">{money(line.unitPrice * line.qty)}</p>
      </div>
      <DealLines source={line} className="mt-1 space-y-0.5 text-xs text-[var(--pos-muted)]" />
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-[var(--pos-muted)]">
          {note || 'Standard'}
          <span className="mx-1">·</span>
          {money(line.unitPrice)} each
          {line.instructions ? <span className="mt-0.5 block">{line.instructions}</span> : null}
        </p>
        <QuantityStepper qty={line.qty} onChange={onQty} onRemove={onRemove} />
      </div>
    </article>
  )
}
