# Developer Profile & Project Context

**Last Updated:** March 17, 2026
**Developer:** jrigb
**Project:** Skylight-style Calendar Application
**Current Phase:** Multi-Currency Tasks + Sleep Mode + Calorie Counter planned | Production Live ✅ → https://charlie-calendar.vercel.app

---

## 🎯 Project Goal

Build a custom calendar/family organizer application similar to Skylight Calendar with:
- **Auto-save functionality** (no manual save buttons required)
- **Persistent sessions** (no forced logouts)
- Real-time updates across devices
- Clean, intuitive family-friendly interface
- Recipe planning with shopping list integration
- Family member avatars and visual identity
- External calendar integration (Google Calendar read-only, bidirectional future)

---

## 🔜 Upcoming Tasks (Next Sessions)

1. **Multi-Currency Reward System** *(highest priority)*
   - Preset currencies: ⭐ Stars, 💪 Muscles, ❤️ Heart, 🎮 Game Points, 🏆 Trophy
   - Tasks can award one OR multiple currency types simultaneously
   - Rewards in the store are priced in a specific currency (only spendable with matching currency)
   - Per-member balances tracked per currency type
   - DB: new `reward_currency_types` table; `task_currency_rewards` junction (task_id, currency_type, amount); `member_currency_balances` table; `rewards` gains `currency_type` column
   - UI: task creation shows currency pickers with amounts; reward tile shows which currency it costs; member column header shows balance per currency type

2. **Grouped / Habit-Linked Tasks**
   - A task can have sub-items (e.g. "Bedtime Routine" → Brush teeth, Floss, Read)
   - Sub-item checkboxes shown inline on the task tile
   - Points/currencies only awarded when ALL sub-items are checked
   - DB: new `task_sub_items` table (task_id, label, order); `task_sub_completions` (completion_id, sub_item_id, checked)
   - UI: expanded tile shows inline checklist; completion circle grayed out until all checked

3. **Rotating Tasks**
   - A task is assigned to a rotating list of family members rather than one fixed member
   - Rotation trigger is configurable per task: **on completion** (next person after current marks done) OR **on scheduled date** (auto-rotates on due date)
   - DB: `task_rotation_members` (task_id, member_id, order); `tasks` gains `rotation_mode` ('completion' | 'date') and `current_rotation_index`
   - UI: task creation has a "Rotating" toggle and member selector with ordering; current assignee shown on tile with "next up" indicator

4. **Flexible Task Recurrence**
   - Extends existing recurrence to support every X days, every X weeks, every X months
   - Shares UI pattern with existing recurrence (interval + unit dropdown)

5. **Sleep Mode**
   - Manual-only: dedicated 🌙 Sleep button above ⚙️ Settings in the left sidebar
   - Full-screen overlay showing a photo slideshow from admin-uploaded images
   - Photos stored in Supabase Storage; admin uploads in Settings; configurable which photos are used
   - Tap or click anywhere to dismiss
   - No auto-trigger / inactivity timer
   - DB: `sleep_photos` table (id, storage_path, display_order, is_enabled)

6. **Calorie Totals in Meal Plan**
   - Daily calorie total summed across all meal slots in the week grid
   - Uses existing `recipe_nutrition` macros (calories field) and per-recipe serving size
   - Displayed per-day column at the bottom of the Meal Plan week grid
   - No per-member breakdown, no goals — raw totals only

7. **Mobile Optimization** ✅ *(done — see Phase 14 & 15 below)*
   - PWA foundation: `@ducanh2912/next-pwa`, manifest.json, SVG icons, ViewPort meta tags
   - BottomNav tab bar (fixed at bottom on mobile, hidden on desktop)
   - Separate mobile/desktop headers for CalendarView, TasksView, RewardsView, MealPlanWeekView
   - Single-member-at-a-time layout for Tasks and Rewards on mobile (avatar picker switcher)
   - Avatar filter row wraps instead of overflowing; html/body overflow-x: hidden guard added
   - MealPlanWeekView: full day-by-day view on mobile (`mobileDayIndex`, prev/next day, single-day Generate)
   - `max-w-[100vw]` baked into SectionCard — no section can cause horizontal overflow
   - Swipe navigation on all 3 views via `lib/useSwipe.ts` (Phase 15)
   - Calendar month view: tap any day cell to jump to day view for that date (Phase 15)

8. **Ingredient Aliases** ✅ *(done — see Phase 15 below)*
   - `aliases TEXT[]` column on `ingredients` table with GIN index
   - Autocomplete + import matching checks aliases before creating new ingredient rows
   - `IngredientsTab.tsx` — 3rd tab in Recipes section: list all ingredients, add/remove aliases, merge duplicates
   - Merge flow: reroutes `recipe_ingredients` + `shopping_list` rows, copies name as alias, deletes duplicate

