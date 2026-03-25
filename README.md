## � Upcoming Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | **Glass + Pastel Themes** | ✅ Done — Glassmorphism and Pastel themes with live toggle in Settings; flash-free via localStorage pre-paint script |
| 2 | **Fun Reactions** | ✅ Done — Confetti/particle burst on task completion; celebration animation on reward redemption |
| 3 | **Reward History** | ✅ Done — Full redemption log per member (who, what, when); view-only proof-of-claim history in Rewards section |
| 4 | **Better Section Headers** | ✅ Done — Distinct styled headers with titles, contextual actions, and count badges per section |
| 5 | **Multi-Currency Rewards** | ✅ Done — ⭐ Stars, 💪 Muscles, ❤️ Heart, 🎮 Game Points, 🏆 Trophy. Tasks award one or more currencies; rewards priced in a specific currency; per-member balances per type |
| 6 | **Grouped / Habit Tasks** | ✅ Done — Sub-task checklist inline on tile; completion circle only activates when ALL sub-items checked; configurable reset frequency (daily/weekly/monthly/never) |
| 7 | **Rotating Tasks** | ✅ Done — Ordered roster per task; rotates on completion or every N days; "🔄 your turn" badge; non-current members' circles disabled |
| 8 | **Flexible Recurrence** | ✅ Done — Tasks repeat every X days, X weeks, or X months with configurable interval; `isDueOnDate()` filtering shows tasks only on their correct days |
| 9 | **Calendar-Linked Tasks** | ✅ Done — When creating a calendar event, check "Also add as a task" to have it appear in both the Calendar view (as an event) and the Task view (as a one-off task for that specific date). Linked events show a 📋 badge. Ideal for dated to-dos like "Get oil change", "File taxes", or "Medical checkup" — one entry, two places |
| 10 | ✅ **Sleep Mode** | Sleep button in sidebar; full-screen photo slideshow from admin-uploaded images (selectable in Settings); tap/click anywhere to wake; manual-only |
| 11 | ✅ **Calorie / Macro Totals** | Daily totals row in Meal Plan week grid showing 🔥 cal / 💪 pro / 🥑 fat / 🌾 carb, centred per column; macro data joined from recipes table |
| 12 | ✅ **Mobile Optimization + PWA** | PWA foundation: `@ducanh2912/next-pwa`, `public/manifest.json`, SVG icons, ViewPort meta tags — app is installable on home screen. `BottomNav` fixed tab bar (mobile only). Separate compact/desktop header layouts for CalendarView, TasksView, RewardsView, MealPlanWeekView. Tasks + Rewards switch to single-member-at-a-time view on mobile with avatar picker. CalendarView auto-switches week→day on mobile. Avatar filter row wraps on narrow screens. Google OAuth: use Test Users in Cloud Console for family-scale apps (avoids restricted-scope security audit). |
| 13 | **Space Theme** | Colorful galaxy background (purples/pinks/blues, nebula-style); kid-friendly; glowing card borders; star field parallax |
| 14 | **Seasonal Auto-Theme** | Auto-detects date range: Halloween (Oct 15–Nov 1), Christmas (Dec 1–25), Easter (Mar–Apr), Fall (Sep–Oct), Spring (Apr–May); unique CSS + decorative assets per season |
| 15 | ✅ **Generate Meal Plan** | "Generate Meal Plan" button fills empty weekly slots with recipes matching per-day nutrition goals (calories/protein/fat/carbs, each with ≤/≥ direction); ≤ goals are strictly enforced with proportional budget reservation per meal type (Breakfast 20%, Lunch 30%, Dinner 40%, Snack 10%, Dessert 0% — optional, fills only if surplus allows); ≥ goals sort candidates by deficit contribution; Fisher-Yates shuffle ensures genuine randomness; week-level and day-level dedup prevent recipe repeats; Allow Leftovers copies yesterday's dinner into today's lunch; goals persist via app_settings; 5 fixed standard meal types (no custom types) |
| 16 | **AI Scheduler** | Conversational scheduler suggests optimal event times based on existing calendar load, family member preferences, and recurring patterns — formula-driven with natural language output |
| 17 | ✅ **Google Calendar Write** | Create, edit, and delete events on connected Google Calendars. Uses single-source approach: events are created directly in Google (never stored locally), a pending placeholder is shown while the event syncs back. Architecture is provider-agnostic (`lib/calendarProviders.ts`, `lib/googleAuth.ts`) to support Apple/Outlook in future phases. Phase 1: simple non-recurring events only. Full recurring RRULE write support is a future phase. |
| 18 | **Apple Calendar Read** | Sync and display events from Apple Calendar / iCloud Calendar (CalDAV) in all calendar views |
| 19 | **Apple Calendar Write** | Create, edit, and delete events on connected Apple/iCloud Calendars from within the app |
| 20 | **Outlook Calendar Read** | Sync and display events from Microsoft Outlook / Office 365 Calendar (Microsoft Graph API) in all calendar views |
| 21 | **Outlook Calendar Write** | Create, edit, and delete events on connected Outlook/Office 365 Calendars from within the app |
| 22 | ✅ **Style Guide + Component Library** | `STYLE_GUIDE.md` documents colour tokens, button variants, modal anatomy, form inputs, pastel override pattern, semantic class naming, and rules for new components. `app/components/ui/` ships 9 shared primitives (`SectionCard`, `NavTab`, `PillToggle`, `GlassButton`, `IconButton`, `AvatarBadge`, `AvatarFilterGroup`, `CategoryChip`, `CategoryFilterBar`) — all inline button/card strings replaced across every view. |
| 23 | **Admin Password** | Create an admin password functionality that you can apply to parts of the software so only the admin(s) can edit/add to certain sections |
| 24 | **Life360 Mockup** | Add tracking software, maybe add it to notify you tied to events (suzie arrived to soccer) |
| 25 | ✅ **Ingredient Aliases + Swipe Navigation** | `aliases TEXT[]` column on ingredients table with GIN index. Autocomplete and recipe-import matching check aliases before creating new rows. `IngredientsTab` (3rd tab in Recipes section) — list all ingredients, add/remove aliases, merge duplicates with automatic rerouting of recipe_ingredients and shopping_list rows. `useSwipe` hook (lib/useSwipe.ts) attached to CalendarView, TasksView, and MealPlanWeekView for swipe-left/right navigation. CalendarView month day cells navigate to day view on tap. `SectionCard` extended to accept HTMLAttributes spread so swipe handlers attach without wrapper divs. |
| 26 | ✅ **Admin PIN + Recurring Event Exceptions** | Optional 4-digit admin PIN stored as SHA-256 hash in app_settings (via Web Crypto API — no dependencies). When set, a PIN prompt appears before Settings can be opened; PIN can be changed or removed from within Settings. Recurring event exceptions RLS policies added so single-instance edits (edit this occurrence only / edit all / edit future) now work correctly; `custom_color` column added to event_exceptions. |
| 27 | ✅ **Push Notifications** | Web push subscription + Vercel cron to send morning task digests. PWA is installed; push subscription stored in Supabase; daily digest cron (`0 13 * * *`) fires `/api/push/digest`. |
| 28 | ✅ **Shopping List Aisle Organization** | Items grouped by aisle on the shopping list (matching store layout). Inline aisle picker per item lets you assign/change on the fly. Aisle picker also on each ingredient in IngredientsTab. `lib/aisleOptions.ts` exports 10 aisles with emojis. Share text formatted per-aisle group. |
| 29 | ✅ **Preset Ingredient Library** | ~170 curated preset ingredients with aliases and aisle assignments seed automatically on first login. Each user owns their own copy (fully editable/deletable). "↩ Restore defaults" button in IngredientsTab re-seeds only missing presets without touching existing user data. |
| 30 | ✅ **Event Notes** | Text notes on individual calendar events. `notes TEXT` column on events; textarea in AddEventModal; supports multiline reminders and details. |
| 31 | ✅ **Special Days Countdown** | Standalone special days (birthday, anniversary, etc.) + flag any event as a special day. Emoji badge on calendar cells. Homescreen shows countdown cards ("X days away") for next 90 days. |
| 32 | ✅ **Homescreen Tab** | New 🏠 Home tab as default landing page. Sections: Special Day Countdowns, Today & Tomorrow Events, Today's Meals, Task Overview (per-member progress), Family Notepad (shared, debounced-save), Weather Widget. |
| 33 | ✅ **Weather Integration** | Open-Meteo free API (no key). Weather location + units (°F/°C) in Settings. 3-icon strip (condition/wind/precip) under each date in Day/Week/Month calendar views. WeatherPopup with hourly data. Full weather widget on Homescreen. |

