import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePos } from '../../context/PosContext'

export default function Toaster() {
  const { toasts, dismissToast } = usePos()

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-dock"
          >
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toast.tone === 'bad' ? 'bg-red-500' : toast.tone === 'warn' ? 'bg-amber-500' : 'bg-orange-500'}`} />
            <p className="flex-1 text-sm font-semibold text-ink">{toast.message}</p>
            <button type="button" onClick={() => dismissToast(toast.id)} className="text-muted" aria-label="Dismiss">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
