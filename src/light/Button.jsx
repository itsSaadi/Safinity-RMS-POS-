const tones = {
  primary: 'border-transparent bg-[var(--pos-accent)] text-white active:bg-[var(--pos-accent-hover)]',
  secondary: 'border-[var(--pos-border)] bg-white text-[var(--pos-text)] active:bg-[#eef3fb]',
  dark: 'border-transparent bg-[var(--pos-dark)] text-white active:bg-black',
  success: 'border-transparent bg-[var(--pos-success)] text-white active:brightness-95',
  danger: 'border-transparent bg-[var(--pos-danger)] text-white active:brightness-95',
  ghost: 'border-transparent bg-transparent text-[var(--pos-text)] active:bg-white/70',
}

export default function Button({ variant = 'secondary', className = '', type = 'button', children, ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex h-12 min-h-11 items-center justify-center gap-2 rounded-[var(--pos-radius)] border px-4 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 ${tones[variant] || tones.secondary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
