import { Outlet, useLocation } from 'react-router-dom'
import { useLayout } from '../../layoutPref'
import TopBar, { BottomNav } from './TopBar'
import Toaster from '../ui/Toaster'

export default function AppShell() {
  const layout = useLayout()
  const { pathname } = useLocation()
  if (layout === 'light' && pathname === '/') {
    return (
      <div className="h-dvh overflow-hidden">
        <Outlet />
        <Toaster />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <Toaster />
    </div>
  )
}
