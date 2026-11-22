import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'

function priceLabel(price) {
  const amount = Number(price) || 0
  if (!amount) return ''
  return `(${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
}

export default function ChoicePicker({ title, hint, required = false, options = [], selected = [], onToggle }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="rounded-2xl border border-dashed border-[#d5dbe8] bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-[#6d5efc]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-tight text-[#0f172a]">{title}</h3>
          <p className="mt-0.5 text-[13px] leading-5 text-[#64748b]">
            {hint}
            {required ? <span className="ml-2 font-semibold text-[#ef4444]">Required</span> : null}
          </p>
        </div>
        <button
          type="button"
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => setOpen((value) => !value)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9]"
        >
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {options.map((option) => {
            const active = selected.includes(String(option.id))
            const price = priceLabel(option.price)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(option.id)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition active:scale-[0.99] ${active ? 'bg-[#e4e7ff] ring-1 ring-[#6d5efc]/35' : 'bg-[#eef0f8] hover:bg-[#e7eaf6]'}`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border ${active ? 'border-[#6d5efc] bg-[#6d5efc] text-white' : 'border-[#c5cad8] bg-white'}`}>
                  {active ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold uppercase tracking-wide text-[#1e293b]">{option.name}</span>
                  {price ? <span className="block text-[11px] font-medium leading-4 text-[#64748b]">{price}</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
