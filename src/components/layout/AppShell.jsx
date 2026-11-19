import { Outlet } from 'react-router-dom'
import { useLayout } from '../../layoutPref'
import TopBar, { BottomNav } from './TopBar'
import Toaster from '../ui/Toaster'

export default function AppShell() {
  const layout = useLayout()
  // Light (blue) layout keeps the same Home / Orders / Kitchen / More chrome.
  return (
    <div className={`flex h-dvh flex-col overflow-hidden ${layout === 'light' ? 'pos-light-shell' : ''}`}>
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