9. **Space Theme** *(lower priority)*
   - Galaxy background, glowing borders, star field

10. **Seasonal Auto-Theme** *(lower priority)*
    - Halloween / Christmas / Easter / Fall / Spring auto-switching by date range

---
## Recent Session Summary (March 17, 2026)

**Duration:** ~1 session
**Accomplishments:**

### Phase 15: Ingredient Aliases + Swipe Navigation + Mobile Polish

1. **Overflow & State Fixes (Phase 14 follow-up)**
   - Added `max-w-[100vw]` to `SectionCard` base styles — applies globally to every view
   - Added `max-w-[100vw]` to main content wrapper in `page.tsx`
   - Fixed `handleAddWeekMealsToList` stale state bug: now queries DB directly with date range filter (was reading React `mealPlans` state that could be stale after a clear)
   - MealPlanWeekView recipe pills: `min-w-0 overflow-hidden` on container + `block truncate` on text spans — pills never expand column width
   - Single-day Generate on mobile: `openGenerateModal(targetDateISO?)` + `handleGeneratePlan(targetDateISO?)` fills only the target day's empty slots; `weekUsedIds` still seeded from all week plans (no cross-day duplicates)

2. **Swipe Navigation — `lib/useSwipe.ts`**
   - New hook: `useSwipe({ onSwipeLeft, onSwipeRight, threshold? = 50 })` → `{ onTouchStart, onTouchEnd }`
   - Guards: `|deltaX| > threshold` AND `|deltaX| > |deltaY|` (prevents scroll triggering swipe)
   - `SectionCard` extended to accept `...HTMLAttributes<HTMLDivElement>` (`{...divProps}` spread on root div)
   - **CalendarView**: swipe left/right = next/prev; guard: `if (view !== 'week' || isMobile)` avoids desktop week-grid conflict; month day cell `onClick` navigates to day view for that date
   - **TasksView**: swipe left/right = next/previous day
   - **MealPlanWeekView**: two separate hook calls — `mobileSwipe` on mobile container (mobilePrevDay/mobileNextDay), `desktopSwipe` on desktop header div (goToPrevWeek/goToNextWeek)

3. **Ingredient Aliases**
   - New migration: `supabase_migration_ingredient_aliases.sql` — `aliases TEXT[] NOT NULL DEFAULT '{}'` + GIN index on `ingredients`
   - `AddRecipeModal`: `Ingredient` type gains `aliases?: string[]`; `loadIngredients` and `createNewIngredient` select `aliases`; `getFilteredIngredients` autocomplete checks aliases; `selectOrCreateIngredient` and `handleImportRecipe` both check `.some(a => a.toLowerCase() === nameLower)` before creating a new row
   - New `IngredientsTab.tsx` (3rd tab in Recipes: `🥕 Ingredients`):
     - Alphabetical ingredient list with alias chips (add / ✕ remove)
     - Inline "Add alias" form per ingredient
     - Merge flow: select target from dropdown → ✓ (green 28px circle) confirms, ✕ (neutral 28px circle) cancels
     - Merge executes 4 Supabase calls: reroute `recipe_ingredients` → reroute `shopping_list` → append source name+aliases to target `aliases[]` → delete source
     - Merge dropdown: `min-w-0 flex-1 truncate` prevents long names from overflowing the flex row
   - `RecipesView` PillToggle: 3 items now (`🍳 Recipes | 📅 Meal Plan | 🥕 Ingredients`)

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
- `app/components/MealPlanWeekView.tsx` — useSwipe (two calls), pill truncation, single-day generate

---
## Previous Session Summary (March 16, 2026)

**Duration:** ~1 session
**Accomplishments:**

### Phase 14: PWA Foundation + Mobile Optimization

1. **PWA Infrastructure**
   - Installed `@ducanh2912/next-pwa` + `workbox-window`
   - Created `public/manifest.json` — name, icons, theme_color `#667eea`, display: standalone
   - Created `public/icons/icon-192.svg` and `icon-512.svg` — purple gradient calendar placeholder icons
   - Updated `app/layout.tsx` — `Viewport` export with `themeColor`, `viewportFit: "cover"`, `appleWebApp` meta, manifest link
   - Updated `next.config.ts` — wrapped with `withPWA()`, NetworkFirst for `/api/` + Supabase routes, `turbopack: {}` to silence Turbopack/webpack conflict
   - Added `public/sw.js`, `public/workbox-*.js` to `.gitignore`

