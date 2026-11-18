import { Link } from 'react-router-dom'
import { BarChart3, Bike, Clock3, Landmark, Receipt, Settings, Wallet } from 'lucide-react'
import { usePos } from '../context/PosContext'
import { orderLabel, pkr } from '../utils/format'

const tiles = [
  { to: '/history', title: 'History', copy: 'Earlier tickets', icon: Receipt },
  { to: '/riders', title: 'Riders', copy: 'Who is out', icon: Bike },
  { to: '/stats', title: 'Stats', copy: 'This service', icon: BarChart3 },
  { to: '/expenses', title: 'Expenses', copy: 'Drawer payouts', icon: Wallet },
  { to: '/shifts', title: 'Shifts', copy: 'Floor and breaks', icon: Clock3 },
  { to: '/cash', title: 'Cash closing', copy: 'Count the drawer', icon: Landmark },
  { to: '/settings', title: 'Layout', copy: 'Classic or light', icon: Settings },
]

export default function MorePage() {
  const { orders } = usePos()
  const latest = orders[0]

  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-24 md:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Counter</p>
          <h1 className="mt-1 text-xl font-semibold leading-none">More</h1>
        </div>
        <p className="text-right text-xs text-muted">
          {orders.length} open
          <span className="mt-0.5 block">{latest ? `${orderLabel(latest)} · ${pkr(latest.amount)}` : 'No ticket yet'}</span>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="flex min-h-14 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-500">
              <tile.icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{tile.title}</span>
              <span className="block truncate text-[11px] text-muted">{tile.copy}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
