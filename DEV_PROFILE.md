# Developer Profile & Project Context

**Last Updated:** February 12, 2026, 10:00 PM
**Developer:** jrigb
**Project:** Skylight-style Calendar Application
**Current Phase:** Nutrition & Shopping Features Complete ✅ | Family Member Avatars Complete ✅ | Ready for Authentication

---

## 🎯 Project Goal

Build a custom calendar/family organizer application similar to Skylight Calendar with:
- **Auto-save functionality** (no manual save buttons required)
- **Persistent sessions** (no forced logouts)
- Real-time updates across devices
- Clean, intuitive family-friendly interface
- Recipe planning with shopping list integration
- Family member avatars and visual identity

---


## Recent Session Summary (Feb 12, 2026)

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
- **Project Repository:** TBD
- **Live Demo URL:** TBD (will deploy to Vercel)

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
- `family_members` ✅ (name, color, role, avatar_url, is_active)
- `events` ✅ (comprehensive event data with recurrence support)
- `event_family_members` ✅ (junction table for many-to-many)
- `event_exceptions` ✅ (recurring event instance modifications)
- `recipes` ✅ (recipe details with nutritional info)
- `ingredients` ✅ (per-user ingredient library)
- `recipe_ingredients` ✅ (recipe-ingredient relationships with amounts)
- `shopping_list` ✅ (persistent cart with recipe source tracking)
- `meal_types` ✅ (customizable meal categories per user)
- `meal_plans` ✅ (recipe-to-date-to-meal_type assignments)

**Upcoming Tables:**
- `users` (authentication, family association)
- `habits` (template for recurring habits)
- `habit_completions` (tracking individual completions)
- `chores` (similar to habits)
- `todos` (one-off tasks)
- `external_calendars` (sync configurations)

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
