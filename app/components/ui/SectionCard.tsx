import { ReactNode, HTMLAttributes } from 'react'

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

/**
 * Shared outer glass card shell used by every section view.
 * Pass layout modifiers (e.g. "h-full flex flex-col") via `className`.
 * Accepts any extra div props (e.g. onTouchStart/onTouchEnd for swipe).
 */
export default function SectionCard({ children, className = '', ...divProps }: SectionCardProps) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] max-w-[100vw] ${className}`}
      {...divProps}
    >
      {children}
    </div>
  )
}
