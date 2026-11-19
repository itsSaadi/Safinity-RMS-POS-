import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { usePos } from '../../context/PosContext'
import { INVOICE_TYPES, printInvoice } from '../../utils/printInvoice'

export default function PrintInvoiceMenu({
  order,
  className = '',
  buttonClassName = '',
  label,
  autoOpen = false,
  onPrinted,
  onOpenChange,
}) {
  const { user, branchLabel, toast } = usePos()
  const [open, setOpen] = useState(autoOpen)
  const [coords, setCoords] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const setMenuOpen = (next) => {
    const value = typeof next === 'function' ? next(open) : next
    setOpen(value)
    onOpenChange?.(value)
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null)
      return undefined
    }
    const place = () => {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = 180
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8)
      const below = rect.bottom + 8
      const estimatedHeight = 44 * INVOICE_TYPES.length
      const top = below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below
      setCoords({ top, left, width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (type) => {
    try {
      printInvoice(type, order, {
        user,
        branchLabel,
        restaurant: user?.restaurant || {},
      })
      onPrinted?.(type)
      setMenuOpen(false)
    } catch (error) {
      toast(error.message || 'Could not print', 'bad')
    }
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label || 'Print invoice'}
        aria-expanded={open}
        onClick={() => setMenuOpen((value) => !value)}
        className={buttonClassName || 'grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm'}
      >
        {label ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Printer size={15} className="shrink-0" />
            <span className="truncate">{label}</span>
          </span>
        ) : (
          <Printer size={16} />
        )}
      </button>
      {open && coords && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          className="z-[80] overflow-hidden rounded-2xl border border-line bg-surface shadow-dock"
        >
          {INVOICE_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => run(item.id)}
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-soft"
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
