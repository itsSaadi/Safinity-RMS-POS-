import { useEffect, useState } from 'react'

const KEY = 'orra-layout'
const EVENT = 'orra-layout'

export function applyLayoutClass(layout) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('theme-blue', layout === 'light')
}

export function readLayout() {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored === 'classic' || stored === 'light') return stored
    return 'light'
  } catch {
    return 'light'
  }
}

export function writeLayout(layout) {
  const next = layout === 'light' ? 'light' : 'classic'
  sessionStorage.setItem(KEY, next)
  applyLayoutClass(next)
  window.dispatchEvent(new Event(EVENT))
}

export function useLayout() {
  const [layout, setLayout] = useState(readLayout)

  useEffect(() => {
    applyLayoutClass(layout)
  }, [layout])

  useEffect(() => {
    const sync = () => setLayout(readLayout())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return layout
}

applyLayoutClass(readLayout())
