import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { categoryName } from '../../data/catalog'
import { pkr } from '../../utils/format'
import FoodImage from '../ui/FoodImage'

export default function ProductCard({ product, onOpen }) {
  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card"
    >
      <button type="button" onClick={() => product.available && onOpen(product)} className="relative block text-left" disabled={!product.available}>
        <FoodImage src={product.image} alt={product.name} className="aspect-[5/3] transition duration-500 group-hover:scale-[1.03]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${product.available ? 'bg-white/90 text-good' : 'bg-ink/80 text-white'}`}>
          {product.available ? 'Available' : 'Sold out'}
        </span>
        <span className="absolute bottom-2 left-2 rounded-full bg-cream/95 px-2 py-0.5 text-xs font-extrabold text-ink">{pkr(product.price)}</span>
      </button>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{product.categoryName || categoryName(product.category)}</p>
          <h3 className="truncate text-sm font-extrabold leading-tight">{product.name}</h3>
          <p className="truncate text-[11px] text-muted">{product.code}</p>
        </div>
        <button
          type="button"
          aria-label={`Add ${product.name}`}
          disabled={!product.available}
          onClick={() => onOpen(product)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition enabled:hover:bg-orange-500 disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </motion.article>
  )
}