---

## 📝 Latest Updates (March 24, 2026)

### Phase 17 Bug Fixes & Polish

**Homescreen — Tasks section:**
- ✅ Fixed tasks query: was selecting non-existent `assigned_to` column; corrected to join `task_assignments(family_member_id)` (matching actual schema)
- ✅ Fixed task completion counting: was filtering `task_completions` by `completion_date` but column is `completed_date`; both bugs together meant 0/0 shown for all members
- ✅ Fixed family member avatar images: `avatar_url` stores filename only (e.g. `avatar_1.svg`); added `/avatars/` prefix so `<img>` resolves correctly
- ✅ Increased Family Notepad font size from `text-sm` to `text-base`

**Weather improvements:**
- ✅ Fixed date offset bug in Week view: was using `date.toISOString().split('T')[0]` (UTC) which shifted dates back a day for US timezones; corrected to use local date components (`getFullYear/getMonth/getDate`) — consistent with Month view
- ✅ Added weather strip to Day view header (condition + hi/lo + wind + precip/snow)
- ✅ Added wind speed (💨) and precipitation (💧/❄️) icons to Week and Day view weather strips
- ✅ Month view weather now inline on same row as date number and meal icon (date | weather centered | 🍽️) instead of a separate row
- ✅ All weather strips use `justify-center` / `w-full` for consistent centering across all three views

**Modified Files (March 24):**
- `app/components/HomescreenView.tsx` — task_assignments join, completed_date fix, avatar URL prefix, notepad font size
- `app/components/CalendarView.tsx` — date offset fix, day view weather, month weather inline, wind+precip on all strips

---

## 📝 Previous Updates (March 19, 2026)

### Phase 17: Push Notifications + Event Notes + Special Days + Homescreen + Weather (Tasks 27, 30, 31, 32, 33)

**Push Notifications (Task 27):**
- ✅ VAPID keys generated and stored in `.env.local` + Vercel dashboard
- ✅ Daily morning digest cron (`0 13 * * *`) in `vercel.json` — Hobby-plan compatible (once daily max)
- ✅ `/api/push/digest` route sends push notifications to all subscribed users
- ✅ `SettingsModal.tsx` — push notification toggle with status indicator

**Event Notes (Task 30):**
- ✅ `supabase_migration_event_notes_text.sql` — `ALTER TABLE events ADD COLUMN IF NOT EXISTS notes TEXT;`
- ✅ `AddEventModal.tsx` — 📝 Notes textarea (optional, multiline) at bottom of event form
- ✅ `page.tsx` + `CalendarView.tsx` — `notes` on Event type; passed through handleAddEvent/handleUpdateEvent

**Fraction Inputs fix:**
- ✅ `lib/dateUtils.ts` — `parseFraction(str)` handles `1/3`, `1 1/2`, whole numbers, decimals; returns NaN for invalid
- ✅ `ShoppingListView.tsx` + `AddRecipeModal.tsx` — amount inputs changed from `type="number"` to `type="text"` with fraction parsing

**Special Days Countdown (Task 31):**
- ✅ `supabase_migration_special_days.sql` — `special_days` table (id, user_id, title, date, emoji, color, is_recurring)
- ✅ `supabase_migration_event_special_day.sql` — `ALTER TABLE events ADD COLUMN is_special_day BOOLEAN DEFAULT FALSE`
- ✅ `AddSpecialDayModal.tsx` — title, date, emoji picker (grid), color, is_recurring toggle
- ✅ `AddEventModal.tsx` — ⭐ "Mark as special day" checkbox
- ✅ `CalendarView.tsx` — emoji badge on month cells, week/day headers for special days
- ✅ `page.tsx` — specialDays state, loadSpecialDays(), handleAddSpecialDay(), handleDeleteSpecialDay()

**Homescreen Tab (Task 32):**
- ✅ `supabase_migration_family_notes.sql` — `family_notes` table (id, user_id UNIQUE, content, updated_at)
- ✅ `HomescreenView.tsx` — 6 sections: Special Day Countdowns, Today & Tomorrow Events, Today's Meals, Task Overview, Family Notepad (debounced), Weather Widget
- ✅ `BottomNav.tsx` + sidebar — 🏠 Home tab added as first item
- ✅ `page.tsx` — `currentView` default changed to `'home'`; Home view wired

**Weather Integration (Task 33):**
- ✅ `supabase_migration_weather_settings.sql` — `ALTER TABLE app_settings ADD COLUMN weather_location TEXT, weather_lat DOUBLE PRECISION, weather_lon DOUBLE PRECISION, weather_units TEXT DEFAULT 'fahrenheit'`
- ✅ `app/api/weather/route.ts` — proxies Open-Meteo forecast API; 1-hour server cache
- ✅ `app/api/weather/geocode/route.ts` — city/zip → lat/lon via Open-Meteo geocoding API
- ✅ `WeatherPopup.tsx` — hourly forecast for a clicked day; dismisses on ESC or outside click
- ✅ `CalendarView.tsx` — weather icon strip under each date in Month/Week/Day views (within 10-day window)
- ✅ `SettingsModal.tsx` — weather location input, geocode "Find" button, °F/°C toggle

**New Files:**
- `supabase_migration_special_days.sql`
- `supabase_migration_event_special_day.sql`
- `supabase_migration_family_notes.sql`
- `supabase_migration_weather_settings.sql`
- `app/api/weather/route.ts`
- `app/api/weather/geocode/route.ts`
- `app/components/AddSpecialDayModal.tsx`
- `app/components/HomescreenView.tsx`
- `app/components/WeatherPopup.tsx`

**Modified Files:**
- `app/components/BottomNav.tsx` — Home tab added
- `app/components/CalendarView.tsx` — weather strip, special day badges, WeatherPopup
- `app/components/SettingsModal.tsx` — weather location section
- `app/components/AddEventModal.tsx` — notes textarea, is_special_day checkbox
- `app/page.tsx` — home view, specialDays + weatherData states, loadSpecialDays/loadWeather, Home NavTab
- `lib/dateUtils.ts` — parseFraction()
- `app/components/ShoppingListView.tsx` — fraction inputs
- `app/components/AddRecipeModal.tsx` — fraction inputs

---

## 📝 Previous Updates (March 18, 2026)

### Phase 16: Shopping List Aisle Organization + Preset Ingredients (Tasks 28 & 29)

**Shopping List Aisle Organization:**
- ✅ `supabase_migration_shopping_list_aisles.sql` — `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS aisle TEXT;`
- ✅ `lib/aisleOptions.ts` — 10 aisles with emojis: 🥦 Produce, 🥩 Meat & Seafood, 🥚 Dairy & Eggs, 🥖 Bakery, 🥫 Pantry & Canned, 🧊 Frozen, 🌾 Bulk & Spices, 🥤 Beverages, 🧴 Personal Care, 🧹 Household
- ✅ `ShoppingListView.tsx` — items grouped by aisle with section headers and item counts; inline chevron-button aisle picker per item; unassigned items fall into "Other"; share text formatted per-aisle group
- ✅ `IngredientsTab.tsx` — aisle picker dropdown per ingredient card; stored immediately to DB on change

**Preset Ingredients (~170 items, user-owned, seed-on-first-login):**
- ✅ `supabase_migration_ingredients_seeded.sql` — adds `ingredients_seeded BOOLEAN NOT NULL DEFAULT FALSE` to `app_settings`
- ✅ `lib/presetIngredients.ts` — `PRESET_INGREDIENTS` array (~170 entries) across Produce, Meat & Seafood, Dairy & Eggs, Pantry & Canned, Bulk & Spices, Bakery, Frozen, Beverages; each entry has `name`, `aliases[]` (alternate store names only — no preparations), and `aisle`
- ✅ `seedPresetIngredients(userId)` in `page.tsx` — queries existing names; inserts only new presets; upserts `ingredients_seeded: true`; `ingredientsSeedingDone useRef` guard prevents double-seeding per session
- ✅ `loadSettings` restructured from `else if (data)` → `else { if (data) {...} if (!data?.ingredients_seeded) { seed } }` — handles new users (no row) and existing users (column defaults false) alike
- ✅ `restoreDefaults()` in `IngredientsTab.tsx` — "↩ Restore defaults" button next to ingredient count; re-inserts only missing presets; shows toast with count added

