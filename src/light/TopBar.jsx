import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Bell, ChefHat, ClipboardList, LayoutGrid, LogOut, Maximize2, Minimize2, MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
import { employee, restaurant } from '../data/catalog'
import { usePos } from '../context/PosContext'

export default function TopBar({ onBack, onNew, onOrders, onKitchen, onMore, onShift, onBell, onMenu }) {
  const { user, staff, refreshDesk, refreshing, signOut, branchLabel } = usePos()
  const [full, setFull] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const shiftOpen = staff.some((person) => person.status === 'on')
  const person = user?.name || employee.name || 'Cashier'
  const role = user?.role_name || user?.role || employee.role || 'Staff'
  const initials = person
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  useEffect(() => {
    const onFull = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  useEffect(() => {
    if (!profileOpen) return undefined
    const onDoc = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  const toggleFull = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <header className="relative z-40 flex shrink-0 items-center justify-between gap-3 px-3 py-3">
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
        <Pill icon={ClipboardList} label="Today Orders" onClick={onOrders} />
        <Pill icon={ChefHat} label="Kitchen" onClick={onKitchen} />
        <Pill icon={LayoutGrid} label="More" onClick={onMore} />
        <button type="button" onClick={onShift} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[var(--pos-border)] bg-white/80 px-4 text-sm font-medium active:bg-white">
          <span className={`h-2 w-2 rounded-full ${shiftOpen ? 'bg-[var(--pos-success)]' : 'bg-[var(--pos-muted)]'}`} />
          Shift open
        </button>
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="Account"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((value) => !value)}
            className="flex h-12 items-center gap-2 rounded-full border border-[var(--pos-border)] bg-white/80 py-1 pl-1 pr-3 active:bg-white"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--pos-accent,#1e293b)] text-sm font-bold text-white">
              {initials}
            </span>
            <span className="hidden max-w-[8rem] truncate text-left text-sm font-semibold text-[var(--pos-text)] sm:block">
              {person}
            </span>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,280px)] overflow-hidden rounded-[var(--pos-radius)] border border-[var(--pos-border)] bg-white shadow-[var(--pos-shadow)]"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--pos-accent,#1e293b)] text-base font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--pos-text)]">{person}</p>
                      <p className="truncate text-sm text-[var(--pos-muted)]">{role}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[var(--pos-radius)] bg-[#eef3fb] px-3 py-3 text-sm">
                    <p className="font-semibold text-[var(--pos-text)]">{employee.shift} shift</p>
                    <p className="text-[var(--pos-muted)]">{employee.hours}</p>
                    <p className="mt-1 text-[var(--pos-muted)]">
                      {branchLabel || restaurant.branch}
                      {restaurant.city ? `, ${restaurant.city}` : ''}
                    </p>
                    {user?.email && <p className="mt-1 truncate text-[var(--pos-muted)]">{user.email}</p>}
                    {user?.phone && <p className="mt-0.5 text-[var(--pos-muted)]">{user.phone}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false)
                      await signOut()
                    }}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--pos-radius)] bg-[var(--pos-dark)] text-sm font-semibold text-white active:bg-black"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
