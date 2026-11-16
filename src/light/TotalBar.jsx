import { money } from './money'

export default function TotalBar({ total, onPay }) {
  return (
    <button type="button" onClick={onPay} className="mx-3 mb-3 flex h-[72px] items-center justify-between rounded-[var(--pos-radius)] bg-[var(--pos-success)] px-4 text-left text-white active:brightness-95">
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Total</span>
        <span className="text-sm font-medium">Take payment</span>
      </span>
      <span className="text-[28px] font-bold leading-none tabular-nums">{money(total)}</span>
    </button>
  )
}
