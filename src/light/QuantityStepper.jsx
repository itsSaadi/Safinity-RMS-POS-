import { Plus, Trash2 } from 'lucide-react'

export default function QuantityStepper({ qty, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Remove one"
        onClick={() => (qty <= 1 ? onRemove() : onChange(qty - 1))}
        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--pos-border)] bg-white text-[var(--pos-danger)] active:bg-red-50"
      >
        <Trash2 size={14} />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Add one"
        onClick={() => onChange(qty + 1)}
        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--pos-border)] bg-white text-[var(--pos-text)] active:bg-[#eef3fb]"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
