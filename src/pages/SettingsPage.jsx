import { useNavigate } from 'react-router-dom'
import { useLayout, writeLayout } from '../layoutPref'

const options = [
  {
    id: 'classic',
    title: 'Classic counter',
    copy: 'The current warm layout, with the menu rail, cart, kitchen, and the rest of the desk.',
  },
  {
    id: 'light',
    title: 'Light counter',
    copy: 'A light blue touchscreen layout. Same menu, orders, payments, and kitchen.',
  },
]

export default function SettingsPage() {
  const layout = useLayout()
  const navigate = useNavigate()

  const choose = (id) => {
    writeLayout(id)
    navigate('/')
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-24 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Counter</p>
      <h1 className="font-display text-3xl leading-none">Layout</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Pick how the order screen looks. Switching does not change tickets, the menu, or payments. You are using the {layout === 'light' ? 'light counter' : 'classic counter'}.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const selected = layout === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              className={`rounded-[28px] border bg-surface p-4 text-left shadow-card ${selected ? 'border-orange-500' : 'border-transparent'}`}
            >
              <Preview id={option.id} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">{option.title}</h2>
                  <p className="mt-1 text-sm text-muted">{option.copy}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${selected ? 'bg-orange-500 text-white' : 'bg-soft'}`}>
                  {selected ? 'In use' : 'Use'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Preview({ id }) {
  if (id === 'light') {
    return (
      <div className="grid h-36 grid-cols-[0.7fr_1fr] gap-2 rounded-2xl bg-gradient-to-b from-[#E8F0FE] to-[#F6F9FF] p-3">
        <div className="flex flex-col justify-between rounded-xl bg-white p-2 shadow-sm">
          <div className="h-2 w-10 rounded-full bg-[#1E293B]" />
          <div className="h-6 rounded-lg bg-[#15803D]" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 content-start">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-10 rounded-lg border border-[#D9E4F5] bg-white" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-36 grid-cols-[42px_1fr_70px] gap-2 rounded-2xl bg-[#fff7ed] p-3">
      <div className="rounded-xl bg-[#1F2937]" />
      <div className="grid grid-cols-3 gap-1.5 content-start">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 rounded-lg bg-white" />
        ))}
      </div>
      <div className="rounded-xl bg-[#111827]" />
    </div>
  )
}
