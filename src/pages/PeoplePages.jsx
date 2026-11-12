import { useState } from 'react'
import { usePos } from '../context/PosContext'
import DeskHeader from '../components/layout/DeskHeader'

const statuses = [
  { id: 'free', label: 'Free' },
  { id: 'out', label: 'On delivery' },
]

export default function RidersPage() {
  const { riders, setRiderStatus, orders } = usePos()
  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <DeskHeader kicker="More" title="Riders" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {riders.map((rider) => {
          const jobs = orders.filter((order) => order.rider === rider.name && order.prepStatus !== 'dispatched').length
          return (
            <article key={rider.id} className="rounded-[28px] bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold">{rider.name}</h2>
                  <p className="text-sm text-muted">{rider.vehicle}</p>
                  <p className="text-sm text-muted">{rider.phone}</p>
                </div>
                <span className="rounded-full bg-soft px-3 py-1 text-xs font-bold">{jobs} active</span>
              </div>
              <div className="mt-4 flex gap-2">
                {statuses.map((status) => (
                  <button key={status.id} type="button" onClick={() => setRiderStatus(rider.id, status.id)} className={`h-11 flex-1 rounded-2xl text-sm font-bold ${rider.status === status.id ? 'bg-ink text-white' : 'bg-soft'}`}>
                    {status.label}
                  </button>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function ShiftPage() {
  const { staff, setStaffStatus } = usePos()
  const [query, setQuery] = useState('')
  const visible = staff.filter((person) => person.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <DeskHeader kicker="More" title="Shift" action={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a name" className="h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold" />} />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((person) => (
          <article key={person.id} className="rounded-[28px] bg-surface p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{person.station}</p>
            <h2 className="text-2xl font-extrabold">{person.name}</h2>
            <p className="text-sm text-muted">{person.role}</p>
            <div className="mt-4 flex gap-2">
              {['on', 'break'].map((status) => (
                <button key={status} type="button" onClick={() => setStaffStatus(person.id, status)} className={`h-11 flex-1 rounded-2xl text-sm font-bold capitalize ${person.status === status ? 'bg-orange-500 text-white' : 'bg-soft'}`}>
                  {status === 'on' ? 'On floor' : 'Break'}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
