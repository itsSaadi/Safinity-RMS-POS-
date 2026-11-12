import { LayoutGrid } from 'lucide-react'
import { usePos } from '../../context/PosContext'
import FoodImage from '../ui/FoodImage'

const covers = [
  ['burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=70'],
  ['pizza', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=300&q=70'],
  ['drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=70'],
  ['beverage', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=70'],
  ['dessert', 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=300&q=70'],
  ['sweet', 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=300&q=70'],
  ['deal', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=70'],
  ['grill', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=70'],
  ['starter', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&q=70'],
  ['coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=300&q=70'],
]

function coverFor(name) {
  const key = String(name || '').toLowerCase()
  return covers.find(([word]) => key.includes(word))?.[1] || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=300&q=70'
}

export default function CategoryRail({ active, onChange }) {
  const { categories, products } = usePos()
  return (
    <>
      <aside className="hidden h-full w-[118px] shrink-0 flex-col gap-1 overflow-y-auto bg-[#1F2937] py-3 xl:flex">
        {categories.map((category) => (
          <RailButton key={category.id} category={category} products={products} active={active === category.id} onClick={() => onChange(category.id)} />
        ))}
      </aside>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 xl:hidden">
        {categories.map((category) => {
          const count = category.id === 'all' ? products.length : products.filter((item) => item.category === category.id).length
          const selected = active === category.id
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${selected ? 'bg-orange-500 text-white' : 'bg-surface text-ink'}`}
            >
              {category.name}
              <span className="ml-2 text-xs opacity-70">{count}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function RailButton({ category, products, active, onClick }) {
  const count = category.id === 'all' ? products.length : products.filter((item) => item.category === category.id).length
  return (
    <button type="button" onClick={onClick} className={`relative mx-2 flex flex-col items-center gap-1 rounded-3xl px-2 py-2.5 ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}>
      {active && <span className="absolute bottom-4 left-0 top-4 w-1 rounded-full bg-orange-500" />}
      {category.id === 'all' ? (
        <span className="grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white">
          <LayoutGrid size={20} />
        </span>
      ) : (
        <FoodImage src={coverFor(category.name)} alt={category.name} className="h-14 w-14 rounded-full" />
      )}
      <span className="text-[12px] font-bold text-white">{category.name}</span>
      <span className="text-[10px] font-semibold text-white/40">{count}</span>
    </button>
  )
}
