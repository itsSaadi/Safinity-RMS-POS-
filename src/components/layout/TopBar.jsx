import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bell, ChefHat, ClipboardList, Home, LayoutGrid, LogOut, MapPin, Maximize2, Minimize2, Moon, RefreshCw, Sun, Wifi } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { employee, restaurant } from '../../data/catalog'
import { notifications } from '../../data/seed'
import { usePos } from '../../context/PosContext'
import { useLayout } from '../../layoutPref'
import { formatClock, formatDate } from '../../utils/format'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/orders', label: 'Today Orders', icon: ClipboardList },
  { to: '/kitchen', label: 'Kitchen', icon: ChefHat },
  { to: '/more', label: 'More', icon: LayoutGrid },
]

const morePaths = ['/more', '/history', '/riders', '/stats', '/expenses', '/shifts', '/cash', '/settings']

function linkActive(path, link) {
  if (link.to === '/more') return morePaths.includes(path)
  if (link.end) return path === '/'
  return path === link.to
}

export default function TopBar() {
  const { theme, setTheme, signOut, user, branchLabel, refreshDesk, refreshing } = usePos()
  const lightBar = useLayout() === 'light' && theme !== 'dark'
  const person = user?.name || employee.name
  const role = user?.role_name || employee.role
  const initials = person.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const location = useLocation()
  const [now, setNow] = useState(new Date())
  const [full, setFull] = useState(false)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    const onFull = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFull)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('fullscreenchange', onFull)
    }
  }, [])

  const toggleFull = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  return (
    <header className={`relative z-40 grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:px-4 ${lightBar ? 'border-b border-line bg-white/85 text-ink backdrop-blur-md' : 'bg-nav text-white'}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-display text-xl text-white">O</span>
        <div className="leading-tight">
          <p className="font-display text-lg tracking-tight">{restaurant.name}</p>
          <p className={`text-[10px] uppercase tracking-[0.22em] ${lightBar ? 'text-muted' : 'text-white/45'}`}>Restaurant POS</p>
        </div>
        <div className={`ml-1 hidden items-center gap-2 rounded-full px-3 py-2 text-sm lg:flex ${lightBar ? 'border border-line bg-white text-ink' : 'bg-white/8 text-white/80'}`}>
          <MapPin size={15} className={lightBar ? 'text-orange-600' : 'text-orange-400'} />
          {branchLabel || restaurant.branch}
        </div>
      </div>

      <nav className="hidden items-center justify-self-center gap-1 rounded-full bg-white/5 p-1 lg:flex">
        {links.map((link) => {
          const isActive = linkActive(location.pathname, link)
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'text-white' : lightBar ? 'text-muted hover:text-ink' : 'text-white/65 hover:text-white'}`}
            >
              {isActive && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-orange-500" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <link.icon size={16} className="relative" />
              <span className="relative">{link.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="flex items-center justify-self-end gap-1.5 md:gap-2">
        <div className="hidden text-right xl:block">
          <p className="text-sm font-semibold">{formatClock(now)}</p>
          <p className={`text-[11px] ${lightBar ? 'text-muted' : 'text-white/50'}`}>{formatDate(now)}</p>
        </div>
        <span className={`hidden rounded-full px-3 py-1.5 text-xs font-bold md:inline-flex ${lightBar ? 'bg-orange-500/10 text-orange-700' : 'bg-orange-500/15 text-orange-300'}`}>
          {employee.shift} shift
        </span>
        <span className="hidden items-center gap-2 rounded-full px-2 text-xs font-semibold text-emerald-300 md:inline-flex">
          <Wifi size={15} />
          Ready
        </span>
        <IconButton light={lightBar} label="Refresh menu" onClick={() => refreshDesk()} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </IconButton>
        <IconButton light={lightBar} label="Notifications" onClick={() => setOpen(open === 'bell' ? null : 'bell')}>
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
        </IconButton>
        <IconButton light={lightBar} label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFull}>
          {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </IconButton>
        <IconButton light={lightBar} label="Theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
        <button type="button" onClick={() => setOpen(open === 'profile' ? null : 'profile')} className={`ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ${lightBar ? 'border border-line bg-white' : 'bg-white/8'}`}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-sm font-bold">{initials}</span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold">{person}</span>
            <span className={`block text-[11px] ${lightBar ? 'text-muted' : 'text-white/50'}`}>{role}</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open === 'bell' && (
          <Panel onClose={() => setOpen(null)}>
            <p className="px-4 pb-2 pt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">Notifications</p>
            {notifications.map((note) => (
              <div key={note.id} className="border-t border-line px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">{note.title}</p>
                  <span className="text-[11px] text-muted">{note.time}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{note.body}</p>
              </div>
            ))}
          </Panel>
        )}
        {open === 'profile' && (
          <Panel onClose={() => setOpen(null)}>
            <div className="p-4">
              <p className="font-display text-2xl">{person}</p>
              <p className="text-sm text-muted">{role} · {restaurant.counter}</p>
              <div className="mt-4 rounded-2xl bg-soft px-4 py-3 text-sm">
                <p className="font-semibold">{employee.shift} shift</p>
                <p className="text-muted">{employee.hours}</p>
                <p className="mt-1 text-muted">{branchLabel || restaurant.branch}, {restaurant.city}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setOpen(null)
                  await signOut()
                }}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-nav text-sm font-extrabold text-white"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </header>
  )
}

function IconButton({ children, label, onClick, disabled, light }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={`relative grid h-9 w-9 place-items-center rounded-full disabled:opacity-50 ${light ? 'text-ink/80 hover:bg-soft' : 'text-white/85 hover:bg-white/10'}`}>
      {children}
    </button>
  )
}

function Panel({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute right-4 top-12 w-[min(92vw,320px)] overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-dock"
    >
      {children}
      <button type="button" onClick={onClose} className="w-full border-t border-line py-3 text-sm font-semibold text-muted">
        Close
      </button>
    </motion.div>
  )
}

export function BottomNav() {
  const location = useLocation()
  const { theme } = usePos()
  const lightBar = useLayout() === 'light' && theme !== 'dark'
  return (
    <nav className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 px-2 py-2 lg:hidden ${lightBar ? 'border-t border-line bg-white/95 text-ink backdrop-blur' : 'border-t border-white/10 bg-nav text-white'}`}>
      {links.map((link) => {
        const isActive = linkActive(location.pathname, link)
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-semibold ${isActive ? (lightBar ? 'text-orange-600' : 'text-orange-400') : lightBar ? 'text-muted' : 'text-white/60'}`}
          >
            <link.icon size={18} />
            {link.label === 'Today Orders' ? 'Orders' : link.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
