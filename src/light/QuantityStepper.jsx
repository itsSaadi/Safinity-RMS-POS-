import { Plus, Trash2 } from 'lucide-react'

export default function QuantityStepper({ qty, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Remove one"
        onClick={() => (qty <= 1 ? onRemove() : onChange(qty - 1))}
        className="grid h-12 w-12 place-items-center rounded-[var(--pos-radius)] border border-[var(--pos-border)] text-[var(--pos-danger)] active:bg-red-50"
      >
        <Trash2 size={18} />
      </button>
      <span className="w-8 text-center text-base font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Add one"
        onClick={() => onChange(qty + 1)}
        className="grid h-12 w-12 place-items-center rounded-[var(--pos-radius)] border border-[var(--pos-border)] text-[var(--pos-text)] active:bg-[#eef3fb]"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
