# Skylight Calendar — Style Guide

This document defines the visual conventions, class patterns, and component recipes used throughout the app. Follow these rules when building new features so everything stays consistent across both the **glass** (default) and **pastel** themes.

---

## 1. Themes

The app supports two themes, toggled via `html[data-theme]`:

| Theme | Selector | Background | Text |
|---|---|---|---|
| **Glass** (default) | *(no attribute, or `data-theme="glass"`)* | Animated gradient — blues, purples, pinks | `text-white` |
| **Pastel** | `data-theme="pastel"` | Soft animated gradient — pinks, lavenders, mints | Deep purple `#1e1133` |

**Never hard-code colours for one theme only.** Use semantic class names + the `globals.css` override pattern described in §6.

---

## 2. Colour Tokens (Semantic Variants)

These are the five action colours used on interactive elements. Each maps to a Tailwind colour family.

| Variant | Colour | Use case |
|---|---|---|
| `primary` | Purple (`purple-*`) | Main actions — Generate, Save, Confirm |
| `success` | Green (`green-*`) | Positive actions — Add to list, Shopping cart |
| `danger` | Red (`red-*`) | Destructive actions — Delete, Remove, Clear |
| `warning` | Amber (`amber-*`) | Caution — overrides, irreversible but not destructive |
| `info` | Emerald (`emerald-*`) | Meal plan pills, recipe tiles |
| `ghost` | White (`white/*`) | Secondary/neutral — Cancel, Prev, Nav, Close |

---

## 3. Buttons

### Glass classes (copy-paste)

```tsx
// Ghost (most common — nav, cancel, secondary)
"px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"

// Primary (purple)
"px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-sm font-medium transition-all duration-200"
// + add semantic class (see §6): meal-generate-btn

// Success (green)
"px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-200 text-sm font-medium transition-all duration-200"

// Danger (red)
"px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-sm font-medium transition-all duration-200"
// + add semantic class: meal-clear-btn

// Info (emerald — recipe pills)
"px-2 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 rounded-md text-xs font-medium transition-all duration-150"
// + add semantic class: meal-recipe-pill
```

### Disabled state
Always add `disabled:opacity-50` to buttons that can be in a loading/disabled state.

### Size scale

| Size | Classes |
|---|---|
| `xs` | `px-2 py-1 text-xs rounded` |
| `sm` | `px-3 py-1.5 text-xs rounded-lg` |
| `md` | `px-4 py-2 text-sm rounded-lg` ← default |
| `lg` | `px-5 py-2.5 text-base rounded-lg` |

### Icon-only / circular buttons
```tsx
"w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-150"
```

---

## 4. Modals

Every modal follows this structure:

```tsx
{/* Backdrop */}
<div
  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  onClick={onClose}
>
  {/* Container */}
  <div
    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
    onClick={e => e.stopPropagation()}
  >
    {/* Header */}
    <div className="flex justify-between items-start mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
    </div>

    {/* Body */}
    <div className="space-y-4">
      {/* content */}
    </div>

    {/* Footer — always Cancel + primary action */}
    <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
      <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium">
        Cancel
      </button>
      <button onClick={onConfirm} className="flex-1 px-4 py-2.5 [primary classes] rounded-lg text-sm font-medium">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Max widths

| Modal type | `max-w-*` |
|---|---|
| Confirmation / small | `max-w-sm` |
| Form / standard | `max-w-lg` |
| Detail / recipe view | `max-w-2xl` |

### Z-index stack

| Layer | z-index |
|---|---|
| Page content | default |
| Modals | `z-50` |
| Toasts | `z-[60]` |

---

## 5. Cards & Panels

```tsx
// Standard glass card
"bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4"

// Subtle inset section (inside a card)
"bg-white/5 rounded-lg border border-white/10 p-4"

// Highlighted / active section
"bg-white/20 rounded-lg border border-white/30 p-4"

// Row / list item
"bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
```

---

## 6. Pastel Theme Override Pattern

Tailwind generates utility classes at build time. CSS specificity means a `html[data-theme="pastel"] .text-purple-200` selector often **loses** to Tailwind's generated class because of source order.

**The rule:** for any coloured text or background on an interactive element, use a **semantic class name** alongside the Tailwind structural classes, and put *all* colour in `globals.css`.

### Naming convention

```
{feature}-{element}-{modifier?}
```

Examples:
- `meal-generate-btn` — the generate meal plan toolbar button
- `meal-clear-btn` — the clear week button
- `meal-recipe-pill` — a recipe tile inside the meal plan grid
- `meal-remove-btn` — the ✕ remove button on a recipe pill
- `meal-direction-btn` — the ≤/≥ toggle in the generate modal

### globals.css template

```css
/* Short description of what element this targets */
.my-feature-btn {
  color: #VALUE; /* Tailwind colour name — dark/glass theme default */
}
html[data-theme="pastel"] .my-feature-btn {
  color: #DARKER_VALUE !important;           /* readable on light bg */
  background-color: rgba(R, G, B, 0.35) !important;
  border-color: rgba(R, G, B, 0.7) !important;
}
html[data-theme="pastel"] .my-feature-btn:hover {
  background-color: rgba(R, G, B, 0.55) !important;
}
```

### Pastel colour reference

| Variant | Dark theme text | Pastel text | Pastel bg (alpha 0.35) | Pastel border (alpha 0.7) |
|---|---|---|---|---|
| Primary (purple) | `#e9d5ff` (purple-200) | `#581c87` (purple-900) | `rgba(192,132,252,0.3)` | `rgba(168,85,247,0.7)` |
| Success (green) | `#bbf7d0` (green-200) | `#166534` (green-800) | `rgba(134,239,172,0.35)` | `rgba(74,222,128,0.7)` |
| Danger (red) | `#fca5a5` (red-300) | `#991b1b` (red-800) | `rgba(252,165,165,0.35)` | `rgba(248,113,113,0.7)` |
| Info (emerald) | `#d1fae5` (emerald-100) | `#065f46` (emerald-800) | `rgba(110,231,183,0.45)` | `rgba(52,211,153,0.8)` |
| Warning (amber) | `#fcd34d` (amber-300) | `#92400e` (amber-800) | `rgba(252,211,77,0.35)` | `rgba(245,158,11,0.7)` |

