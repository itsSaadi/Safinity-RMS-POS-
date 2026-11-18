export default function BootLoader({ label = 'Getting the kitchen ready…' }) {
  return (
    <div className="grid h-dvh place-items-center bg-bg px-6">
      <div className="flex flex-col items-center text-center">
        <div className="boot-loader relative grid h-28 w-28 place-items-center" aria-hidden="true">
          <span className="boot-loader__halo absolute inset-0 rounded-full bg-orange-500/10" />
          <span className="boot-loader__ring absolute inset-2 rounded-full border-2 border-dashed border-orange-400/40" />
          <svg className="boot-loader__burger relative h-14 w-14 drop-shadow-sm" viewBox="0 0 64 64" fill="none">
            <path className="boot-loader__bun-top" d="M10 28c0-10 10-16 22-16s22 6 22 16H10Z" fill="#F59E0B" />
            <circle className="boot-loader__seed" cx="22" cy="18" r="1.4" fill="#FDE68A" />
            <circle className="boot-loader__seed" cx="32" cy="15" r="1.4" fill="#FDE68A" />
            <circle className="boot-loader__seed" cx="42" cy="18" r="1.4" fill="#FDE68A" />
            <rect className="boot-loader__lettuce" x="11" y="28" width="42" height="5" rx="2.5" fill="#22C55E" />
            <rect className="boot-loader__patty" x="12" y="34" width="40" height="7" rx="3.5" fill="#9A3412" />
            <rect className="boot-loader__cheese" x="13" y="40" width="38" height="4" rx="2" fill="#FACC15" />
            <path className="boot-loader__bun-bottom" d="M12 46h40c0 6-8 10-20 10S12 52 12 46Z" fill="#D97706" />
          </svg>
          <span className="boot-loader__steam boot-loader__steam--a absolute left-[34%] top-2 h-3 w-1 rounded-full bg-orange-300/70" />
          <span className="boot-loader__steam boot-loader__steam--b absolute left-1/2 top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-orange-300/60" />
          <span className="boot-loader__steam boot-loader__steam--c absolute right-[34%] top-2 h-3 w-1 rounded-full bg-orange-300/70" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">Orra POS</p>
        <p className="mt-2 text-sm font-semibold text-muted">{label}</p>
      </div>
      <style>{`
        .boot-loader__halo {
          animation: boot-pulse 1.6s ease-in-out infinite;
        }
        .boot-loader__ring {
          animation: boot-spin 8s linear infinite;
        }
        .boot-loader__burger {
          animation: boot-bounce 1.1s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .boot-loader__lettuce,
        .boot-loader__patty,
        .boot-loader__cheese {
          transform-box: fill-box;
          transform-origin: center;
          animation: boot-layer 1.1s ease-in-out infinite;
        }
        .boot-loader__lettuce { animation-delay: 0.05s; }
        .boot-loader__patty { animation-delay: 0.1s; }
        .boot-loader__cheese { animation-delay: 0.15s; }
        .boot-loader__steam {
          animation: boot-steam 1.4s ease-in-out infinite;
        }
        .boot-loader__steam--a { animation-delay: 0s; }
        .boot-loader__steam--b { animation-delay: 0.2s; }
        .boot-loader__steam--c { animation-delay: 0.4s; }
        @keyframes boot-pulse {
          0%, 100% { transform: scale(0.92); opacity: 0.55; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes boot-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes boot-bounce {
          0%, 100% { transform: translateY(0); }
          45% { transform: translateY(-8px); }
          70% { transform: translateY(-2px); }
        }
        @keyframes boot-layer {
          0%, 100% { transform: translateY(0); }
          45% { transform: translateY(-1.5px); }
        }
        @keyframes boot-steam {
          0% { opacity: 0; transform: translateY(6px) scaleY(0.6); }
          40% { opacity: 0.85; }
          100% { opacity: 0; transform: translateY(-10px) scaleY(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .boot-loader__halo,
          .boot-loader__ring,
          .boot-loader__burger,
          .boot-loader__lettuce,
          .boot-loader__patty,
          .boot-loader__cheese,
          .boot-loader__steam {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
