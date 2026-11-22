const tones = {
  paid: 'bg-[#16a34a] text-white',
  unpaid: 'bg-amber-500/15 text-warn',
  partial: 'bg-amber-500/15 text-warn',
  credit: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  new: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  preparing: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  ready: 'bg-good/15 text-good',
  dispatched: 'bg-ink/10 text-ink',
  free: 'bg-good/15 text-good',
  out: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  on: 'bg-good/15 text-good',
  break: 'bg-amber-500/15 text-warn',
}

export default function Badge({ tone = 'new', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones[tone] || tones.new}`}>
      {children}
    </span>
  )
}
