import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, wide = false }) {
  const card = useRef(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const node = card.current
    const focusable = () => [...node.querySelectorAll('button, input, select, textarea, a[href]')]
      .filter((item) => !item.disabled)
    focusable()[0]?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="pos-fade absolute inset-0 bg-[#0f172a]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pos-pop relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white shadow-[var(--pos-shadow)] ${wide ? 'max-w-[720px]' : 'max-w-[480px]'}`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold text-[var(--pos-text)]">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-[var(--pos-muted)] active:bg-[#eef3fb]">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[var(--pos-border)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
