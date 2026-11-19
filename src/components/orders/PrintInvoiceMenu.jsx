import { useEffect, useRef, useState } from 'react'
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
}) {
  const { user, branchLabel, toast } = usePos()
  const [open, setOpen] = useState(autoOpen)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const run = (type) => {
    try {
      printInvoice(type, order, {
        user,
        branchLabel,
        restaurant: user?.restaurant || {},
      })
      onPrinted?.(type)
      setOpen(false)
    } catch (error) {
      toast(error.message || 'Could not print', 'bad')
    }
  }

  return (
    <div ref={root} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label || 'Print invoice'}
        onClick={() => setOpen((value) => !value)}
        className={buttonClassName || 'grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink shadow-sm'}
      >
        {label ? <span className="inline-flex items-center gap-2"><Printer size={15} />{label}</span> : <Printer size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-line bg-surface shadow-dock">
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
        </div>
      )}
    </div>
  )
}