---

## 7. Typography

```tsx
// Page / section heading
"text-4xl font-bold text-white drop-shadow-lg"

// Card / modal title
"text-xl font-bold text-white"

// Sub-section heading
"text-lg font-semibold text-white"

// Label / eyebrow (all-caps small)
"text-xs font-semibold text-white/50 uppercase tracking-wide"

// Body text
"text-sm text-white/80"

// Muted / secondary
"text-sm text-white/60"

// Caption / hint
"text-xs text-white/40"

// Empty state
"text-sm text-white/50 text-center"
```

---

## 8. Form Inputs

```tsx
// Standard text input
"w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/40"

// Select
"w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"

// Textarea
"w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-white/40"

// Checkbox label wrapper
"flex items-center gap-2 cursor-pointer"
// Checkbox input: className="w-4 h-4 rounded cursor-pointer accent-purple-400"

// Number input (short)
"w-20 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
```

---

## 9. Toast / Notifications

```tsx
// Container
"fixed top-6 right-6 z-[60]"

// Success
"px-4 py-3 rounded-lg shadow-lg border backdrop-blur-xl text-sm font-medium bg-green-500/20 border-green-500/40 text-green-100"

// Error
"px-4 py-3 rounded-lg shadow-lg border backdrop-blur-xl text-sm font-medium bg-red-500/20 border-red-500/40 text-red-100"
```

Toasts auto-dismiss after 3 seconds. Use the `showToast(message, 'success' | 'error')` helper already present in each component.

---

## 10. Spacing & Layout

| Token | Value |
|---|---|
| Panel padding | `p-6` (modals), `p-4` (cards) |
| Section gap | `space-y-4` or `gap-4` |
| Inline button gap | `gap-2` |
| Border radius | `rounded-lg` (buttons, inputs), `rounded-xl` (modals, cards) |
| Min touch target | `min-h-[44px]` or `w-10 h-10` for icon buttons |

---

## 11. Skeleton / Loading States

```tsx
// Text placeholder
"h-4 w-32 bg-white/10 rounded animate-pulse"

// Block placeholder
"h-24 bg-white/5 rounded-xl animate-pulse"
```

---

## 12. Rules for New Components

1. **Never put color-only classes on elements that need pastel overrides.** Add a semantic class name and control color in `globals.css`.
2. **Match an existing variant** (primary/success/danger/warning/ghost) before inventing a new color.
3. **All modals** use the backdrop + container + header + footer anatomy from §4.
4. **All destructive actions** (delete, clear, remove) must use the `danger` variant and show a `confirm()` or inline confirmation before executing.
5. **Disabled states** always use `disabled:opacity-50` — never hide or remove buttons when loading.
6. **New semantic classes** go in `globals.css` in the section labelled for that feature, following the template in §6.

---

## 13. Meal Planner — Algorithm Conventions

### Standard Meal Types

The app has **5 fixed meal types** in sort order:

| Order | Name | Slot Weight |
|---|---|---|
| 1 | Breakfast | 20% |
| 2 | Lunch | 30% |
| 3 | Dinner | 40% |
| 4 | Snack | 10% |
| 5 | Dessert | 0% (optional) |

- Types are seeded via `upsert` with `ignoreDuplicates: true` — never with `insert` alone.
- Do **not** allow users to add custom types.

### Slot Weights & Budget Reservation

`SLOT_WEIGHTS` maps meal type name (lowercase) to its share of the daily goal. When picking for slot N, the algorithm reserves `goal × weight` for each unfilled later slot before computing how much the current slot may use:

```
effectiveCap = goal - alreadyUsed - Σ(goal × weight for each unfilled later slot)
```

- **Dessert weight is 0** — no budget reserved, fills only if surplus exists. This makes Dessert naturally optional when working near a calorie ceiling.
- Unknown meal type names fall back to weight `0.15`.

### Strictness

- `≤` goals are **hard constraints** — slots that cannot be filled without a violation are left empty. No fallback to the unconstrained pool.
- `≥` goals are **soft targets** — candidates are sorted by how much they reduce the deficit (highest contribution first), but nothing is left empty purely because the minimum isn't yet met.

### Randomness

- Always use **Fisher-Yates shuffle** (`O(n)`, uniform distribution). Never use `arr.sort(() => Math.random() - 0.5)`.
- When `sortForMinGoals` is called, **pre-shuffle** before sorting so equal-scored candidates break ties randomly.

### Dedup

- **Week-level**: `weekUsedIds` Set — initialised from existing `mealPlans`, updated on each pick. Leftovers are exempt.
- **Day-level**: `getDayUsedIds(dateISO)` — built from `mealPlans` + `planned` for that date. Called fresh for each slot.