**New Files:**
- `supabase_migration_shopping_list_aisles.sql`
- `supabase_migration_ingredients_seeded.sql`
- `lib/aisleOptions.ts`
- `lib/presetIngredients.ts`

**Modified Files:**
- `app/components/ShoppingListView.tsx` — aisle grouping + inline picker + grouped share text
- `app/components/IngredientsTab.tsx` — aisle picker per card + restore-defaults button
- `app/page.tsx` — `useRef`, PRESET_INGREDIENTS import, `seedPresetIngredients`, updated `loadSettings`

---

## 📝 Previous Updates (March 17, 2026)

### Phase 15: Ingredient Aliases + Swipe Navigation + Mobile Polish (Task 25)

**Ingredient Aliases:**
- ✅ `supabase_migration_ingredient_aliases.sql` — `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';` + `CREATE INDEX ... USING GIN (aliases);`
- ✅ `AddRecipeModal`: `Ingredient` type gains `aliases?: string[]`; `loadIngredients` and `createNewIngredient` select `id, name, aliases`; `getFilteredIngredients` checks aliases in autocomplete; `selectOrCreateIngredient` and `handleImportRecipe` check aliases before calling `createNewIngredient` (prevents unwanted duplicates on import)
- ✅ New `IngredientsTab.tsx` — 3rd tab in Recipes section (`🥕 Ingredients`): alphabetical ingredient list, alias chips (removable), "Add alias" inline form, merge flow (select target > ✓/✕ compact icon buttons)
- ✅ Merge executes 4 sequential Supabase calls: reroute `recipe_ingredients` rows → reroute `shopping_list` rows → append source name + aliases to target's `aliases[]` → delete source ingredient
- ✅ `RecipesView` PillToggle extended to 3 items: `🍳 Recipes | 📅 Meal Plan | 🥕 Ingredients`

**Swipe Navigation:**
- ✅ New `lib/useSwipe.ts` — `useSwipe({ onSwipeLeft, onSwipeRight, threshold? })` → `{ onTouchStart, onTouchEnd }`. Guards: `|deltaX| > threshold` AND `|deltaX| > |deltaY|` (no false positives on vertical scroll)
- ✅ `SectionCard` extended: `interface SectionCardProps extends HTMLAttributes<HTMLDivElement>`; `{...divProps}` spread on root div — listeners attached with `<SectionCard {...swipeHandlers}>`
- ✅ `CalendarView`: swipe left/right = next/prev; desktop week-view guard (`if (view !== 'week' || isMobile)`); month day cell click navigates to day view for that date (`cursor-pointer` added)
- ✅ `TasksView`: swipe left/right = next/previous day
- ✅ `MealPlanWeekView`: mobile swipe = `mobilePrevDay()` / `mobileNextDay()`; desktop header swipe = prev/next week (two separate `useSwipe` calls on two separate elements)

**Mobile Overflow + State Fixes:**
- ✅ `SectionCard` base classes include `max-w-[100vw]` — no view can cause horizontal overflow
- ✅ Main content wrapper in `page.tsx` also carries `max-w-[100vw]`
- ✅ `handleAddWeekMealsToList` now queries DB directly with date range filter instead of reading potentially-stale React `mealPlans` state (fixed: ingredients still appearing after clearing the week)
- ✅ MealPlanWeekView recipe pills: `min-w-0 overflow-hidden` container + `block truncate` text — pills never expand column width
- ✅ Single-day Generate on mobile: passes `mobileDateISO` through `openGenerateModal(targetDateISO?)` → `handleGeneratePlan(targetDateISO?)` fills only the selected day's slots; `weekUsedIds` still seeded from the full week (no cross-day recipe repeats)

**New Files:**
- `supabase_migration_ingredient_aliases.sql`
- `lib/useSwipe.ts`
- `app/components/IngredientsTab.tsx`

**Modified Files:**
- `app/components/ui/SectionCard.tsx` — `max-w-[100vw]`, `HTMLAttributes<HTMLDivElement>` spread
- `app/page.tsx` — `max-w-[100vw]` on main wrapper; `handleAddWeekMealsToList` DB-direct query
- `app/components/AddRecipeModal.tsx` — aliases in type, all match paths check aliases
- `app/components/RecipesView.tsx` — 3rd PillToggle item, IngredientsTab render
- `app/components/CalendarView.tsx` — useSwipe, month day click
- `app/components/TasksView.tsx` — useSwipe
- `app/components/MealPlanWeekView.tsx` — useSwipe (mobile + desktop), pill truncation, single-day generate

---

## 📝 Previous Updates (March 16, 2026)

### Phase 14: PWA Foundation + Mobile Optimization (Task 12)

**PWA:**
- ✅ `@ducanh2912/next-pwa` installed; `next.config.ts` wrapped with `withPWA()` (NetworkFirst for API/Supabase, `turbopack: {}` conflict fix)
- ✅ `public/manifest.json` — display: standalone, theme_color: #667eea
- ✅ `public/icons/icon-192.svg` + `icon-512.svg` — purple gradient calendar placeholder icons
- ✅ `app/layout.tsx` — `Viewport` export, apple-mobile-web-app meta, manifest link

**BottomNav:**
- ✅ `app/components/BottomNav.tsx` — fixed bottom tab bar with 6 tabs (Calendar, Recipes, Lists, Tasks, Rewards, Settings), `md:hidden`
- ✅ Safe-area-inset padding for iPhone home indicator
- ✅ `app/page.tsx` — sidebar `hidden md:flex`, main content `pb-14 md:pb-0`

**CalendarView:**
- ✅ Completely separate mobile/desktop header JSX blocks
- ✅ `isMobile` state + resize listener auto-switches week→day on mobile
- ✅ Mobile Row 2 controls all `size="sm"` to fit 375px
- ✅ `AvatarFilterGroup` uses `flex-wrap` — avatar circles wrap to next line instead of overflowing

**TasksView:**
- ✅ `grid grid-cols-3` header replaced with `← [label/date] → [+]` compact flex row
- ✅ Mobile member picker — avatar circles in header, tap to switch which member's column is visible
- ✅ Desktop unchanged — all member columns shown side-by-side

**RewardsView:**
- ✅ Same mobile member picker pattern — single column at a time, avatar circles to switch
- ✅ Desktop unchanged

**MealPlanWeekView / RecipesView:**
- ✅ MealPlanWeekView mobile header: `← [Week Range] →` + flex-wrap action buttons row
- ✅ RecipesView container padding reduced to `px-3 md:px-6` on mobile; title `text-lg md:text-2xl`

**Global:**
- ✅ `html, body { overflow-x: hidden }` added to `globals.css`

**Modified Files:**
- `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/components/BottomNav.tsx` — new
- `app/components/CalendarView.tsx`, `TasksView.tsx`, `RewardsView.tsx`, `MealPlanWeekView.tsx`, `RecipesView.tsx`
- `app/components/ui/AvatarFilterGroup.tsx`
- `.gitignore`

---

## 📝 Previous Updates (March 13, 2026)

### Phase 13: Component Library Refactor (Task 22)

**New `app/components/ui/` library — 9 shared primitives:**

| Component | File | Purpose |
|---|---|---|
| `SectionCard` | `ui/SectionCard.tsx` | Outer glass panel shell for all section views |
| `NavTab` | `ui/NavTab.tsx` | Sidebar navigation tab (icon + label, active state) |
| `PillToggle` | `ui/PillToggle.tsx` | Segment control — Day/Week/Month, Recipes/Meal Plan, etc. |
| `GlassButton` | `ui/GlassButton.tsx` | All glass push buttons (default/blue/red/green, xs–xl) |
| `IconButton` | `ui/IconButton.tsx` | Circular icon-only button (Add Task, Add Reward) |
| `AvatarBadge` | `ui/AvatarBadge.tsx` | Member avatar chip — static display or interactive filter |
| `AvatarFilterGroup` | `ui/AvatarFilterGroup.tsx` | Row of AvatarBadge filter buttons + unassigned toggle |
| `CategoryChip` | `ui/CategoryChip.tsx` | Recipe category badge / filter chip; exports `COLOR_META` |
| `CategoryFilterBar` | `ui/CategoryFilterBar.tsx` | Full filter bar — "All" button + grouped CategoryChips |

