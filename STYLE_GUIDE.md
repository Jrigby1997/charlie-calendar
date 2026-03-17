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

Use the **`GlassButton`** component (`app/components/ui/GlassButton.tsx`) — never copy-paste raw class strings for standard push buttons.

### GlassButton

```tsx
import GlassButton from '@/app/components/ui/GlassButton';

<GlassButton variant="default" size="md" onClick={handleClick}>
  Label
</GlassButton>

// Destructive
<GlassButton variant="red" size="sm" onClick={handleDelete}>
  Delete
</GlassButton>

// Passing a semantic class for pastel theme override
<GlassButton variant="red" className="meal-clear-btn whitespace-nowrap" onClick={handleClear}>
  Clear Week
</GlassButton>
```

| Prop | Type | Default | Options |
|---|---|---|---|
| `variant` | string | `"default"` | `default` · `blue` · `red` · `green` |
| `size` | string | `"md"` | `xs` · `sm` · `md` · `lg` · `xl` |
| `onClick` | function | — | |
| `disabled` | boolean | `false` | |
| `type` | string | `"button"` | `button` · `submit` · `reset` |
| `className` | string | — | Extra classes / semantic overrides |
| `title` | string | — | Tooltip |

### Size scale

| Size | Padding |
|---|---|
| `xs` | `px-2 py-1` |
| `sm` | `px-3 py-1.5` |
| `md` | `px-4 py-2` ← default |
| `lg` | `px-5 py-2.5` |
| `xl` | `px-6 py-3` |

All sizes use `rounded-xl text-sm font-medium`.

### Disabled state
`GlassButton` applies `disabled:opacity-50 disabled:cursor-not-allowed` automatically. Never hide or remove a button when loading — disable it instead.

### Icon-only / circular buttons

Use the **`IconButton`** component (`app/components/ui/IconButton.tsx`) instead of raw class strings.

```tsx
import IconButton from '@/app/components/ui/IconButton';

<IconButton icon="+" size="md" onClick={handleAdd} title="Add Task" />
```

| Prop | Type | Default | Options |
|---|---|---|---|
| `icon` | string | `"+"` | Any emoji/text |
| `size` | string | `"md"` | `sm` · `md` |
| `onClick` | function | — | |
| `title` | string | — | Tooltip |
| `className` | string | — | Extra classes |

`md` renders `w-12 h-12 text-2xl`; `sm` renders `w-8 h-8`.

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

---

## 14. Section Anatomy

Every full-screen section view (Calendar, Recipes, Tasks, Shopping List, Rewards) follows this shell pattern:

```tsx
// Loading fallback
<SectionCard className="p-8 h-full flex items-center justify-center">
  <div className="text-white/50 text-sm">Loading...</div>
</SectionCard>

// Main shell
<SectionCard className="h-full flex flex-col">
  {/* Header */}
  <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
    <h1 className="text-4xl font-bold text-white drop-shadow-lg">{title}</h1>
    <div className="flex items-center gap-2">
      {/* right-side controls — GlassButton, PillToggle, IconButton */}
    </div>
  </div>

  {/* Scrollable body */}
  <div className="flex-1 overflow-y-auto px-6 pb-6">
    {/* content */}
  </div>
</SectionCard>
```

### SectionCard base styles

`SectionCard` (`app/components/ui/SectionCard.tsx`) renders:

```
bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]
```

Pass `className` to extend — the base classes are always present.

### Empty state

```tsx
<div className="flex flex-col items-center justify-center py-16 gap-4">
  <p className="text-white/40 text-sm">Nothing here yet.</p>
  <GlassButton size="xl" onClick={handleCreate}>
    ＋ Create First Item
  </GlassButton>
</div>
```

---

## 15. Component Catalog

All shared UI primitives live in `app/components/ui/`. Import them directly — do not reproduce their class strings inline.