2. **BottomNav Component**
   - New `app/components/BottomNav.tsx` — fixed bottom tab bar, `md:hidden`
   - Tabs: Calendar / Recipes / Lists / Tasks / Rewards / Settings
   - `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator safe area
   - Integrated into `app/page.tsx` — sidebar `hidden md:flex`, content `pb-14 md:pb-0`

3. **CalendarView Mobile Header**
   - Completely separate mobile/desktop header JSX blocks
   - Mobile Row 1: `← [Month Year / Day date] →` (compact, `size="sm"`)
   - Mobile Row 2: `[Day|Month] Today Sync +` (all `size="sm"`, fits 375px)
   - Mobile Row 3: `AvatarFilterGroup` with `flex-wrap` (wraps instead of overflowing)
   - `isMobile` state + resize listener auto-switches week → day view on mobile
   - Week view option hidden on mobile (7 columns can't fit 375px)

4. **TasksView Mobile Header**
   - Replaced `grid grid-cols-3` layout with `← [label / date] → [+]` flex row
   - Member picker row (mobile only): avatar circles, tap to switch visible member column
   - Desktop: all member columns still shown side-by-side (unchanged)

5. **RewardsView Mobile Header**
   - Mobile member picker row added below the Rewards/History toggle
   - Single-member-at-a-time on mobile (`hidden md:flex` on non-selected columns)
   - Desktop: all member columns unchanged

6. **MealPlanWeekView Mobile Header**
   - Row 1: `← [Mar 15–21, 2026] →`
   - Row 2: Today / Clear / Generate / Add to List (flex-wrap)
   - Desktop: original `text-4xl` heading + full button row (unchanged)
   - Fixed overflow: `RecipesView` container padding reduced to `px-3 md:px-6` for mobile; header `px-4 md:px-6 pt-4 md:pt-6`; title `text-lg md:text-2xl`

7. **Global Overflow Guard**
   - Added `html, body { overflow-x: hidden }` to `globals.css`

8. **Google OAuth Discussion**
   - Requesting `auth/calendar` (full read+write) = Restricted scope → security audit required for public publish
   - Resolution for family app: add test users in Google Cloud Console OAuth consent screen (up to 100, bypasses warning completely, no audit needed)

**New Files:**
- `public/manifest.json`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`
- `app/components/BottomNav.tsx`

**Modified Files:**
- `next.config.ts` — withPWA wrapper + turbopack fix
- `app/layout.tsx` — Viewport export, PWA meta tags
- `app/page.tsx` — BottomNav integration, sidebar mobile hide, content padding
- `app/globals.css` — overflow-x: hidden on html/body
- `app/components/CalendarView.tsx` — full mobile header rewrite, isMobile state
- `app/components/TasksView.tsx` — mobile header + single-member picker
- `app/components/RewardsView.tsx` — mobile member picker
- `app/components/MealPlanWeekView.tsx` — mobile header
- `app/components/RecipesView.tsx` — mobile padding adjustments
- `app/components/ui/AvatarFilterGroup.tsx` — flex-wrap on container
- `.gitignore` — SW build output files

---
## Recent Session Summary (March 6, 2026)

**Duration:** ~1 session
**Accomplishments:**

### Phase 8: Meal Plan Week View in Recipes Section

1. **Architecture**
   - Added a `🍳 Recipes` / `📅 Meal Plan` pill toggle to the top-right of the Recipes section header
   - Toggle lives inside `RecipesView` — no new nav item needed
   - `MealPlanWeekView` is self-contained: fetches its own `meal_plans` + `meal_types` + recipe names per week

2. **New Component: `MealPlanWeekView.tsx`**
   - Week grid: meal type rows × 7 day columns
   - Week navigation: Prev / Today / Next buttons (right-aligned, matching calendar style)
   - Week range label as large (`text-4xl`) left-aligned heading matching CalendarView style
   - Today's column highlighted
   - Seeds default meal types (Breakfast/Lunch/Dinner/Dessert) if none exist
   - Filled cells: recipe name pill (2-line clamp, no overflow distortion) + red ✕ remove button
   - Empty cells: `+` button opens day MealPlanModal
   - Clicking a recipe pill opens a full read-only recipe detail modal (ingredients, instructions, macros, stats)
   - Remove button deletes the `meal_plans` row and updates the grid instantly (no reload)

3. **Live Refresh After Saving**
   - Added `mealPlanRefreshKey` counter in `page.tsx`
   - `MealPlanModal`'s `onRefresh` now increments the counter
   - Counter flows as `mealRefreshKey` prop → `RecipesView` → `MealPlanWeekView`
   - `useEffect` in `MealPlanWeekView` depends on `refreshKey`, so any modal save triggers immediate re-fetch

