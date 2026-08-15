'use client'

import { useState } from 'react'

interface AvatarBadgeProps {
  name: string
  color: string
  avatarUrl?: string | null
  /** Whether this member is currently visible/active */
  active: boolean
  onClick?: () => void
  /** md = w-10 h-10 (filter bar)  lg = w-12 h-12 (column header) */
  size?: 'md' | 'lg'
  title?: string
}

/**
 * Circular avatar chip used in the member filter bar and column headers.
 * When `onClick` is omitted the button is purely decorative (display mode).
 */
export default function AvatarBadge({
  name,
  color,
  avatarUrl,
  active,
  onClick,
  size = 'md',
  title,
}: AvatarBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const dim = size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
  const textSize = size === 'lg' ? 'text-lg' : 'text-xs'

  const inner =
    avatarUrl && !imgFailed ? (
      <img
        src={`/avatars/${avatarUrl}`}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setImgFailed(true)}
      />
    ) : (
      <span className={`text-white ${textSize} font-bold`}>
        {name.charAt(0).toUpperCase()}
      </span>
    )

  const base = `${dim} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-200 border-2 shadow-md`
  const stateClass = active ? 'border-white/50' : 'border-white/20 opacity-50'

  if (!onClick) {
    return (
      <div
        className={`${base} border-white/50`}
        style={{ backgroundColor: color }}
        title={title ?? name}
      >
        {inner}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      title={title ?? name}
      className={`${base} ${stateClass}`}
      style={{ backgroundColor: active ? color : undefined }}
    >
      {inner}
    </button>
  )
}