**Consumer files updated:**
- ✅ `app/page.tsx` — all 7 sidebar nav buttons → `NavTab`
- ✅ `app/components/CalendarView.tsx` — `SectionCard`, `PillToggle` (lg), `AvatarFilterGroup`, `GlassButton` for Add Event / Sync / Today / ←/→
- ✅ `app/components/RecipesView.tsx` — `SectionCard`, `PillToggle` (md), `CategoryFilterBar`, `CategoryChip`, `GlassButton` for Add Recipe; `COLOR_META` moved to `CategoryChip`
- ✅ `app/components/TasksView.tsx` — `SectionCard`, `IconButton` for Add Task, `GlassButton` for Prev/Today/Next/empty-state
- ✅ `app/components/ShoppingListView.tsx` — `SectionCard`, `GlassButton` (Share=blue, Clear=red, Add=default); placeholder visibility fixed via `recipe-input` semantic class
- ✅ `app/components/RewardsView.tsx` — `SectionCard`, `PillToggle` (sm), `IconButton` for Add Reward, `GlassButton` for empty-state
- ✅ `app/components/MealPlanWeekView.tsx` — `GlassButton` for Prev/Today/Next/Clear Week/Generate/Add Week's Meals; semantic classes (`meal-clear-btn`, `meal-generate-btn`) preserved via `className` prop

**Style guide updates (§3, §14, §15):**
- ✅ §3 Buttons rewritten — copy-paste class strings replaced with `GlassButton` / `IconButton` component API reference
- ✅ §14 Section Anatomy added — `SectionCard` shell, header layout, empty-state pattern
- ✅ §15 Component Catalog added — full table of all 9 components with props and consumers

**Bug fix:**
- ✅ `ShoppingListView` — three inputs had `placeholder-white/60` (broken Tailwind pattern that made placeholder invisible); replaced with `recipe-input` semantic class defined in `globals.css`

**Modified Files:**
- `app/components/ui/SectionCard.tsx` — new
- `app/components/ui/NavTab.tsx` — new
- `app/components/ui/PillToggle.tsx` — new
- `app/components/ui/GlassButton.tsx` — new
- `app/components/ui/IconButton.tsx` — new
- `app/components/ui/AvatarBadge.tsx` — new
- `app/components/ui/AvatarFilterGroup.tsx` — new
- `app/components/ui/CategoryChip.tsx` — new (absorbs `COLOR_META` from RecipesView)
- `app/components/ui/CategoryFilterBar.tsx` — new
- `app/page.tsx` — NavTab conversion
- `app/components/CalendarView.tsx` — full component library integration
- `app/components/RecipesView.tsx` — full component library integration
- `app/components/TasksView.tsx` — full component library integration
- `app/components/ShoppingListView.tsx` — full component library integration + placeholder fix
- `app/components/RewardsView.tsx` — full component library integration
- `app/components/MealPlanWeekView.tsx` — GlassButton integration
- `app/globals.css` — `recipe-input` semantic class for placeholder visibility
- `STYLE_GUIDE.md` — §3 updated, §14 and §15 added

---

## 📝 Previous Updates (March 12, 2026)

### Phase 12: Generate Meal Plan Refinements

**Standard Meal Types:**
- ✅ Removed "Add Custom Meal Type" UI from `MealPlanModal` — meal types are now fixed
- ✅ 5 standard types: Breakfast, Lunch, Dinner, Snack, Dessert (in that order)
- ✅ `seedDefaultMealTypes` upgraded to `upsert` with `ignoreDuplicates: true` — existing users silently gain Snack without disrupting their data
- ✅ Both `MealPlanModal` and `MealPlanWeekView` now always upsert on load rather than only when the table is empty

**Strict Goal Enforcement + Budget-Aware Distribution:**
- ✅ `≤` goals are now strictly enforced — slots that can't be filled without a violation are left empty, never filled with a violating recipe (removed fallback pool)
- ✅ Proportional budget reservation prevents early meals from consuming the whole day's budget:
  - Breakfast → 20%, Lunch → 30%, Dinner → 40%, Snack → 10%, Dessert → 0%
  - `getEffectiveCap()` computes per-slot cap = `goal − already used − Σ(weight × goal for each unfilled later slot)`
  - Breakfast with a 1800 cal goal and Lunch/Dinner/Snack unfilled is limited to ~360 cal
- ✅ Dessert weight is 0 — no budget is reserved for it, so it only fills if surplus calorie room exists after all other slots are placed (optional by design)
- ✅ `unfilledCount` tracks slots left empty due to goal constraints; toast message explains partial fills

**Algorithm Bug Fixes:**
- ✅ Same-day recipe dedup — `getDayUsedIds()` builds a per-day Set; candidates with `dayUsed.has(r.id)` are excluded
- ✅ Same-week recipe dedup — `weekUsedIds` Set initialized from existing `mealPlans`; each picked recipe added immediately; leftovers exempt
- ✅ `≥` direction now works — `sortForMinGoals()` ranks candidates by how much they close the deficit for each lagging macro
- ✅ Fisher-Yates shuffle replaces biased `sort(() => Math.random() - 0.5)` — uniform permutations, genuinely different plans on each run
- ✅ `sortForMinGoals` pre-shuffles before stable-sorting so equal-scored recipes break ties randomly

**Modified Files:**
- `app/components/MealPlanWeekView.tsx` — `seedDefaultMealTypes` (upsert), `SLOT_WEIGHTS`, `getSlotWeight`, `getEffectiveCap`, `passesMaxGoals` (budget-aware, strict), loop uses `mtIdx`, Fisher-Yates shuffle, `sortForMinGoals` pre-shuffle
- `app/components/MealPlanModal.tsx` — removed `newMealType` state, `handleAddMealType`, "Add Custom Meal Type" UI block; `seedDefaultMealTypes` updated to upsert 5 standard types

---

## 📝 Previous Updates (March 12, 2026)

### Style Guide (Task 22)

- ✅ `STYLE_GUIDE.md` created — comprehensive reference covering:
  - The two themes (glass / pastel) and their selectors
  - 5 semantic colour variants: primary (purple), success (green), danger (red), info (emerald), warning (amber)
  - Copy-paste button class strings for all variants and sizes
  - Modal anatomy — backdrop, container, header, body, footer, max-width scale, z-index stack
  - Card and panel patterns
  - Typography scale (heading → caption)
  - Form input classes (text, select, textarea, checkbox, number)
  - Toast/notification pattern
  - Spacing & layout tokens
  - Skeleton/loading state classes
  - **Pastel override pattern** — semantic class naming convention (`feature-element-modifier`) + `globals.css` template with colour reference table
  - 6 hard rules for new components

### Phase 11: Generate Meal Plan (Task 15)

**Generate Meal Plan Button:**
- ✅ "🍽️ Generate Meal Plan" button added to the Meal Plan week-view toolbar
- ✅ Modal shows per-day nutrition goals for Calories, Protein, Fat, and Carbs
- ✅ Each goal has a checkbox (enable/disable), a ≤/≥ direction toggle, and a numeric input
- ✅ Goals are saved to `app_settings` (`meal_plan_goals` JSONB + `meal_plan_allow_leftovers` boolean) and pre-loaded next time the modal opens
- ✅ Algorithm fills only empty slots — already-placed meals are never overwritten
- ✅ Recipe category tag matching: if a recipe is tagged with a meal type name (e.g. "Dinner"), it only appears in that meal type's slots; untagged recipes may appear anywhere
- ✅ Nutrition filtering: for any enabled ≤ goal, recipes that would push the day's running total over the limit are excluded (≥ goals are soft targets and don't filter)
- ✅ Allow Leftovers checkbox: when enabled, yesterday's dinner is automatically reused as today's lunch (checks both existing and newly-planned meals)
- ✅ Slot assignment is randomised within the eligible pool for variety
- ✅ Toast feedback: success count or descriptive error