4. **Props Chain**
   - `page.tsx`: passes `weekStartDay`, `onMealDayClick`, `mealRefreshKey` to `RecipesView`
   - `RecipesView`: forwards `weekStartDay`, `onDayClick`, `refreshKey` to `MealPlanWeekView`

**New Files:**
- `app/components/MealPlanWeekView.tsx`

**Modified Files:**
- `app/components/RecipesView.tsx` — toggle, subView state, new props
- `app/page.tsx` — mealPlanRefreshKey state, wired to MealPlanModal onRefresh

---

## Previous Session Summary (March 5–6, 2026)

**Duration:** ~2 sessions
**Accomplishments:**

### Phase 7: Google Calendar Integration

1. **Planning & Architecture**
   - Decided on read-only sync with `googleapis` package (future-proofs bidirectional)
   - Tokens stored server-side only in Supabase, never in client storage
   - Events cached in `external_events` table, background sync on load if stale

2. **v1 Implementation (March 5)**
   - Created `supabase_migration_google_calendar.sql` (3 new tables)
   - Built 4 API routes: `google-auth`, `google-auth/callback`, `google-calendar/sync`, `google-calendar/disconnect`
   - Updated `SettingsModal`, `CalendarView`, `page.tsx` for single-account integration

3. **v2 Enhancements (March 6) — 4 user-requested features:**
   - **Multiple Google accounts**: `google_email` column, UNIQUE`(user_id, provider, google_email)`, `integration_id` FK — Settings groups calendars under account email headers
   - **Multiple family members per calendar**: `family_member_ids text` JSON array replaces `family_member_id bigint` — avatar toggle buttons in Settings
   - **Clickable read-only popups**: `ExternalEventDetailModal` with G badge, date/time, calendar name, email, member pills, description
   - **Google G badge**: Gradient circle on all external events in every calendar view

4. **Production Fixes (March 6)**
   - Build failure: `supabaseAdmin` created at module load — fixed with lazy Proxy + `Reflect.get` to preserve `this` binding
   - Timezone bug: `new Date(dateTime).toISOString()` converts to UTC on Vercel — fixed by splitting RFC 3339 string directly
   - Sync skipping all calendars: `integration_id` NULL on pre-v2 rows — fixed with `.or('integration_id.eq.X,integration_id.is.null')`
   - Disconnect 500: Proxy `this`-binding — fixed with `.bind(client)`
   - OAuth redirect to localhost: Added `NEXT_PUBLIC_APP_URL` to Vercel env vars
   - Google authorization error: Production callback URL missing from Google Cloud Console
   - SQL syntax error: `ADD CONSTRAINT IF NOT EXISTS` not valid in PostgreSQL

**Next Steps:**
- Run v2 backfill query if not done yet (`UPDATE external_calendars SET integration_id = ... WHERE integration_id IS NULL`)
- Reconnect Google account once to populate `google_email` in `user_integrations`
- Future: bidirectional sync (expand OAuth scope, use `syncToken`)

---

## Previous Session Summary (Feb 12, 2026)

**Duration:** ~3 hours
**Accomplishments:**

1. **Built Task & Reward System**
  - Designed and implemented full-featured task/chore tracker
  - Per-family-member columns (Skylight-style) for both tasks and rewards
  - Daily and one-off task types, with points/stars system
  - Rewards store: per-member, supports one-off and reusable rewards, disables unaffordable
  - All CRUD via Supabase client, no API routes
  - Real-time sync for all tables (tasks, rewards, completions, points)
  - Added AddTaskModal, AddRewardModal, TasksView, RewardsView components
  - Updated navigation and FamilyMembers sidebar for points
  - Created and ran SQL migrations for all new tables (tasks, task_assignments, task_completions, member_points, rewards, reward_assignments, reward_redemptions)

2. **Logic Fix: Prevent Points Exploit**
  - Fixed bug: users cannot uncheck a completed task if those points have already been spent on rewards (prevents negative balances)
  - Added toast notification if unchecking is blocked

3. **UI/UX:**
  - Rewards tab and view mirrors task layout, with per-member columns and redeem logic
  - All new features match glassmorphism design and real-time updates

**Next Steps:**
- Authentication and multi-user support
- Mobile responsiveness polish

3. **Shopping List Enhancement**
   - Added inline amount/measurement editing
   - Save/cancel controls for each item
   - Item-level granularity (each recipe source editable independently)
   - Deployed successfully

