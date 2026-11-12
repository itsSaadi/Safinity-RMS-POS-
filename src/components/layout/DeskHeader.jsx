import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DeskHeader({ kicker, title, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link to="/more" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-500">
          <ArrowLeft size={14} /> {kicker}
        </Link>
        <h1 className="font-display text-4xl leading-none">{title}</h1>
      </div>
      {action}
    </div>
  )
}
