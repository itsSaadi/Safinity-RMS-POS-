import { Banknote, Clock3, Save, X } from 'lucide-react'
import { money } from './money'

export default function TotalBar({ total, onPayNow, onPayLater, editing, onSaveEdit, onCancelEdit }) {
  return (
    <div className="mx-3 mb-3 space-y-2">
      <div className="flex items-end justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pos-muted)]">Total</span>
        <span className="text-[26px] font-bold leading-none tabular-nums text-[var(--pos-text)]">{money(total)}</span>
      </div>
      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white px-3 text-sm font-semibold text-[var(--pos-text)] active:bg-[#eef3fb]"
          >
            <X size={18} className="shrink-0 text-[var(--pos-muted)]" />
            Cancel edit
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[var(--pos-radius)] bg-[var(--pos-accent,#1e293b)] px-3 text-sm font-semibold text-white active:brightness-95"
          >
            <Save size={18} className="shrink-0" />
            Save changes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPayLater}
            className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white px-3 text-sm font-semibold text-[var(--pos-text)] active:bg-[#eef3fb]"
          >
            <Clock3 size={18} className="shrink-0 text-[var(--pos-muted)]" />
            Pay later
          </button>
          <button
            type="button"
            onClick={onPayNow}
            className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[var(--pos-radius)] bg-[var(--pos-success)] px-3 text-sm font-semibold text-white active:brightness-95"
          >
            <Banknote size={18} className="shrink-0" />
            Pay now
          </button>
        </div>
      )}
    </div>
  )
}
