import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { employee } from '../data/catalog'
import { summarize, usePos } from '../context/PosContext'
import { greeting, pkr } from '../utils/format'
import CategoryRail from '../components/home/CategoryRail'
import ProductCard from '../components/home/ProductCard'
import SearchBar from '../components/home/SearchBar'
import CartPanel from '../components/home/CartPanel'
import CustomizeModal from '../components/home/CustomizeModal'
import CheckoutModal from '../components/home/CheckoutModal'
import FoodImage from '../components/ui/FoodImage'

export default function HomePage() {
  const { cart, addLine, updateLine, recentIds, products, productById, user } = usePos()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [checkout, setCheckout] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const totals = summarize(cart)
  const featured = products.find((product) => product.featured)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((product) => {
      const inCategory = category === 'all' || product.category === category
      const matches = !q || product.name.toLowerCase().includes(q) || product.code.toLowerCase().includes(q)
      return inCategory && matches
    })
  }, [category, query, products])

  const popular = products.filter((product) => product.popular && product.available)
  const recent = recentIds.map(productById).filter(Boolean)

  const openProduct = (product) => {
    if (!product?.available) return
    setEditor({ product, line: null })
  }

  const editLine = (line) => {
    const product = productById(line.productId)
    if (!product) return
    setEditor({ product, line })
    setCartOpen(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      <CategoryRail active={category} onChange={setCategory} />
      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-28 xl:px-6 xl:pb-6">
        <div className="sticky top-0 z-20 -mx-4 bg-bg/85 px-4 py-3 backdrop-blur xl:-mx-6 xl:px-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">{greeting()}, {(user?.name || employee.name).split(' ')[0]}</p>
              <h1 className="font-display text-2xl leading-none">What are we plating?</h1>
            </div>
          </div>
          <SearchBar products={products} query={query} onQuery={setQuery} onPick={openProduct} />
        </div>

        {featured && category === 'all' && !query && (
          <button type="button" onClick={() => openProduct(featured)} className="relative mt-2 block h-28 w-full overflow-hidden rounded-2xl text-left">
            <FoodImage src={featured.image} alt={featured.name} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Tonight’s signature</p>
              <p className="font-display text-2xl leading-none">{featured.name}</p>
              <p className="mt-2 text-sm text-white/80">{pkr(featured.price)} · {featured.code}</p>
            </div>
          </button>
        )}

        {category === 'all' && !query && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Popular this service</p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {popular.map((product) => (
                <button key={product.id} type="button" onClick={() => openProduct(product)} className="w-32 shrink-0 overflow-hidden rounded-2xl bg-surface text-left shadow-card">
                  <FoodImage src={product.image} alt={product.name} className="h-16 w-full" />
                  <div className="p-3">
                    <p className="truncate text-sm font-extrabold">{product.name}</p>
                    <p className="text-xs font-bold text-orange-500">{pkr(product.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 && !query && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Again</span>
            {recent.map((product) => (
              <button key={product.id} type="button" onClick={() => openProduct(product)} className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold shadow-card">
                {product.name}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 mt-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{query ? 'Matches' : 'The menu'}</h2>
          <span className="text-sm text-muted">{visible.length} dishes</span>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-[28px] bg-surface px-6 py-16 text-center shadow-card">
            <p className="font-display text-3xl">Nothing on this pass</p>
            <p className="mt-1 text-sm text-muted">Try another name or code.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} onOpen={openProduct} />
            ))}
          </div>
        )}
      </section>

      <aside className="hidden h-full w-[320px] shrink-0 xl:block">
        <CartPanel onEdit={editLine} onCheckout={() => setCheckout(true)} />
      </aside>

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-ink px-5 font-extrabold text-white shadow-dock xl:hidden"
      >
        <ShoppingBag size={18} />
        {totals.count} · {pkr(totals.total)}
      </button>

      <AnimatePresence>
        {cartOpen && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setCartOpen(false)} aria-label="Close cart" />
            <div className="absolute inset-y-0 right-0 h-full w-[min(100%,420px)]">
              <CartPanel mobile onClose={() => setCartOpen(false)} onEdit={editLine} onCheckout={() => { setCartOpen(false); setCheckout(true) }} />
            </div>
          </div>
        )}
        {editor && (
          <CustomizeModal
            product={editor.product}
            line={editor.line}
            onClose={() => setEditor(null)}
            onSave={(line) => {
              if (editor.line) updateLine(editor.line.id, line)
              else addLine(line)
              setEditor(null)
            }}
          />
        )}
        {checkout && <CheckoutModal onClose={() => setCheckout(false)} />}
      </AnimatePresence>
    </div>
  )
}