**Macro Totals Row (Task 11 expansion):**
- ✅ Daily Totals row shows 🔥 cal / 💪 pro / 🥑 fat / 🌾 carb centred in each column
- ✅ Macro data fetched from the joined `recipes` table for every plan entry

**Database Migration:**
- `supabase_migration_meal_plan_goals.sql` — adds `meal_plan_goals JSONB` and `meal_plan_allow_leftovers BOOLEAN` to `app_settings`

**Modified Files:**
- `app/components/MealPlanWeekView.tsx` — `MacroGoal`/`MealPlanGoals` types, `goals` state, `loadGoals`/`saveGoals`/`updateGoal`, `handleGeneratePlan` algorithm, generate modal JSX, updated toolbar with Generate + Shopping List buttons
- `supabase_migration_meal_plan_goals.sql` — new migration file

---

## 📝 Previous Updates (March 11, 2026)

### Phase 10: Flexible Recurrence, Calendar-Linked Tasks & UX Polish

**Flexible Recurrence (Task 8):**
- ✅ Tasks can repeat every X days, X weeks, or X months (configurable interval + unit)
- ✅ `isDueOnDate()` helper filters tasks per-day correctly across all recurrence modes
- ✅ AddTaskModal: "Repeating" mode shows inline "Repeat every [N] [days/weeks/months]" picker
- ✅ `recurrence_interval` + `recurrence_unit` persisted to Supabase

**Calendar-Linked Tasks (Task 9):**
- ✅ "📋 Also add as a task" toggle in AddEventModal (disabled when no member assigned)
- ✅ Creates a `one_off` task with `linked_event_id` and `due_date` matching the event date
- ✅ 5-currency reward picker shown when toggle is enabled
- ✅ 📋 badge shown on calendar event tiles in all 5 view locations when a linked task exists
- ✅ Editing an event syncs `due_date` on its linked task automatically
- ✅ Task tile in TasksView shows 📅 badge when the task has a `linked_event_id`

**Settings Isolation (Multi-Account Fix):**
- ✅ Settings (family name, section title, theme) were previously shared across all accounts — fixed
- ✅ `loadSettings()` now scopes to `auth.getUser()` then filters `.eq('user_id', user.id)`
- ✅ `handleSave()` rewritten to use `upsert({ onConflict: 'user_id' })` — one atomic call per user
- ✅ `supabase_migration_app_settings_user_scoped.sql` — adds `UNIQUE(user_id)`, makes `user_id NOT NULL`, deletes shared null row, replaces permissive RLS policies with strict per-user ones

**Auth Email Redirect Fix:**
- ✅ Confirmation emails previously linked to `localhost:3000` regardless of environment
- ✅ Fixed by passing `emailRedirectTo: window.location.origin` in `signUp()` — dynamically uses the domain the user signed up from

**Custom Color Swatches:**
- ✅ Replaced free-form color wheel with 9 preset swatches: Gray, Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink
- ✅ Selected swatch shows white ring + scale; no more similar-purple-but-slightly-different events

**Pastel Theme Multi-Member Events:**
- ✅ Previously defaulted to a flat blue for any multi-member event in pastel theme
- ✅ Now renders a diagonal gradient of each member's pastelized color (e.g. soft-pink / soft-blue for 2 members)
- ✅ `getPastelMultiEventStyle()` added; all 5 event tile locations updated

**UX Polish:**
- ✅ Event title renders above time range in all calendar tiles (title is more important at a glance)
- ✅ New event end time defaults to 1 hour after start (was 30 min)
- ✅ "Also add as task" checkbox disabled + dimmed when no family member is assigned
- ✅ Pastel theme `<select>` dropdown options now readable (explicit `background-color` + `color` on `option` elements)
- ✅ Fixed duplicate `event.description` rendering bug in day-view timed tiles

**Database Migrations:**
- `supabase_migration_flexible_recurrence_and_linked_tasks.sql` — adds `recurrence_interval`, `recurrence_unit`, `due_date`, `linked_event_id` to tasks
- `supabase_migration_app_settings_user_scoped.sql` — per-user settings isolation (run this if on shared DB)

**Modified Files:**
- `app/components/AddTaskModal.tsx` — recurrence interval/unit UI and params
- `app/components/TasksView.tsx` — `isDueOnDate()` filtering, new task fields, linked-task badge
- `app/components/AddEventModal.tsx` — linked task toggle, 5-currency picker, color swatches, 60-min default, checkbox disable logic
- `app/components/CalendarView.tsx` — 📋 badge on linked events, title-above-time layout, pastel multi-member gradient, duplicate description fix
- `app/components/SettingsModal.tsx` — per-user `loadSettings()` and `handleSave()` with upsert
- `app/contexts/AuthContext.tsx` — `emailRedirectTo: window.location.origin` in `signUp()`
- `app/page.tsx` — `linkedTaskEventIds` state + load function, linked task creation in `handleAddEvent`, `due_date` sync in `handleUpdateEvent`, per-user `loadSettings()`
- `app/globals.css` — pastel `select option` color fix

---

## 📝 Previous Updates (March 11, 2026)

### Phase 9: Multi-Currency Rewards, Grouped Tasks & Rotating Tasks

**Multi-Currency Rewards:**
- ✅ 5 preset currencies: ⭐ Stars, 💪 Muscles, ❤️ Heart, 🎮 Game Points, 🏆 Trophy
- ✅ Tasks award multiple currencies simultaneously, each with its own configurable amount
- ✅ Rewards priced in one specific currency; balances checked per-currency per-member
- ✅ `member_currency_balances` table is source of truth; `member_points` maintained as legacy mirror
- ✅ Rewards view member header shows all non-zero currency balances inline
- ✅ Redemption deducts correct currency; history shows the correct icon per row

**Grouped / Habit Tasks:**
- ✅ Add ordered sub-items (steps) to any task inside AddTaskModal
- ✅ Sub-item checklist rendered inline on each TaskTile; tap to toggle
- ✅ Completion circle disabled until ALL sub-items are checked for that period
- ✅ Configurable reset frequency per task: Daily, Weekly, Monthly, or Never
- ✅ Period key system ensures sub-completions reset correctly per period

**Rotating Tasks:**
- ✅ Toggle any task to "rotating" mode with an ordered member roster
- ✅ Rotation trigger: on completion OR every N days (date mode)
- ✅ "🔄 your turn" badge shown on the current assignee's tile
- ✅ Completion circles disabled for non-current-rotation members
- ✅ Assign To picker hidden when rotating (roster replaces it)
- ✅ Rotation index advances automatically after each completion

**Database Migrations (run in this order in Supabase):**
- `supabase_migration_multi_currency.sql` — `member_currency_balances`, `task_currency_rewards`, currency columns on rewards/redemptions
- `supabase_migration_grouped_tasks.sql` — `task_sub_items`, `task_sub_completions`, `group_reset_frequency` on tasks, `period_key` on completions
- `supabase_migration_rotating_tasks.sql` — rotation columns on tasks, `task_rotation_members` table

**Modified Files:**
- `app/components/AddTaskModal.tsx` — complete rewrite: 11-param signature, currency rewards, sub-items, rotation sections
- `app/components/AddRewardModal.tsx` — currency type picker; updated onAdd/onUpdate signatures
- `app/components/TasksView.tsx` — new types/state/load functions, period key system, multi-currency award, rotation logic, updated TaskTile
- `app/components/RewardsView.tsx` — multi-currency balances, currency-specific redemption, updated UI

---

## 📝 Previous Updates (March 6, 2026)

### Phase 8: Meal Plan Week View in Recipes Section

**Meal Plan Week View:**
- ✅ `🍳 Recipes` / `📅 Meal Plan` pill toggle added to top-right of Recipes section header
- ✅ Week grid: meal type rows (Breakfast, Lunch, etc.) × 7 day columns
- ✅ Large left-aligned week range heading (`text-4xl`) matching CalendarView style
- ✅ Prev / Today / Next navigation buttons grouped on the right
- ✅ Today's column highlighted; Today button only appears when navigated away
- ✅ Filled cells: 2-line clamped recipe name pill + red ✕ remove button (instant delete, no reload)
- ✅ Empty cells: `+` button opens existing day MealPlanModal
- ✅ Clicking a recipe pill opens full read-only recipe detail modal (ingredients, instructions, macros)
- ✅ Grid refreshes immediately after saving from MealPlanModal (no page refresh needed)
- ✅ Seeds default meal types if user has none

