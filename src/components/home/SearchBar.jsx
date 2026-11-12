import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { pkr } from '../../utils/format'

export default function SearchBar({ products, query, onQuery, onPick }) {
  const [focused, setFocused] = useState(false)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? products.filter((product) => product.name.toLowerCase().includes(q) || product.code.toLowerCase().includes(q))
      : products.filter((product) => product.popular)
    return pool.slice(0, 5)
  }, [products, query])

  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 160)}
        placeholder="Search a dish or code"
        className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-12 text-sm font-semibold shadow-card outline-none focus:border-orange-400"
      />
      {query && (
        <button type="button" aria-label="Clear search" onClick={() => onQuery('')} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-soft text-ink">
          <X size={16} />
        </button>
      )}
      {focused && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-dock">
          {suggestions.map((product) => (
            <button
              key={product.id}
              type="button"
              onMouseDown={() => onPick(product)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-soft"
            >
              <span>
                <span className="block text-sm font-bold">{product.name}</span>
                <span className="text-xs text-muted">{product.code}</span>
              </span>
              <span className="text-sm font-extrabold">{pkr(product.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
