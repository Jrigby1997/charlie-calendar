interface PillToggleItem<T extends string> {
  value: T
  label: string
}

interface PillToggleProps<T extends string> {
  items: PillToggleItem<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * lg  → CalendarView Day/Week/Month  (px-4 py-2, scale-105 active)
   * md  → RecipesView / RewardsView    (px-4 py-1.5 / px-3 py-1, text-sm)
   * sm  → compact strip                (px-3 py-1, text-xs)
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Pill-shaped tab strip for toggling between sub-views.
 */
export default function PillToggle<T extends string>({
  items,
  value,
  onChange,
  size = 'md',
}: PillToggleProps<T>) {
  const padClass =
    size === 'lg'
      ? 'px-4 py-2 text-sm'
      : size === 'sm'
      ? 'px-3 py-1 text-xs'
      : 'px-4 py-1.5 text-sm'

  const containerClass =
    size === 'lg'
      ? 'flex bg-white/10 backdrop-blur-lg rounded-xl p-1 shadow-lg border border-white/20 gap-1'
      : 'flex bg-white/10 border border-white/20 rounded-xl p-1 gap-1'

  return (
    <div className={containerClass}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`${padClass} rounded-lg font-medium transition-all duration-200 ${
            item.value === value
              ? size === 'lg'
                ? 'bg-white/30 text-white shadow-md scale-105 border border-white/40'
                : 'bg-white/25 text-white shadow-sm'
              : size === 'lg'
              ? 'text-white/80 hover:text-white hover:bg-white/20 border border-transparent'
              : 'text-white/50 hover:text-white/80 hover:bg-white/10'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
