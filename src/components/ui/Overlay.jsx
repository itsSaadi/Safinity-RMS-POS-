import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function Overlay({ children, onClose, className = '' }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#111827]/55 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22 }}
        className={`relative z-10 max-h-[94vh] w-full overflow-hidden bg-surface shadow-dock ${className}`}
      >
        {children}
      </motion.div>
    </div>
  )
}
