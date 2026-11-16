export default function Chip({ active, compact = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center rounded-full border font-semibold tracking-wide active:scale-[0.98] ${compact ? 'h-8 gap-1 px-2.5 text-[11px]' : 'h-11 gap-2 px-4 text-xs'} ${active ? 'border-[var(--pos-dark)] bg-[var(--pos-dark)] text-white' : 'border-[var(--pos-border)] bg-white/90 text-[var(--pos-text)]'} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
