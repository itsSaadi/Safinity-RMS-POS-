import { LayoutGrid } from 'lucide-react'
import { categoryCovers } from '../data/catalog'
import { usePos } from '../context/PosContext'

export default function CategoryChips({ active, onChange }) {
  const { categories } = usePos()

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
      {categories.map((category) => {
        const selected = active === category.id
        const cover = category.image || categoryCovers[category.id]
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium active:scale-[0.98] ${selected ? 'border-[var(--pos-dark)] bg-[var(--pos-dark)] text-white' : 'border-[var(--pos-border)] bg-white text-[var(--pos-text)]'}`}
          >
            {category.id === 'all' || !cover ? (
              <span className={`grid h-7 w-7 place-items-center rounded-full ${selected ? 'bg-white/15' : 'bg-[#eef3fb]'}`}>
                <LayoutGrid size={14} />
              </span>
            ) : (
              <img src={cover} alt="" className="h-7 w-7 rounded-full object-cover" />
            )}
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
