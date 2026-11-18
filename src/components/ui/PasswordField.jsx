import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  required = false,
  autoComplete = 'current-password',
  className = '',
  inputClassName = '',
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className={`block text-[11px] font-bold uppercase tracking-[0.14em] text-muted ${className}`}>
      {label}
      <span className="relative mt-1 block">
        <input
          value={value}
          onChange={onChange}
          type={visible ? 'text' : 'password'}
          required={required}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-2xl border border-line bg-bg px-3 pr-12 text-sm font-semibold normal-case tracking-normal text-ink outline-none ${inputClassName}`}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted active:bg-soft"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  )
}
