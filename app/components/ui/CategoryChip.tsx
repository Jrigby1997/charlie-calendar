import React from 'react'

/** Colour metadata used to derive badge/chip colours from Tailwind colour names. */
export const COLOR_META: Record<string, { r: number; g: number; b: number; label: string; order: number }> = {
  blue:   { r: 59,  g: 130, b: 246, label: 'Meal Type', order: 1 },
  purple: { r: 168, g: 85,  b: 247, label: 'Course',    order: 2 },
  orange: { r: 249, g: 115, b: 22,  label: 'Attribute', order: 3 },
  green:  { r: 34,  g: 197, b: 94,  label: 'Dietary',   order: 4 },
  yellow: { r: 234, g: 179, b: 8,   label: 'Other',     order: 5 },
  pink:   { r: 236, g: 72,  b: 153, label: 'Other',     order: 6 },
}

export const DEFAULT_COLOR_META = { r: 99, g: 102, b: 241, label: 'Other', order: 99 }

interface CategoryChipProps {
  name: string
  color: string
  /**
   * When `onClick` is provided the chip is an interactive filter toggle.
   * `selected` only applies in that mode.
   * When `onClick` is omitted the chip renders as a static display badge.
   */
  selected?: boolean
  onClick?: () => void
  /** sm = compact filter chip  md = slightly larger display badge */
  size?: 'sm' | 'md'
}

/**
 * Coloured category chip.
 * - Without `onClick`: static `<span>` badge (e.g. recipe cards, detail modal).
 * - With `onClick`: interactive filter button with selected/hover states.
 */
export default function CategoryChip({ name, color, selected, onClick, size = 'sm' }: CategoryChipProps) {
  const { r, g, b } = COLOR_META[color] ?? DEFAULT_COLOR_META
  const padClass = size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'

  // ── Static badge (no onClick) ──────────────────────────────────────────────
  if (!onClick) {
    return (
      <span
        className={`${padClass} rounded-full font-medium border inline-block`}
        style={{
          backgroundColor: `rgba(${r},${g},${b},0.25)`,
          borderColor:     `rgba(${r},${g},${b},0.50)`,
          color:           `rgba(${r},${g},${b},1)`,
        }}
      >
        {name}
      </span>
    )
  }

  // ── Interactive filter chip ────────────────────────────────────────────────
  const baseStyle: React.CSSProperties = selected
    ? {
        backgroundColor: `rgba(${r},${g},${b},0.40)`,
        borderColor:     `rgba(${r},${g},${b},0.75)`,
        borderWidth:     '2px',
        color:           'white',
      }
    : {
        backgroundColor: `rgba(${r},${g},${b},0.12)`,
        borderColor:     `rgba(${r},${g},${b},0.30)`,
        borderWidth:     '1px',
        color:           `rgba(${r},${g},${b},0.85)`,
      }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (!selected) {
      e.currentTarget.style.backgroundColor = `rgba(${r},${g},${b},0.22)`
      e.currentTarget.style.borderColor      = `rgba(${r},${g},${b},0.50)`
      e.currentTarget.style.color            = 'white'
    }
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    if (!selected) {
      e.currentTarget.style.backgroundColor = `rgba(${r},${g},${b},0.12)`
      e.currentTarget.style.borderColor      = `rgba(${r},${g},${b},0.30)`
      e.currentTarget.style.color            = `rgba(${r},${g},${b},0.85)`
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${padClass} rounded-full font-medium transition-colors border`}
      style={baseStyle}
    >
      {name}
    </button>
  )
}
