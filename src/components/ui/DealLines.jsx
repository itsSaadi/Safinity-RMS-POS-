import { dealContents } from '../../utils/format'

export default function DealLines({ source, className = '' }) {
  const lines = dealContents(source)
  if (!lines.length) return null
  return (
    <ul className={className}>
      {lines.map((line, index) => (
        <li key={`${line.label}-${index}`} className="truncate">{line.qty} x {line.label}</li>
      ))}
    </ul>
  )
}