| Component | File | Key Props | Used By |
|---|---|---|---|
| `SectionCard` | `ui/SectionCard.tsx` | `className?` | All section views |
| `NavTab` | `ui/NavTab.tsx` | `icon`, `label`, `active`, `onClick`, `title?` | `page.tsx` sidebar |
| `PillToggle` | `ui/PillToggle.tsx` | `items[]`, `value`, `onChange`, `size: sm\|md\|lg` | CalendarView, RecipesView, RewardsView |
| `GlassButton` | `ui/GlassButton.tsx` | `variant`, `size`, `onClick`, `disabled`, `className`, `type` | All section views, MealPlanWeekView |
| `IconButton` | `ui/IconButton.tsx` | `icon?`, `size: sm\|md`, `onClick`, `title`, `className` | TasksView, RewardsView |
| `AvatarBadge` | `ui/AvatarBadge.tsx` | `name`, `color`, `avatarUrl?`, `active`, `onClick?`, `size: md\|lg` | CalendarView, AvatarFilterGroup |
| `AvatarFilterGroup` | `ui/AvatarFilterGroup.tsx` | `members[]`, `visibleMembers: Set<number>`, `onToggle`, `showUnassigned`, `onToggleUnassigned` | CalendarView header |
| `CategoryChip` | `ui/CategoryChip.tsx` | `name`, `color`, `selected?`, `onClick?`, `size?` | RecipesView, CategoryFilterBar |
| `CategoryFilterBar` | `ui/CategoryFilterBar.tsx` | `categories[]`, `selected: number\|null`, `onChange` | RecipesView filter bar |

### PillToggle sizes

| Size | Container extras | Active item classes |
|---|---|---|
| `sm` | — | `bg-white/25 shadow-sm` |
| `md` | — | `bg-white/25 shadow-sm` |
| `lg` | `backdrop-blur-lg shadow-lg` | `bg-white/30 scale-105 border border-white/40` |

### CategoryChip — colour metadata

`CategoryChip` exports `COLOR_META` and `DEFAULT_COLOR_META`. Import them when you need colour info for a recipe category outside the chip itself:

```tsx
import CategoryChip, { COLOR_META, DEFAULT_COLOR_META } from '@/app/components/ui/CategoryChip';

const meta = COLOR_META[category.color] ?? DEFAULT_COLOR_META;
```

| Key | Color | Tailwind family |
|---|---|---|
| `1` | Blue | `blue-*` |
| `2` | Purple | `purple-*` |
| `3` | Orange | `orange-*` |
| `4` | Green | `green-*` |
| `5` | Yellow | `yellow-*` |
| `6` | Pink | `pink-*` |

---

## §16 Mobile Patterns

### `useSwipe` hook

Reusable touch-gesture hook for swipe navigation. Located at `lib/useSwipe.ts`.

```ts
import useSwipe from '@/lib/useSwipe';

const swipeHandlers = useSwipe({
  onSwipeLeft:  () => goToNext(),
  onSwipeRight: () => goToPrev(),
  threshold: 50,   // optional, default 50px — minimum horizontal distance
});
```

Fires **only** when `|deltaX| > threshold` **AND** `|deltaX| > |deltaY|`. This prevents a slow vertical scroll from accidentally triggering a page change.

Returns `{ onTouchStart, onTouchEnd }` — spread these directly on any HTML element or `SectionCard`.

---

### Attaching swipe to a section view

`SectionCard` now accepts all `HTMLAttributes<HTMLDivElement>` via `...divProps` spread, so touch handlers can be attached without a wrapper div:

```tsx
// CalendarView.tsx
const swipeHandlers = useSwipe({
  onSwipeLeft:  () => { if (view !== 'week' || isMobile) nextMonth() },
  onSwipeRight: () => { if (view !== 'week' || isMobile) prevMonth() },
});

return <SectionCard {...swipeHandlers}>…</SectionCard>;
```

> **Desktop week-view guard**: The week time-grid is already horizontally scrollable on some layouts. Always add `if (view !== 'week' || isMobile)` so swipe fires on desktop only when not in week view.

If you need **different swipe targets for mobile and desktop** (like MealPlanWeekView), use two separate hook calls and spread on different inner elements instead of SectionCard:

```tsx
const mobileSwipe  = useSwipe({ onSwipeLeft: mobilePrevDay, onSwipeRight: mobileNextDay });
const desktopSwipe = useSwipe({ onSwipeLeft: prevWeek, onSwipeRight: nextWeek });

// mobile container:
<div className="md:hidden …" {...mobileSwipe}>…</div>
// desktop header:
<div className="hidden md:flex …" {...desktopSwipe}>…</div>
```

---

### `isMobile` state pattern

Every view that changes its layout between mobile and 375px-class phones uses a resize listener:

```ts
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
}, []);
```

The `md:` Tailwind breakpoint is 768px. Use `isMobile` only when CSS alone cannot express the difference (e.g. changing which data is shown, not just which element is visible).

---

### Mobile single-day view pattern

Views that are week-grids on desktop become single-day scrollable views on mobile:

| State | Purpose |
|---|---|
| `mobileDayIndex` (0–6) | Which day of the current week is shown |
| `mobilePrevDay()` | Decrements index; wraps to previous week when it goes below 0 |
| `mobileNextDay()` | Increments index; wraps to next week when it exceeds 6 |

Header uses the same `← [Label] →` pattern as other navigation rows. Keep all buttons `size="sm"` to fit 375px:

```tsx
// ← [Tue Mar 17] → pattern
<GlassButton size="sm" onClick={mobilePrevDay}>←</GlassButton>
<span className="text-sm font-medium flex-1 text-center">{label}</span>
<GlassButton size="sm" onClick={mobileNextDay}>→</GlassButton>
```

---

### Month-day click → day view

In CalendarView, each day cell in the month grid has a click handler that jumps directly to day view for that date:

```tsx
onClick={() => { setCurrentDate(new Date(year, month, day)); setView('day'); }}
```

Add `cursor-pointer hover:bg-white/10` to the cell to signal interactivity.

---

### `max-w-[100vw]` on SectionCard

`SectionCard` already has `max-w-[100vw]` in its base classes. **Do not add it again on individual views** — it will have no effect and adds visual noise to the codebase.

The main wrapping div in `page.tsx` also carries `max-w-[100vw]` as a belt-and-suspenders overflow guard.

---

### Touch target minimum sizes

- Navigation buttons: minimum 44×44px (iOS HIG compliant). Use `size="sm"` GlassButton on mobile — its height is `h-8` (32px). For critical nav (prev/next arrows) consider `min-h-[44px]` if you need the extra tap area.
- Checkbox / toggle: minimum 44×44px hit area via `p-2` wrapper if the visual is smaller.
- Recipe pills and tile rows: naturally tall enough when content wraps. Add `py-2 min-h-[44px]` if they ever render as a single short line.

---

### Recipe pill overflow in grids

When recipe name pills appear inside grid cells, prevent them from expanding the column or row:

```tsx
// Container
<div className="min-w-0 overflow-hidden flex flex-col gap-1">
  {/* Each pill */}
  <span className="block truncate text-xs …">Recipe Name</span>
</div>
```

Key properties: `min-w-0` on the container (flexbox children don't shrink below content by default), `overflow-hidden` to clip, `block truncate` on the text span.

---

### §16 Component Catalog additions (Phase 15)

`IngredientsTab` component:

| Component | Path | Key Props | Used in |
|---|---|---|---|
| `IngredientsTab` | `app/components/IngredientsTab.tsx` | `userId: string` | RecipesView (Ingredients tab) |

**Merge UI pattern** inside IngredientsTab — compact action buttons (not GlassButton):

```tsx
// 28px circle ✓ button
<button onClick={confirmMerge} className="w-7 h-7 rounded-full bg-green-500/30 hover:bg-green-500/50 text-green-300 flex items-center justify-center text-sm">✓</button>
// 28px circle ✕ button
<button onClick={cancelMerge} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center text-sm">✕</button>
// Constrained merge target select
<select className="min-w-0 flex-1 truncate …">…</select>
```

Always apply `min-w-0 flex-1 truncate` to a `<select>` inside a flex row — without `min-w-0` a long option text will push the action buttons off-screen.