4. **Family Member Avatar System**
   - Tried Supabase Storage upload approach (Option 1)
   - Hit RLS policy issues and storage bucket complexity
   - Switched to Option 3: Curated local avatar library ✅
   - Created 50 professional SVG avatars (animals, robots, objects, characters)
   - Implemented dynamic avatar picker (8-column grid, scrollable)
   - Supports multiple formats: SVG, PNG, JPG, GIF, WebP
   - Smart error handling for broken/missing avatars
   - 7 working SVGs currently in production
   - User uploaded 1 PNG (corrupted/failed to load, removed)
   - Avatar system ready for user to add more via file downloads

5. **Architecture Decision Made**
   - Simplified from "upload to Supabase Storage" to "local avatar library"
   - All avatars served from `/public/avatars/`
   - No Supabase Storage bucket setup needed
   - No RLS policies needed
   - Infinitely scalable (add as many as needed)
   - All 50+ calendars share same avatar library
   - Much simpler codebase

**Code Decisions:**
- Made avatar picker dynamic (loads only existing files)
- Removed hardcoded AVATAR_COUNT constant
- Added broken image error handling to hide missing avatars gracefully
- Supports both SVG and PNG/JPG avatars in same system

**Deployed Commits:**
- `8822ffc` - Pizza recipe import fix
- `bcb1619` - Nutrition feature complete
- `fe13511` - Shopping list amount editing
- `94c7637` - Avatar URL validation fix (handled dicebear/storage formats)
- `91bf65d` - Replaced boring letter avatars with 50 fun designs
- `911b0a4` - Made avatar picker dynamic
- `bb4c552` - Production push with 7 working avatars

**Next Steps for Avatar System:**
- User to download avatars from OpenMoji/Itch.io/etc
- Name: `avatar_8.png`, `avatar_9.png`, etc. (continuing numbering)
- Place in `/public/avatars/`
- No code changes needed ever - system auto-detects

---

## 👨‍💻 Developer Experience Level

### Strong Areas ✅
- **3 years of software development experience**
- TypeScript/JavaScript proficiency
- Working in enterprise platforms (Faciliq/similar system)
- HTML/CSS
- Logic and business rules implementation
- UI component development
- React experience (a few years ago)
- **Quick iteration and testing** in dev environment
- **Real-time debugging** with console logging

### Past Experience (Rusty) 🕰️
- **Python & Django** (bootcamp, 3 years ago - only a few months of hands-on)
- **Terminal/Console commands** (bootcamp, 3 years ago - will need guidance)

### Learning Areas 🌱
- **Database design & management** (now gaining hands-on experience with Supabase)
- **Web hosting & deployment** (servers, cloud platforms, DevOps)
- **Backend/API development** (endpoints, server-side logic)
- **Real-time data synchronization** (actively using Supabase Realtime)
- **Authentication & session management** (next priority)
- **Terminal/command line workflows** (improving with git usage)

### Current Work Environment
- Works in a proprietary system that abstracts:
  - Database operations (handled automatically)
  - Hosting and deployment
  - API endpoints
  - Data persistence
- Writes TypeScript/JavaScript within this managed environment
- Now working with raw database (Supabase) - learning in progress!

---

## 🎓 Teaching Preferences

### How to Help Me Best
1. **Explain concepts as we implement them** - don't assume database/hosting knowledge
2. **Provide working examples** - I learn by seeing it work
3. **Step-by-step guidance** for infrastructure/database tasks
4. **Quick iteration cycles** - I want to see changes immediately
5. **Explain the "why"** - help me understand architectural decisions
6. **Explain terminal commands** - provide context for what each command does
7. **Acknowledge when I make good technical decisions** - validates my learning

### What I DON'T Need
- Basic programming concepts (variables, functions, conditionals)
- JavaScript/TypeScript syntax help (unless it's advanced)
- Hand-holding with UI/component logic

---

## 🛠️ Tech Stack Decisions

### Chosen Stack ✅
- **Frontend Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL with real-time subscriptions)
- **Hosting:** Vercel (seamless Next.js deployment)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **Static Assets:** Next.js `/public` folder for avatars (no storage service needed)

### Why This Stack
- **Supabase:** Real-time sync out of the box, simple auto-save, built-in auth, excellent learning UI for database concepts
- **Vercel:** Deploys Next.js in seconds, free tier, git-based workflow
- **Next.js + Tailwind:** Modern, fast development, excellent DX with hot reload
- **Local static assets:** Keeps architecture simple, no external dependencies for avatars
- All services have generous free tiers

### Key Requirements
- **Fast development feedback loop** (hot reload, instant updates)
- **Auto-save capabilities** (no manual save buttons)
- **Real-time sync** across devices
- **Simple deployment process**
- **Persistent user sessions**
- **Scalability** without per-user storage costs

---

## 📋 Project Status

**Phase:** Features Complete ✅ | Now Ready for Authentication & Multi-user Support
**Current Date:** February 10, 2026
**Next Priority:** Multi-user authentication setup

