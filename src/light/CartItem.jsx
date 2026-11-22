import { Pencil } from 'lucide-react'
import DealLines from '../components/ui/DealLines'
import { money } from './money'
import QuantityStepper from './QuantityStepper'

function pkr(value) {
  return `PKR ${money(value)}`
}

function detailRows(line) {
  const choices = Array.isArray(line.choiceDetails) && line.choiceDetails.length
    ? line.choiceDetails
    : (line.choices || []).map((name) => ({ name, price: 0 }))
  const addons = Array.isArray(line.addonDetails) && line.addonDetails.length
    ? line.addonDetails
    : (line.addons || []).map((name) => ({ name, price: 0 }))
  return [...choices, ...addons].filter((row) => row?.name)
}

export default function CartItem({ line, onEdit, onQty, onRemove }) {
  const rows = detailRows(line)
  const shown = line.itemPrice != null ? line.itemPrice * line.qty : line.unitPrice * line.qty

  return (
    <article className="border-b border-[var(--pos-border)] px-3 py-2.5">
      <div className="flex gap-2.5">
        <span className="w-1 shrink-0 self-stretch rounded-full bg-[#6d5efc]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={onEdit} className="min-w-0 text-left text-sm font-bold uppercase leading-5 text-[var(--pos-text)] active:opacity-70">
              {line.name}
              {line.variation ? <span className="font-semibold normal-case text-[#7c3aed]"> ({line.variation})</span> : null}
              <Pencil size={12} className="ml-1 inline text-[var(--pos-muted)]" />
            </button>
            <p className="shrink-0 text-sm font-bold tabular-nums">{pkr(shown)}</p>
          </div>
          {rows.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {rows.map((row, index) => (
                <li key={`${row.name}-${index}`} className="flex items-baseline justify-between gap-3 text-[12px] font-medium uppercase text-[#94a3b8]">
                  <span className="min-w-0 truncate">{row.name}</span>
                  {row.price ? <span className="shrink-0 normal-case">({pkr(row.price)})</span> : null}
                </li>
              ))}
            </ul>
          )}
          <DealLines source={line} className="mt-1 space-y-0.5 text-[11px] text-[#94a3b8]" />
          {line.instructions ? <p className="mt-1 text-[11px] text-[var(--pos-muted)]">{line.instructions}</p> : null}
          <div className="mt-1.5 flex justify-end">
            <QuantityStepper qty={line.qty} onChange={onQty} onRemove={onRemove} />
          </div>
        </div>
      </div>
    </article>
  )
}
