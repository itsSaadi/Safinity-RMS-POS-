import { useState } from 'react'

export default function FoodImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={`relative overflow-hidden bg-[linear-gradient(145deg,#3f2a22,#1f2937_55%,#9a3412)] ${className}`}>
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <span className="font-display text-4xl text-white/80">{alt?.slice(0, 1) || 'O'}</span>
        </div>
      )}
    </div>
  )
}
