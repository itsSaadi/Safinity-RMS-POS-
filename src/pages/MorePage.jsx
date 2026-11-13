import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Bike, Clock3, Landmark, Receipt, Wallet } from 'lucide-react'
import { usePos } from '../context/PosContext'
import { pkr } from '../utils/format'

const tiles = [
  { to: '/history', title: 'Order history', copy: 'Tickets from earlier services, with the same detail as today.', icon: Receipt, span: 'md:col-span-2' },
  { to: '/riders', title: 'Riders', copy: 'Who is free, and who is already out.', icon: Bike },
  { to: '/stats', title: 'Stats', copy: 'Pace, mix, and what the floor is selling.', icon: BarChart3 },
  { to: '/expenses', title: 'Expenses', copy: 'Drawer payouts recorded during the shift.', icon: Wallet },
  { to: '/shifts', title: 'Shift management', copy: 'Who is on the floor, and who is on a break.', icon: Clock3 },
  { to: '/cash', title: 'Cash closing', copy: 'Count the drawer against expected cash.', icon: Landmark },
]

export default function MorePage() {
  const { orders } = usePos()
  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Counter tools</p>
      <h1 className="font-display text-3xl leading-none">More</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Everything around the pass: history, riders, the drawer, and the people on this shift. {orders.length} tickets are open in today’s book.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.to} to={tile.to} className={`group flex min-h-28 flex-col justify-between rounded-2xl bg-surface p-4 shadow-card ${tile.span || ''}`}>
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-white">
                <tile.icon size={20} />
              </span>
              <ArrowUpRight className="text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">{tile.title}</h2>
              <p className="mt-1 text-sm text-muted">{tile.copy}</p>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Latest ticket {orders[0] ? `${orders[0].id} · ${pkr(orders[0].amount)}` : 'none yet'}.</p>
    </div>
  )
}