### Completed (February 5-10, 2026)

**Day 1 - Foundation (Feb 5):**
- ✅ Defined project goals and full feature roadmap
- ✅ Identified learning needs
- ✅ Created developer profile
- ✅ Chose tech stack (Next.js 15, Supabase, Vercel, Tailwind)
- ✅ Set up development environment
- ✅ Created Next.js project structure
- ✅ Connected Supabase database
- ✅ Built first working prototype (events calendar with real-time sync)
- ✅ Implemented auto-save functionality
- ✅ Created initial database schema (events table)

**Day 2 - Full Calendar Implementation (Feb 6):**
- ✅ Designed and implemented Family Members system
  - Created family_members table
  - Built family member management UI
  - Implemented color coding system
  - Added role assignment
  - Real-time sync for members

- ✅ Enhanced Calendar Features
  - Added Day/Week/Month view modes
  - Implemented multi-day events (end_date field)
  - Added start_time and end_time fields
  - Built time slot selection (15-min increments)
  - Created form validation (end after start)
  - Implemented event-member junction table
  - Added gray color for unassigned events
  - Built gradient colors for multi-member events
  - Implemented drag & drop event rescheduling
  - Added click-to-create on time slots
  - Added current time indicator

- ✅ Recurring Events System
  - Created recurrence fields on events table
  - Implemented daily/weekly/monthly/yearly patterns
  - Added custom interval support
  - Built weekly day selection
  - Created event_exceptions table
  - Implemented edit single/future/all logic
  - Implemented delete single/future/all logic
  - Built scope selection dialogs

- ✅ Overlapping Events Layout
  - Implemented Google Calendar-style side-by-side layout
  - Built overlap detection algorithm
  - Created column assignment logic
  - Calculated dynamic widths and offsets
  - Ensured proper z-index layering

- ✅ Glassmorphism Design System
  - Created animated gradient background (CSS keyframes)
  - Implemented frosted glass aesthetic throughout
  - Added backdrop-blur effects (xl, 2xl)
  - Built transparent glass panels (white/10, white/20)
  - Applied custom shadows with inner glow
  - Updated all text to white with drop shadows
  - Added subtle white borders for glass edges
  - Implemented smooth hover animations
  - Applied consistent design across all components

**Phase 2 - Calendar Filtering & Meal Planning (Feb 7, 2026):**
- ✅ Calendar family member filtering
  - Checkbox toggles for each family member in header
  - Unassigned events filter toggle
  - Visibility logic: show event if unassigned+enabled or at least one member visible
  - Dark opaque filter background for readability

- ✅ Meal planning database & system
  - Created meal_types table (customizable per user)
  - Created meal_plans table (recipe → date → meal_type)
  - Auto-seeded default meal types (Breakfast, Lunch, Dinner, Dessert)
  - MealPlanModal component for recipe assignment
  - Meal type CRUD with custom type adding

- ✅ Calendar meal icons (🍽️ badges)
  - Meal indicators on every day (day, week, month views)
  - Icons styled: transparent when no meals, orange when meals assigned
  - Count badge displayed when meals present (🍽️2)
  - Click to open MealPlanModal for that day
  - Tooltips explaining functionality

- ✅ Weekly meal shopping integration
  - "Add Week's Meals to Shopping List" button
  - Calculates current week range (Sunday-Saturday)
  - Filters meal_plans by date range
  - Loads recipes with recipe_ingredients JOIN ingredients
  - Combines ingredients across multiple recipes
  - Upserts to shopping_list with amount addition
  - Toast notification with results (X recipes, Y ingredients)

- ✅ Recipe detail viewer in meal planning
  - View button next to assigned recipes
  - Nested modal popup showing full recipe data
  - Displays recipe stats: prep time, cook time, servings, calories
  - Shows all ingredients with amounts and measurements
  - Shows full cooking instructions
  - Similar styling to RecipesView detail modal

**Phase 3 - Recipe & Shopping System (Feb 7, 2026):**
- ✅ Recipe management system
  - recipes table with nutritional metadata
  - Recipe CRUD operations (create, read, update, delete)
  - Recipe detail modal with full ingredient list
  - Recipe editor with instruction formatting
  - Dropdown menu with edit/delete options
  - Search and organization capabilities

- ✅ Ingredient management
  - ingredients table with per-user unique constraint
  - recipe_ingredients junction table for relationships
  - Amount and measurement fields
  - Structured ingredient storage and retrieval

- ✅ Shopping list system
  - shopping_list table with persistence
  - recipe_counts JSONB field for source tracking
  - Smart ingredient combining (UNIQUE on user_id+ingredient_id+measurement)
  - Auto-merge when same ingredient added multiple times
  - Manual amount addition when combining