**New Files:**
- `app/components/MealPlanWeekView.tsx`

**Modified Files:**
- `app/components/RecipesView.tsx` — subView toggle, new props (`weekStartDay`, `onMealDayClick`, `mealRefreshKey`)
- `app/page.tsx` — `mealPlanRefreshKey` counter wired to MealPlanModal `onRefresh`

---

## 📝 Previous Updates (March 5–6, 2026)

### Phase 7: Google Calendar Integration (Read-Only, Multi-Account)

**Google Calendar Integration:**
- ✅ OAuth 2.0 flow — connect any number of Google accounts from Settings
- ✅ Multiple Google accounts supported (grouped by email in Settings UI)
- ✅ Multiple family members assignable per calendar (avatar toggle buttons)
- ✅ Events blended into all calendar views alongside local events
- ✅ Background sync on page load (if >15 min stale), manual Sync Now button
- ✅ Google events show gradient Google 'G' badge in all calendar views
- ✅ Clicking a Google event opens a read-only detail popup (ExternalEventDetailModal)
- ✅ Per-account Disconnect; "Add Another Account" button
- ✅ Timezone-safe date parsing (RFC 3339 string parsed directly — no UTC conversion)
- ✅ Production-safe lazy-initialized Supabase admin client (no build-time crash)

**Database Migrations:**
- ✅ `supabase_migration_google_calendar.sql` — creates `user_integrations`, `external_calendars`, `external_events`
- ✅ `supabase_migration_google_calendar_v2.sql` — adds `google_email`, `integration_id` FK, `family_member_ids` JSON array, backfill

**New Files:**
- `lib/supabase-admin.ts` — server-only Supabase admin client (lazy init)
- `app/api/google-auth/route.ts` — OAuth initiation
- `app/api/google-auth/callback/route.ts` — OAuth token exchange
- `app/api/google-calendar/sync/route.ts` — event sync (multi-account, timezone-safe)
- `app/api/google-calendar/disconnect/route.ts` — account disconnect
- `app/components/ExternalEventDetailModal.tsx` — read-only event detail popup

**Production:** https://charlie-calendar.vercel.app ✅

---

### Phase 5: Task & Reward System, Points Logic Fix

**Task & Reward System:**
- ✅ Full-featured task/chore tracker with daily and one-off tasks
- ✅ Per-family-member columns (Skylight-style) for tasks and rewards
- ✅ Points/stars system for completing tasks, with real-time updates
- ✅ Rewards store: spend stars on one-off or reusable rewards, per-member assignment
- ✅ Prevents unchecking tasks if points have already been spent (no negative balances)
- ✅ All tables use Supabase RLS and realtime subscriptions

**Bug Fixes & Logic Improvements:**
- ✅ Fixed exploit: cannot uncheck a completed task if those points have already been redeemed for rewards

**Database:**
- ✅ Added tables: `tasks`, `task_assignments`, `task_completions`, `member_points`, `rewards`, `reward_assignments`, `reward_redemptions`

**UI:**
- ✅ Rewards tab and view mirrors task layout, with per-member columns and redeem logic

**Next Steps:**
- Authentication and multi-user support
- Mobile responsiveness polish

---
# Skylight Calendar - Family Organizer

A modern family organization application with real-time synchronization, auto-save, multi-member support, and beautiful glassmorphism design.

## ✨ Design Highlights

- **Glassmorphism UI:** iOS-style frosted glass aesthetic with animated gradient backgrounds
- **Modern Color Palette:** Vibrant animated gradients (purple, blue, pink, teal) with transparent glass panels
- **Smooth Interactions:** All elements feature hover effects, scale animations, and backdrop blur
- **Accessibility:** High contrast white text on colorful backgrounds with drop shadows

## 📝 Previous Updates (February 9-10, 2026)

### Phase 4: Nutrition, Shopping List Enhanced Features & Family Member Avatars

**Nutrition Data Integration:**
- ✅ Auto-extract nutrition info from recipe URLs (schema.org parsing)
- ✅ Parse macronutrients: protein, fat, carbohydrates (decimal grams)
- ✅ Auto-detect dietary restrictions (vegan, gluten-free, dairy-free, keto, low-carb, paleo)
- ✅ Manual nutrition field editing in recipe form
- ✅ Display nutrition macros in recipe detail view with description

**Shopping List Enhancements:**
- ✅ Inline amount editing for shopping list items (click to edit)
- ✅ Edit amount and measurement unit per item
- ✅ Save/cancel controls for each item
- ✅ "Share List" button with Web Share API (mobile native share menu)
- ✅ Desktop fallback: copy to clipboard
- ✅ Formatted text export showing unchecked items, amounts, and recipe sources

**Family Member Avatar System:**
- ✅ Avatar picker with 7 professional SVG character designs (animals, robots, objects)
- ✅ Dynamic avatar loading (supports svg, png, jpg, gif, webp)
- ✅ Broken image handling (hides non-existent avatars gracefully)
- ✅ Grid layout with 8 columns, scrollable for future expansion
- ✅ Selected avatar highlight with scale animation
- ✅ Avatar display in family members list with fallback to first initial

**Commits This Session:**
- `8822ffc` - Fix pizza recipe import (array recipeYield handling)
- `bcb1619` - Add nutrition feature (parser, UI, storage)
- `fe13511` - Shopping list amount editing
- `4718eae` - Avatar upload implementation (later replaced with local avatars)
- `e6700aa` - Fix avatar preview in edit mode
- `fc65071` - Improve avatar upload error logging
- `94c7637` - Fix avatar deletion logic for non-custom URLs
- `91bf65d` - Replace letter avatars with 50 fun character designs
- `911b0a4` - Make avatar picker dynamic
- `bb4c552` - Remove broken PNG, keep 7 working SVG avatars

**Next Steps for Avatar System:**
- Add 43+ more avatars from OpenMoji, Itch.io, or other free sources
- Name them sequentially: `avatar_8.png`, `avatar_9.png`, etc.
- Place in `/public/avatars/`
- No code changes needed - picker auto-detects available avatars!

---



### 1. 📅 Family Calendar ✅

**Implemented Features:**
- ✅ **Multi-View Calendar:** Day, Week, and Month views with smooth transitions
- ✅ **Family Member Color Coding:** Events display in member colors (gray for unassigned)
- ✅ **Recurring Events:** Daily, weekly, monthly, and yearly patterns with custom intervals
- ✅ **Multi-Day Events:** Events can span multiple days
- ✅ **Event Exceptions:** Edit/delete single instances, future instances, or entire series
- ✅ **Overlapping Events:** Side-by-side layout like Google Calendar (no overlapping)
- ✅ **Drag & Drop:** Move events to different times/dates with visual feedback
- ✅ **Time Slot Click:** Click any time to create event at that specific time
- ✅ **Form Validation:** End date/time cannot be before start date/time
- ✅ **Real-time Sync:** Changes appear instantly across all devices
- ✅ **Auto-Save:** All changes save automatically without manual save buttons
- ✅ **Current Time Indicator:** Red line shows current time in day/week views

**Deferred Features:**
- Calendar Sync: Integrate with Outlook, Google Calendar, and Apple Calendar
- Toggle Visibility: Show/hide individual calendars

### 2. ✅ Task, Chore & Reward Tracker

- **Per-Member Tracking:** Each family member has their own column
- **Task Types:** Daily (recurring) and one-off tasks
- **Reward System:** Earn points/stars for completed tasks, spend on rewards
- **Rewards Store:** Per-member, supports one-off and reusable rewards, disables unaffordable
- **Points Logic:** Cannot uncheck a task if points have already been spent
- **Progress Visualization:** Completion counts and points per member
- **Multiple Views:** Day, week, month, year (planned)

**Current Status:** Fully implemented and integrated ✅
**Next Phase:** Habit streak visualization, mobile polish

**Current Status:** Not started
**Next Phase:** Design database schema and UI

