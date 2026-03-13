interface NavTabProps {
  icon: string
  label: string
  active: boolean
  onClick: () => void
  title?: string
}

/**
 * Sidebar navigation button. Renders icon above label.
 * `active` applies the highlighted bg; inactive uses ghost style.
 */
export default function NavTab({ icon, label, active, onClick, title }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
        active
          ? 'bg-white/30 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
      title={title ?? label}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