- ✅ Shopping list UI
  - ShoppingListView component with ingredient display
  - Add single ingredients from recipes
  - "Add ALL Ingredients to Shopping List" bulk button
  - Manual item adding with autocomplete
  - Toast notifications for add operations
  - Ingredient grouping by ingredient_id

- ✅ Complex database queries
  - Multi-table JOINs (recipes → recipe_ingredients → ingredients)
  - Upsert logic with conflict resolution
  - UNIQUE constraint enforcement
  - Aggregate operations for meal planning

**Phase 3b - UI/UX Optimizations (Feb 7, 2026):**
- ✅ Wall-mounted display layout
  - Changed outer container from `min-h-screen` to `h-screen overflow-hidden`
  - Each section handles own internal scrolling
  - No page-wide scroll (perfect for wall mounts)
  - Sidebar scrolls independently
  - Calendar scrolls internally (for 24-hour day view)
  - Recipes/Shopping list have own scroll areas
  - All content fits on single screen without page scroll

- ✅ Toast notification system
  - Replaced all 16 `alert()` popups with toasts
  - 2.5-second auto-dismiss
  - Success tone: bg-green-500/20, border-green-500/40, text-green-100
  - Error tone: bg-red-500/20, border-red-500/40, text-red-100
  - Non-blocking UX improvements
  - Consistent styling across all components
  - Fixed position at top-right of screen
  - System integrated into main page layout

- ✅ Modal prop updates
  - Added onShowToast prop to AddEventModal
  - Added onShowToast prop to MealPlanModal
  - All validation errors now use toasts
  - All success messages now use toasts
  - Recipe errors (add/update/delete) use toasts

### Next Steps (Phase 4)
- [ ] Implement authentication (Supabase Auth)
- [ ] Add row-level security (RLS) for multi-user support
- [ ] Build user profile management
- [ ] Create family/household grouping
- [ ] Mobile responsive design refinements
- [ ] Build habit tracker module
- [ ] Add calendar sync integrations (Google, Outlook, Apple)
- [ ] Recipe scaling/multiplier functionality
- [ ] Dietary restriction filtering

---

## 💡 Key Insights from Previous Conversations

### Concepts Learned During Development

**Database Design:**
- Junction tables for many-to-many relationships (event_family_members)
- Soft deletes with boolean flags (is_active)
- Event exceptions pattern for recurring event modifications
- Cascade delete for referential integrity
- Unique constraints for data validation

**Real-time Synchronization:**
- Supabase realtime channels for live updates
- Subscription management and cleanup
- Optimistic UI updates vs. database sync

**Complex UI Patterns:**
- Overlapping event detection using time intervals
- Column-based layout algorithm for concurrent events
- Percentage-based positioning for responsive layouts
- Z-index management for layered content

**Form Validation:**
- Client-side validation for immediate feedback
- Date/time comparison logic
- Conditional validation based on user selections

**Styling & Design:**
- Glassmorphism implementation with Tailwind
- CSS keyframe animations for gradients
- Backdrop-blur effects for frosted glass
- Custom shadow combinations for depth
- Color gradients with CSS linear-gradient
- Transparent overlays with opacity values

### Design Decisions Made

1. **Glassmorphism over Solid Backgrounds:** Modern iOS-style aesthetic provides visual appeal and aligns with user's inspiration

2. **Side-by-side Events:** Prevents overlapping for better readability (Google Calendar pattern)

3. **Gray for Unassigned Events:** Clear visual indicator for events without family member assignments

4. **Event Exceptions Table:** Flexible approach to recurring event modifications without breaking the series

5. **Three Update Scopes:** Single/Future/All gives users granular control over recurring events

### Concerns Addressed
1. **Code portability from current work system:** Current work code (Faciliq platform) is NOT easily portable due to heavy reliance on proprietary APIs (`B.*` objects). Starting fresh is the better approach.

2. **Time to see working prototype:** Modern development tools offer 0.5-2 second feedback loops with hot module replacement - much faster than enterprise platforms. ✅ Confirmed!

3. **Can AI help with unfamiliar topics?** Yes ✅ - database and hosting concepts were taught step-by-step during implementation.

---

## 📝 Notes for AI Assistants

