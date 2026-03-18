export const AISLE_OPTIONS = [
  { value: 'Produce',        emoji: '🥦' },
  { value: 'Meat & Seafood', emoji: '🥩' },
  { value: 'Dairy & Eggs',   emoji: '🥛' },
  { value: 'Bakery',         emoji: '🥖' },
  { value: 'Pantry & Canned',emoji: '🥫' },
  { value: 'Frozen',         emoji: '🧊' },
  { value: 'Bulk & Spices',  emoji: '🌿' },
  { value: 'Beverages',      emoji: '🥤' },
  { value: 'Personal Care',  emoji: '🧴' },
  { value: 'Household',      emoji: '🧹' },
] as const

export type AisleOption = typeof AISLE_OPTIONS[number]
