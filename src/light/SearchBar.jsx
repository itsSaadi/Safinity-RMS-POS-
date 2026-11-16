import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

export default function SearchBar({ query, onQuery, onSubmit }) {
  const input = useRef(null)

  useEffect(() => {
    input.current?.focus()
  }, [])

  return (
    <label className="relative block w-full max-w-md">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pos-muted)]" />
      <input
        ref={input}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onSubmit()
          }
        }}
        placeholder="Search or scan a barcode"
        className="h-12 w-full rounded-full border border-[var(--pos-border)] bg-white/90 pl-11 pr-4 text-sm outline-none focus:border-[var(--pos-accent)]"
      />
    </label>
  )
}
