## 📝 Latest Updates (February 12, 2026)

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

## 📝 Latest Updates (February 9-10, 2026)

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
│   ├── components/
│   │   ├── AddEventModal.tsx       # Event creation/editing modal with glassmorphism
│   │   ├── CalendarView.tsx        # Main calendar with day/week/month views, filtering, meal icons
│   │   ├── FamilyMembers.tsx       # Family member management sidebar
│   │   ├── RecipesView.tsx         # Recipe CRUD with shopping list integration
│   │   ├── ShoppingListView.tsx    # Shopping list management with ingredient combining
│   │   └── MealPlanModal.tsx       # Meal planning modal with recipe detail viewer
│   ├── globals.css                 # Global styles with animated gradient background
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Main app page with layout, modals, toast notifications
├── lib/
│   └── supabase.ts                 # Supabase client configuration
├── contexts/
│   └── AuthContext.tsx             # Authentication context (if implemented)
├── migrations/
│   ├── supabase_migration_recipes.sql              # recipes, ingredients, recipe_ingredients tables
│   ├── supabase_migration_shopping_list.sql        # shopping_list table
│   ├── supabase_migration_shopping_list_updates.sql # recipe_counts JSONB column
│   └── supabase_migration_meal_plans.sql           # meal_types, meal_plans tables
├── .env.local                      # Environment variables (not in git)
├── DEV_PROFILE.md                  # Developer context & learning profile
└── README.md                       # This file
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
- **First Working Prototype:** February 5, 2026 ✅
- **Calendar MVP Completed:** February 6, 2026 ✅
- **Recipes & Meal Planning:** February 7, 2026 ✅
- **UI/UX Optimizations:** February 7, 2026 ✅
- **Next Milestone:** Authentication & Multi-user Support
