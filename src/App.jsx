import { useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes } from 'react-router-dom'
import { restaurant } from './data/catalog'
import { PosProvider, usePos } from './context/PosContext'
import { useLayout } from './layoutPref'
import LightCounter from './light/LightCounter'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'
import KitchenPage from './pages/KitchenPage'
import MorePage from './pages/MorePage'
import RidersPage, { ShiftPage } from './pages/PeoplePages'
import { CashPage, ExpensesPage, StatsPage } from './pages/DeskPages'
import SettingsPage from './pages/SettingsPage'
import CollectPayment from './components/orders/CollectPayment'
import BootLoader from './components/ui/BootLoader'
import PasswordField from './components/ui/PasswordField'

function ShiftGate() {
  const { user, booting, signIn, deskError, branches, branchId, selectBranch, can } = usePos()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  if (booting) {
    return <BootLoader />
  }
  if (user) {
    return (
      <>
        {deskError && (
          <div className="fixed inset-x-0 top-0 z-[90] bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
            {deskError}
          </div>
        )}
        {branches.length > 1 && can('branch:read') && (
          <div className="fixed bottom-20 right-4 z-[60] lg:bottom-4">
            <select
              value={branchId}
              onChange={(event) => selectBranch(event.target.value)}
              className="h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold shadow-card"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name || branch.label}</option>
              ))}
            </select>
          </div>
        )}
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<CounterPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="kitchen" element={<KitchenPage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="history" element={<OrdersPage source="history" />} />
            <Route path="riders" element={<RidersPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="shifts" element={<ShiftPage />} />
            <Route path="cash" element={<CashPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </>
    )
  }
  return (
    <div className="grid h-dvh place-items-center bg-bg px-6">
      <div className="w-full max-w-sm rounded-3xl bg-surface px-6 py-8 text-center shadow-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 font-display text-2xl text-white">O</span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">{restaurant.name}</p>
        <h1 className="mt-2 font-display text-3xl leading-none">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Use your RMS account. Menu loads from the live API.</p>
        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 h-12 w-full rounded-2xl border border-line bg-bg px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none" />
          </label>
          <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="h-12 w-full rounded-2xl bg-orange-500 text-sm font-extrabold text-white disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function CounterPage() {
  const layout = useLayout()
  return (
    <>
      {layout === 'light' ? <LightCounter /> : <HomePage />}
      <CollectPayment />
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PosProvider>
        <ShiftGate />
      </PosProvider>
    </MotionConfig>
  )
}
