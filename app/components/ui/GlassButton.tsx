import { ReactNode } from 'react'

type Variant = 'default' | 'blue' | 'red' | 'green'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface GlassButtonProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  onClick?: () => void
  disabled?: boolean
  title?: string
  /** Additional Tailwind classes (e.g. "shadow-lg hover:scale-105") */
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-white/20 hover:bg-white/30 border-white/30 text-white',
  blue:    'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-200',
  red:     'bg-red-500/30 hover:bg-red-500/50 border-red-500/50 text-white',
  green:   'bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-200',
}

const sizeClasses: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5',
  xl: 'px-6 py-3',
}

/**
 * Standard glass ghost button. Use `className` for one-off shadow/scale overrides.
 */
export default function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  onClick,
  disabled,
  title,
  className = '',
  type = 'button',
}: GlassButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`border rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  )
}
