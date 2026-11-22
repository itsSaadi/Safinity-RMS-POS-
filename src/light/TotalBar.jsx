import { Banknote, Clock3, Save, X } from 'lucide-react'
import { money } from './money'

export default function TotalBar({ total, onPayNow, onPayLater, editing, onSaveEdit, onCancelEdit }) {
  return (
    <div className="mx-3 mb-2 space-y-1.5">
      <div className="flex items-end justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pos-muted)]">Total</span>
        <span className="text-[22px] font-bold leading-none tabular-nums text-[var(--pos-text)]">{money(total)}</span>
      </div>
      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--pos-border)] bg-[#f8fafc] px-2 text-xs font-semibold text-[var(--pos-text)] active:bg-[#eef3fb]"
          >
            <X size={15} className="shrink-0 text-[var(--pos-muted)]" />
            Cancel edit
          </button>
          <button
            type="button"
            onClick={onSaveEdit}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#fff4d6] px-2 text-xs font-semibold text-[#b45309] active:brightness-95"
          >
            <Save size={15} className="shrink-0" />
            Save changes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPayLater}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--pos-border)] bg-[#f8fafc] px-2 text-xs font-semibold text-[var(--pos-text)] active:bg-[#eef3fb]"
          >
            <Clock3 size={15} className="shrink-0 text-[var(--pos-muted)]" />
            Pay later
          </button>
          <button
            type="button"
            onClick={onPayNow}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--pos-success)] px-2 text-xs font-semibold text-white active:brightness-95"
          >
            <Banknote size={15} className="shrink-0" />
            Pay now
          </button>
        </div>
      )}
    </div>
  )
}
