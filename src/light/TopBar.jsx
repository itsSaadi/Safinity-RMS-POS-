import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, Clock3, History, Maximize2, Minimize2, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { usePos } from '../context/PosContext'

export default function TopBar({ onBack, onNew, onHistory, onPending, onClear, onShift, onBell, onMenu }) {
  const { user, staff, refreshDesk, refreshing } = usePos()
  const [full, setFull] = useState(false)
  const shiftOpen = staff.some((person) => person.status === 'on')

  useEffect(() => {
    const onFull = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  const toggleFull = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Back" onClick={onBack} className="grid h-12 w-12 place-items-center rounded-full border border-[var(--pos-border)] bg-white/80 text-[var(--pos-text)] active:bg-white">
          <ArrowLeft size={18} />
        </button>
        <button type="button" onClick={onNew} className="inline-flex h-12 items-center gap-2 rounded-[var(--pos-radius)] bg-[var(--pos-dark)] px-4 text-sm font-semibold text-white active:bg-black">
          <Plus size={16} />
          New Order
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          aria-label="Refresh menu"
          disabled={refreshing}
          onClick={() => refreshDesk()}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[var(--pos-border)] bg-white/80 px-4 text-sm font-medium active:bg-white disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
        <Pill icon={History} label="History" onClick={onHistory} />
        <Pill icon={Clock3} label="Pending" onClick={onPending} />
        <Pill icon={Trash2} label="Clear" onClick={onClear} />
        <button type="button" onClick={onShift} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[var(--pos-border)] bg-white/80 px-4 text-sm font-medium active:bg-white">
          <span className={`h-2 w-2 rounded-full ${shiftOpen ? 'bg-[var(--pos-success)]' : 'bg-[var(--pos-muted)]'}`} />
          Shift open
        </button>
        <span className="hidden shrink-0 px-1 text-sm font-medium text-[var(--pos-text)] sm:inline">{user?.name || 'Cashier'}</span>
        <button type="button" aria-label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFull} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--pos-border)] bg-white/80 active:bg-white">
          {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button type="button" aria-label="Notifications" onClick={onBell} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--pos-border)] bg-white/80 active:bg-white">
          <Bell size={16} />
        </button>
        <button type="button" aria-label="More" onClick={onMenu} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--pos-border)] bg-white/80 active:bg-white">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </header>
  )
}

function Pill({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[var(--pos-border)] bg-white/80 px-4 text-sm font-medium active:bg-white">
      <Icon size={15} />
      {label}
    </button>
  )
}
