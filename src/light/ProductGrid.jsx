import ProductCard from './ProductCard'

export default function ProductGrid({ products, onAdd }) {
  if (!products.length) {
    return <p className="py-16 text-center text-sm text-[var(--pos-muted)]">No dishes match that search.</p>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  )
}
