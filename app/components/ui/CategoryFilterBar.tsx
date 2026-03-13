import React from 'react'
import CategoryChip, { COLOR_META, DEFAULT_COLOR_META } from './CategoryChip'

interface Category {
  id: number
  name: string
  color: string
}

interface CategoryFilterBarProps {
  categories: Category[]
  /** Currently selected category id, or null for "All" */
  selected: number | null
  onChange: (id: number | null) => void
}

/**
 * Full recipe category filter row.
 * Shows an "All" button followed by chips grouped by colour family, separated by dots.
 * Returns null when there are no categories.
 */
export default function CategoryFilterBar({ categories, selected, onChange }: CategoryFilterBarProps) {
  if (categories.length === 0) return null

  // Group chips by colour key then sort groups by COLOR_META.order
  const grouped = new Map<string, typeof categories>()
  categories.forEach((cat) => {
    const key = cat.color || '__unknown'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(cat)
  })
  const sortedGroups = [...grouped.entries()].sort(
    ([a], [b]) =>
      (COLOR_META[a]?.order ?? DEFAULT_COLOR_META.order) -
      (COLOR_META[b]?.order ?? DEFAULT_COLOR_META.order),
  )

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          selected === null ? 'filter-all-active' : 'filter-all-inactive'
        }`}
      >
        All
      </button>

      {sortedGroups.map(([colorKey, cats], groupIdx) => (
        <React.Fragment key={colorKey}>
          {groupIdx > 0 && (
            <span className="text-white/20 text-xs select-none px-0.5">·</span>
          )}
          {cats.map((cat) => (
            <CategoryChip
              key={cat.id}
              name={cat.name}
              color={cat.color}
              selected={selected === cat.id}
              onClick={() => onChange(selected === cat.id ? null : cat.id)}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  )
}
