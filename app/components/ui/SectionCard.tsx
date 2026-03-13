import { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  className?: string
}

/**
 * Shared outer glass card shell used by every section view.
 * Pass layout modifiers (e.g. "h-full flex flex-col") via `className`.
 */
export default function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] ${className}`}
    >
      {children}
    </div>
  )
}