### 3. 🍳 Recipe Organizer & Meal Planner ✅

**Implemented Features:**
- ✅ Full recipe CRUD (create, read, update, delete)
- ✅ Ingredient library with per-user unique constraint
- ✅ Recipe ingredients with amounts and measurements
- ✅ Meal planning system with customizable meal types (breakfast, lunch, dinner, dessert, custom)
- ✅ Assign recipes to specific calendar dates
- ✅ Recipe detail viewer in meal planning modal
- ✅ Smart shopping lists with automatic ingredient combining
- ✅ Add individual ingredients to shopping list
- ✅ Add all recipe ingredients at once
- ✅ Weekly meal → shopping list integration
- ✅ Recipe source tracking in shopping list (tracks which recipes ingredients came from)
- ✅ Meal indicators on calendar (🍽️ badges)
- ✅ Kitchen-friendly UI for wall-mounted displays

**Current Status:** Fully implemented and integrated ✅
**Next Phase:** Recipe scaling (multiply ingredient amounts), dietary filtering

### Future Expansion
- Mobile apps (iOS/Android)
- Additional family organization features

---


### Current Database Schema

**tasks table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id)
- `title` (text, required)
- `description` (text, optional)
- `task_type` (text, 'daily'|'one_off')
- `points` (integer, required)
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- Realtime enabled ✅

**task_assignments table:** ✅
- `id` (bigint, primary key)
- `task_id` (bigint, foreign key → tasks.id)
- `family_member_id` (bigint, foreign key → family_members.id)
- Unique constraint on (task_id, family_member_id)
- Realtime enabled ✅

**task_completions table:** ✅
- `id` (bigint, primary key)
- `task_id` (bigint, foreign key → tasks.id)
- `family_member_id` (bigint, foreign key → family_members.id)
- `completed_date` (date)
- `points_earned` (integer)
- Unique constraint on (task_id, family_member_id, completed_date)
- Realtime enabled ✅

**member_points table:** ✅
- `id` (bigint, primary key)
- `family_member_id` (bigint, foreign key → family_members.id)
- `total_points` (integer)
- `redeemed_points` (integer)
- Unique constraint on (family_member_id)
- Realtime enabled ✅

**rewards table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id)
- `title` (text, required)
- `description` (text, optional)
- `cost` (integer, required)
- `reward_type` (text, 'reusable'|'one_off')
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- Realtime enabled ✅

**reward_assignments table:** ✅
- `id` (bigint, primary key)
- `reward_id` (bigint, foreign key → rewards.id)
- `family_member_id` (bigint, foreign key → family_members.id)
- Unique constraint on (reward_id, family_member_id)
- Realtime enabled ✅

**reward_redemptions table:** ✅
- `id` (bigint, primary key)
- `reward_id` (bigint, foreign key → rewards.id)
- `family_member_id` (bigint, foreign key → family_members.id)
- `points_spent` (integer)
- `redeemed_at` (timestamp)
- Realtime enabled ✅

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS with custom glassmorphism design
- **Database:** Supabase (PostgreSQL with real-time subscriptions)
- **Hosting:** Vercel
- **Authentication:** Supabase Auth (to be implemented)
- **Real-time Sync:** Supabase Realtime ✅
- **Design System:**
  - Animated gradient backgrounds with CSS keyframes
  - Backdrop blur effects (backdrop-blur-xl, backdrop-blur-2xl)
  - Transparent glass panels (bg-white/10, bg-white/20)
  - Custom shadows with inner glow
  - White text with drop shadows for readability

---

## Getting Started

### Prerequisites
- Node.js v24+ installed
- Supabase account and project created

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key     # server-side only
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Current Database Schema

**family_members table:** ✅
- `id` (bigint, primary key)
- `name` (text, required) - Family member's name
- `color` (text, required) - Hex color code for calendar events
- `role` (text, optional) - Parent, Child, Teen, etc.
- `avatar_url` (text, optional) - Profile picture URL
- `is_active` (boolean, default true) - Soft delete flag
- `created_at` (timestamp)
- Realtime enabled ✅

**events table:** ✅
- `id` (bigint, primary key)
- `title` (text, required)
- `date` (date, required) - Start date
- `end_date` (date, optional) - For multi-day events
- `start_time` (text, optional) - 24-hour format (HH:MM)
- `end_time` (text, optional) - 24-hour format (HH:MM)
- `description` (text, optional)
- `is_recurring` (boolean, default false)
- `recurrence_pattern` (text, optional) - daily, weekly, monthly, yearly
- `recurrence_interval` (integer, default 1) - Repeat every N days/weeks/months/years
- `recurrence_end_date` (date, optional) - When recurring series ends
- `recurrence_days` (text, optional) - JSON array for weekly recurrence (e.g., ["monday", "wednesday"])
- `created_at` (timestamp)
- Realtime enabled ✅

**event_family_members table:** ✅ (junction table)
- `id` (bigint, primary key)
- `event_id` (bigint, foreign key → events.id, cascade delete)
- `family_member_id` (bigint, foreign key → family_members.id, cascade delete)
- `created_at` (timestamp)
- Unique constraint on (event_id, family_member_id)
- Realtime enabled ✅

**event_exceptions table:** ✅
- `id` (bigint, primary key)
- `base_event_id` (bigint, foreign key → events.id, cascade delete)
- `exception_date` (date, required) - Which instance this exception applies to
- `is_deleted` (boolean, default false) - True if instance was deleted
- `modified_title` (text, optional) - Override title for this instance
- `modified_start_time` (text, optional) - Override start time
- `modified_end_time` (text, optional) - Override end time
- `modified_description` (text, optional) - Override description
- `modified_family_member_ids` (text, optional) - JSON array of member IDs for this instance
- `created_at` (timestamp)
- Unique constraint on (base_event_id, exception_date)
- Realtime enabled ✅

**recipes table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id, cascade delete)
- `name` (text, required) - Recipe name
- `instructions` (text, required) - Cooking instructions
- `prep_time` (integer, optional) - Minutes
- `cook_time` (integer, optional) - Minutes
- `servings` (integer, optional)
- `calories` (integer, optional)
- `rating` (integer, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Realtime enabled ✅

**ingredients table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id, cascade delete)
- `name` (text, required) - Ingredient name
- `created_at` (timestamp)
- Unique constraint on (user_id, name)
- Realtime enabled ✅

**recipe_ingredients table:** ✅
- `id` (bigint, primary key)
- `recipe_id` (bigint, foreign key → recipes.id, cascade delete)
- `ingredient_id` (bigint, foreign key → ingredients.id, cascade delete)
- `amount` (numeric, required) - Quantity
- `measurement` (text, required) - Units (tsp, cup, lb, etc.)
- `created_at` (timestamp)
- Unique constraint on (recipe_id, ingredient_id)
- Realtime enabled ✅

**shopping_list table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id, cascade delete)
- `ingredient_id` (bigint, foreign key → ingredients.id, cascade delete)
- `amount` (numeric, required) - Quantity
- `measurement` (text, required) - Units
- `recipe_id` (bigint, optional, foreign key → recipes.id, cascade delete)
- `recipe_counts` (jsonb, optional) - Tracks which recipes contributed this ingredient
- `created_at` (timestamp)
- Unique constraint on (user_id, ingredient_id, measurement)
- Realtime enabled ✅

**meal_types table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id, cascade delete)
- `name` (text, required) - Meal type name (Breakfast, Lunch, Dinner, Dessert, custom)
- `sort_order` (integer, default 0) - Display order
- `created_at` (timestamp)
- Unique constraint on (user_id, name)
- Default meal types seeded on first access
- Realtime enabled ✅

**meal_plans table:** ✅
- `id` (bigint, primary key)
- `user_id` (uuid, foreign key → auth.users.id, cascade delete)
- `recipe_id` (bigint, foreign key → recipes.id, cascade delete)
- `date` (date, required) - Meal date
- `meal_type` (text, required) - Meal category name
- `created_at` (timestamp)
- Unique constraint on (user_id, date, meal_type)
- Realtime enabled ✅

---

## Project Structure

