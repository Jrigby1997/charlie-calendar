interface IconButtonProps {
  /** Emoji or text to display inside the circle */
  icon?: string
  /** md = w-12 h-12 (standard add button)  sm = w-8 h-8 */
  size?: 'sm' | 'md'
  onClick?: () => void
  title?: string
  className?: string
}

/**
 * Circular icon/add button used throughout Tasks, Rewards, and similar views.
 */
export default function IconButton({
  icon = '+',
  size = 'md',
  onClick,
  title,
  className = '',
}: IconButtonProps) {
  const dim = size === 'md' ? 'w-12 h-12 text-2xl' : 'w-8 h-8 text-lg'
  return (
    <button
      onClick={onClick}
      title={title}
      className={`${dim} bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all duration-200 border border-white/30 hover:scale-110 flex items-center justify-center font-light shadow-lg ${className}`}
    >
      {icon}
    </button>
  )
}
