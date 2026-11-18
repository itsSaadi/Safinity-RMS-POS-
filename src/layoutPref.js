import { useEffect, useState } from 'react'

const KEY = 'orra-layout'
const EVENT = 'orra-layout'

export function readLayout() {
  try {
    return sessionStorage.getItem(KEY) === 'light' ? 'light' : 'classic'
  } catch {
    return 'classic'
  }
}

export function writeLayout(layout) {
  const next = layout === 'light' ? 'light' : 'classic'
  sessionStorage.setItem(KEY, next)
  window.dispatchEvent(new Event(EVENT))
}

export function useLayout() {
  const [layout, setLayout] = useState(readLayout)

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