```
skylight-calendar/
├── app/
│   ├── api/
│   │   ├── google-auth/
│   │   │   ├── route.ts                    # OAuth initiation
│   │   │   └── callback/route.ts           # OAuth token exchange + calendar import
│   │   ├── google-calendar/
│   │   │   ├── sync/route.ts               # Event sync (multi-account, timezone-safe)
│   │   │   └── disconnect/route.ts         # Account disconnect (per-account or all)
│   │   └── parse-recipe/                   # Recipe URL scraper
│   ├── components/
│   │   ├── AddEventModal.tsx               # Event creation/editing modal
│   │   ├── CalendarView.tsx                # Main calendar (day/week/month, G badge, external events)
│   │   ├── ExternalEventDetailModal.tsx    # Read-only Google event detail popup
│   │   ├── FamilyMembers.tsx               # Family member management
│   │   ├── RecipesView.tsx                 # Recipe CRUD
│   │   ├── ShoppingListView.tsx            # Shopping list
│   │   ├── MealPlanModal.tsx               # Meal planning
│   │   ├── SettingsModal.tsx               # App settings + Google Calendar integration UI
│   │   └── ...                             # Tasks, Rewards, etc.
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                            # Main app, external event wiring, modal orchestration
├── lib/
│   ├── supabase.ts                         # Client-side Supabase
│   ├── supabase-admin.ts                   # Server-side admin client (lazy init, build-safe)
│   └── dateUtils.ts                        # Date formatting utilities
├── supabase_migration_*.sql                # All DB migrations (run in order)
├── .env.local                              # Environment variables (not in git)
├── DEV_PROFILE.md                          # Developer context & learning profile
├── GOOGLE_CALENDAR_INTEGRATION.md         # Google Calendar integration docs
└── README.md                               # This file
```

---

## Current Progress

### ✅ Completed (Phase 1: Calendar MVP)

**Infrastructure:**
- ✅ Next.js 15 project setup with TypeScript
- ✅ Tailwind CSS configuration with custom design system
- ✅ Supabase project created and connected
- ✅ Real-time database sync across all tables
- ✅ Complete database schema (4 tables with relationships)
- ✅ Auto-save functionality (no save buttons needed)

**Family Members System:**
- ✅ Family member CRUD operations
- ✅ Color picker for each member
- ✅ Role assignment (Parent, Child, Teen, etc.)
- ✅ Soft delete (is_active flag)
- ✅ Real-time sync for member changes

**Calendar Features & Filtering:**
- ✅ Three view modes: Day, Week, Month
- ✅ Family member visibility filtering (checkbox toggles in header)
- ✅ Unassigned events filter toggle
- ✅ Event creation with detailed form
- ✅ Multi-day event support
- ✅ Start/end time selection (15-minute increments)
- ✅ Event description field
- ✅ Family member assignment (multi-select)
- ✅ Form validation (end time/date after start)
- ✅ Gray color for unassigned events
- ✅ Gradient colors for multi-member events
- ✅ Drag & drop event rescheduling
- ✅ Click time slot to create event
- ✅ Current time indicator (red line)
- ✅ Meal icons on every day (🍽️ badges with counts)
- ✅ Wall-mounted display optimization (no page scroll, section-specific scrolling)

**Recurring Events:**
- ✅ Pattern selection (daily, weekly, monthly, yearly)
- ✅ Custom interval (every N days/weeks/months/years)
- ✅ Weekly day selection (choose specific days)
- ✅ Recurrence end date
- ✅ Edit single instance vs. all instances vs. future instances
- ✅ Delete single instance vs. all instances vs. future instances
- ✅ Event exceptions table for instance modifications

**Event Display:**
- ✅ Side-by-side layout for overlapping events (no overlapping)
- ✅ Automatic column calculation for concurrent events
- ✅ Dynamic width adjustment based on overlaps
- ✅ All-day events in dedicated row
- ✅ Time-based events in hourly grid

**Design System:**
- ✅ Glassmorphism aesthetic throughout
- ✅ Animated multi-color gradient background
- ✅ Transparent glass panels with backdrop blur
- ✅ Subtle white borders for glass edges
- ✅ White text with drop shadows
- ✅ Smooth hover animations and scale effects
- ✅ Custom shadow with inner glow effects
- ✅ Toast notifications with auto-dismiss (success/error tones)

### 📖 Phase 3: Recipes & Meal Planning (Completed Feb 7, 2026) ✅

**Recipe Management:**
- ✅ Recipe CRUD operations (create, read, update, delete)
- ✅ Structured ingredient management with per-user unique constraint
- ✅ Recipe nutritional information (prep time, cook time, servings, calories, rating)
- ✅ Full recipe detail modal with ingredient list and instructions

**Shopping List System:**
- ✅ Smart ingredient combining (automatically merges duplicate ingredients)
- ✅ Add individual ingredients to shopping list
- ✅ Bulk add all recipe ingredients to shopping list
- ✅ Recipe source tracking (tracks which recipes contributed each ingredient)
- ✅ Automatic amount calculation when adding same ingredient multiple times
- ✅ Manual shopping list item adding with autocomplete

**Meal Planning Integration:**
- ✅ Customizable meal types per user (Breakfast, Lunch, Dinner, Dessert, custom)
- ✅ Assign recipes to specific dates and meal types
- ✅ Meal planning modal with recipe dropdown and detail viewer
- ✅ Meal indicators on calendar (🍽️ badges visible on all calendar views)
- ✅ Weekly meal-to-shopping-list aggregation
- ✅ One-click "Add Week's Meals to Shopping List" button
- ✅ Recipe detail popup within meal planning modal (ingredients, instructions, stats)

### 🎨 Phase 3b: UI/UX Improvements (Completed Feb 7, 2026) ✅

**Layout Optimization for Wall-Mounted Displays:**
- ✅ Removed page-wide scrolling (changed from `min-h-screen` to `h-screen overflow-hidden`)
- ✅ Implemented section-specific scrolling (sidebar, calendar, recipes, shopping list each scroll independently)
- ✅ All content fits on single screen without page-wide scroll
- ✅ Perfect for touch-screen wall mount displays

**Toast Notification System:**
- ✅ Replaced all 16 `alert()` popups with auto-dismissing toasts
- ✅ 2.5-second auto-dismiss for non-blocking notifications
- ✅ Success toasts: Green styling (success actions like adding ingredients)
- ✅ Error toasts: Red styling (validation errors, failed operations)
- ✅ Consistent styling across all components and modals
- ✅ Toast notification system integrated into main page layout
1. Implement authentication (Supabase Auth)
2. Multi-user support with row-level security
3. Build habit tracker module
4. Build recipe organizer module
5. Mobile responsive design refinements
6. Add calendar sync integrations (Google, Outlook, Apple)

---

## Development Notes

See [DEV_PROFILE.md](./DEV_PROFILE.md) for:
- Developer experience level and learning areas
- Teaching preferences for AI assistance
- Technical decision rationale
- Project timeline and insights

---

## Features Showcase

### Event Validation
- End date must be on or after start date
- End time must be after start time (for same-day events)
- Real-time validation feedback in the form

### Smart Event Coloring
- **No assigned members:** Gray (#9CA3AF)
- **One member:** Member's assigned color
- **Multiple members:** Gradient combining all member colors

### Overlapping Event Layout
Events scheduled at the same time display side-by-side with automatic width adjustment:
- Detects time overlaps across all events in a day
- Assigns columns to prevent visual overlap
- Calculates percentage-based widths and offsets
- Maintains proper z-index layering

### Recurring Event Flexibility
- **Update single instance:** Creates exception for that date only
- **Update future instances:** Ends current series, creates new series from that date
- **Update all instances:** Modifies base event, applies to all occurrences
- Same logic applies to deletions

## Timeline

- **Started:** February 5, 2026
- **Calendar MVP:** February 6, 2026 ✅
- **Recipes & Meal Planning:** February 7, 2026 ✅
- **UI/UX Optimizations:** February 7, 2026 ✅
- **Authentication & Multi-user:** February 2026 ✅
- **Task & Reward System:** February 12, 2026 ✅
- **Google Calendar Integration (v1):** March 5, 2026 ✅
- **Google Calendar Integration (v2 — multi-account, multi-member, detail popup):** March 6, 2026 ✅
- **Production Deployment:** March 6, 2026 ✅ → https://charlie-calendar.vercel.app
