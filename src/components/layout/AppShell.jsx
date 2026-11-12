import { Outlet } from 'react-router-dom'
import TopBar, { BottomNav } from './TopBar'
import Toaster from '../ui/Toaster'

export default function AppShell() {
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
