import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { money } from './money'

export default function ProductCard({ product, onAdd }) {
  const [failed, setFailed] = useState(false)
  const showImage = product.image && !failed

  return (
    <button
      type="button"
      disabled={!product.available}
      onClick={() => onAdd(product)}
      className="flex flex-col overflow-hidden rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white text-center shadow-[var(--pos-shadow)] active:scale-[0.98] active:border-[var(--pos-dark)] disabled:opacity-50"
    >
      <span className="grid h-[72px] w-full place-items-center bg-[var(--pos-bg-from)]">
        {showImage ? (
          <img src={product.image} alt="" onError={() => setFailed(true)} className="h-12 w-12 object-contain" />
        ) : (
          <UtensilsCrossed className="text-[var(--pos-muted)]" size={20} />
        )}
      </span>
      <span className="line-clamp-2 px-2 pt-1.5 text-xs font-medium leading-4">{product.name}</span>
      <span className="px-2 pb-2 pt-0.5 text-sm font-bold tabular-nums">{money(product.price)}</span>
      {!product.available && <span className="px-2 pb-2 text-[11px] text-[var(--pos-danger)]">Sold out</span>}
    </button>
  )
}