When helping this developer:
- Assume strong programming fundamentals
- Explain database concepts clearly (schemas, queries, relationships)
- Explain hosting/deployment steps in detail
- Provide complete, runnable code examples
- Show both the code AND how to verify it works
- Don't skip infrastructure setup steps
- Use modern best practices (they're learning fresh, teach them the right way)

---

## 🔗 Quick Reference Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/vhyxylqioxdzzesmbkiy
- **Local Dev Server:** http://localhost:3000
- **Live Production URL:** https://charlie-calendar.vercel.app
- **Google Cloud Console:** https://console.cloud.google.com (for OAuth credentials)

---

## 📐 Project Architecture

### Core Concept: Family Member-Centric Design

The entire application revolves around **Family Members** as the central entity. All features connect to family members:

```
Family Members (central table)
    ├── Calendar Events (assigned to members, color-coded)
    ├── Habits (tracked per member)
    ├── Chores (assigned to members)
    ├── To-Dos (assigned to members)
    └── Recipes (favorites per member, cooking assignments)
```

### Feature Modules

#### 1. Family Calendar
- Local calendar events (current implementation)
- Future: Sync with external calendars (Google, Outlook, Apple)
- Toggle visibility per member/calendar
- Color coding per family member
- Add events to local or push to synced calendars

#### 2. Habit & Chore Tracker
- **Categories:** Habits, Chores, To-Dos (may separate later)
- **Tracking:** Checkbox system with completion dates
- **Rewards:** Points/stars system for gamification
- **Visualization:** GitHub-style activity squares for progress tracking
- **Views:** Day, week, month, year

#### 3. Recipe Organizer
- **Storage:** Recipe database with ingredients list
- **Meal Planning:** Assign recipes to calendar dates
- **Shopping Lists:**
  - Select multiple recipes
  - Aggregate ingredients intelligently
  - Consolidate duplicates (e.g., 2 tsp + 6 tsp = 8 tsp)
  - Export functionality

### Database Schema (Current Implementation)

**Implemented Tables:**
- `family_members` ✅ (name, color, role, avatar_url, is_active)
- `events` ✅ (comprehensive event data with recurrence support)
- `event_family_members` ✅ (junction table for many-to-many)
- `event_exceptions` ✅ (recurring event instance modifications)

**Implemented Tables:**
- `family_members` ✅
- `events` ✅
- `event_family_members` ✅
- `event_exceptions` ✅
- `recipes` ✅
- `ingredients` ✅
- `recipe_ingredients` ✅
- `shopping_list` ✅
- `meal_types` ✅
- `meal_plans` ✅
- `tasks`, `task_assignments`, `task_completions`, `member_points` ✅
- `rewards`, `reward_assignments`, `reward_redemptions` ✅
- `user_integrations` ✅ (Google OAuth tokens, multi-account)
- `external_calendars` ✅ (Google calendars, multi-member assignment)
- `external_events` ✅ (cached Google events)

**Upcoming Tables:**
- `users` (authentication — partially done via Supabase Auth)
- `habits` (template for recurring habits)
- `habit_completions` (tracking completions)

---

## 💭 Technical Decisions & Learning Notes

### Why Supabase?
- Real-time subscriptions = instant sync across devices
- PostgreSQL = powerful relational database for complex queries
- Built-in auth = less to build ourselves
- Row Level Security (RLS) = fine-grained permissions per family
- GUI for database = easier learning curve for database concepts

### Why Next.js App Router?
- Server components = better performance
- Built-in API routes = backend logic in same codebase
- Hot reload = instant feedback (0.5-2 second cycle)
- Vercel deployment = one command to production

### Key Learning Opportunities in This Project
1. **Database relationships** (one-to-many, many-to-many)
2. **Real-time subscriptions** and WebSocket concepts
3. **Authentication flows** and session management
4. **API integrations** (Google Calendar, etc.)
5. **Complex aggregations** (recipe ingredient totaling)
6. **Data visualization** (habit tracking squares)

---

## 🎯 Success Criteria

- ✅ Changes save automatically without user clicking "save"
- ✅ Updates appear in real-time across multiple browser tabs/devices
- ✅ Calendar events are color-coded per family member
- ✅ Events can recur with flexible patterns
- ✅ Events display side-by-side when overlapping (no visual overlap)
- ✅ Modern, attractive glassmorphism design
- ✅ Calendar filtering by family member visibility
- ✅ Meal planning with recipe assignment to calendar dates
- ✅ Smart shopping list with automatic ingredient combining
- ✅ Recipe detail viewer integrated into meal planning
- ✅ Wall-mounted display optimized (no page scroll)
- ✅ Non-blocking toast notifications instead of alerts
- 🚧 Multiple family members can use the app simultaneously (needs auth)
- 🚧 Users stay logged in (no forced logouts) - auth pending
- 🚧 Mobile-friendly responsive design (mostly works, needs refinement)
- 📋 Habit tracking shows visual progress over time
- 📋 Printing/exporting shopping lists and meal plans
