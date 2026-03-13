'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/dateUtils'
import GlassButton from './ui/GlassButton'

type MealType = {
  id: number
  name: string
  sort_order: number
}

type MealPlanEntry = {
  id: number
  recipe_id: number
  meal_type: string
  date: string
  recipe_name: string
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
}

type RecipeDetail = {
  id: number
  name: string
  description?: string | null
  instructions: string
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  calories: number | null
  protein?: number | null
  fat?: number | null
  carbs?: number | null
  rating: number | null
  recipe_ingredients: {
    amount: number
    measurement: string
    ingredient_name: string
    ingredient_id?: number
  }[]
}

type MealPlanWeekViewProps = {
  userId: string
  weekStartDay: string
  onDayClick: (date: string) => void
  refreshKey?: number
  onAddWeekMealsToList?: (startDate: string, endDate: string) => void
}

type MacroGoal = {
  enabled: boolean
  direction: '≤' | '≥'
  value: number
}

type MealPlanGoals = {
  calories: MacroGoal
  protein: MacroGoal
  fat: MacroGoal
  carbs: MacroGoal
  allowLeftovers: boolean
}

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toLocalISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default function MealPlanWeekView({ userId, weekStartDay, onDayClick, refreshKey, onAddWeekMealsToList }: MealPlanWeekViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date(), weekStartDay))
  const [mealTypes, setMealTypes] = useState<MealType[]>([])
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingRecipe, setViewingRecipe] = useState<RecipeDetail | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingToList, setAddingToList] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [goals, setGoals] = useState<MealPlanGoals>({
    calories: { enabled: false, direction: '≤', value: 2000 },
    protein: { enabled: false, direction: '≥', value: 50 },
    fat: { enabled: false, direction: '≤', value: 65 },
    carbs: { enabled: false, direction: '≤', value: 200 },
    allowLeftovers: false,
  })

  function showToast(message: string, tone: 'success' | 'error') {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 3000)
  }

  function updateGoal(macro: 'calories' | 'protein' | 'fat' | 'carbs', field: 'enabled' | 'direction' | 'value', value: boolean | string | number) {
    setGoals(prev => ({ ...prev, [macro]: { ...prev[macro], [field]: value } }))
  }

  async function loadGoals() {
    const { data } = await supabase
      .from('app_settings')
      .select('meal_plan_goals, meal_plan_allow_leftovers')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.meal_plan_goals) {
      setGoals({ ...data.meal_plan_goals, allowLeftovers: data.meal_plan_allow_leftovers ?? false })
    } else if (data?.meal_plan_allow_leftovers != null) {
      setGoals(prev => ({ ...prev, allowLeftovers: data.meal_plan_allow_leftovers }))
    }
  }

  async function openGenerateModal() {
    await loadGoals()
    setShowGenerateModal(true)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const loadData = useCallback(async () => {
    setLoading(true)
    const startISO = toLocalISO(weekDays[0])
    const endISO = toLocalISO(weekDays[6])

    const [typesResult, plansResult] = await Promise.all([
      supabase
        .from('meal_types')
        .select('id, name, sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('meal_plans')
        .select(`
          id,
          recipe_id,
          meal_type,
          date,
          recipes (
            name,
            calories,
            protein,
            fat,
            carbs
          )
        `)
        .eq('user_id', userId)
        .gte('date', startISO)
        .lte('date', endISO)
    ])

    // Always ensure all 5 standard types exist (adds any missing ones silently)
    await seedDefaultMealTypes()
    setMealTypes(typesResult.data || [])

    if (!plansResult.error) {
      const entries: MealPlanEntry[] = (plansResult.data || []).map((item: any) => ({
        id: item.id,
        recipe_id: item.recipe_id,
        meal_type: item.meal_type,
        date: item.date,
        recipe_name: item.recipes?.name ?? '(Unknown Recipe)',
        calories: item.recipes?.calories ?? null,
        protein: item.recipes?.protein ?? null,
        fat: item.recipes?.fat ?? null,
        carbs: item.recipes?.carbs ?? null
      }))
      setMealPlans(entries)
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, weekStart])

  async function seedDefaultMealTypes() {
    const defaults = [
      { name: 'Breakfast', sort_order: 1 },
      { name: 'Lunch', sort_order: 2 },
      { name: 'Dinner', sort_order: 3 },
      { name: 'Snack', sort_order: 4 },
      { name: 'Dessert', sort_order: 5 },
    ]
    await supabase
      .from('meal_types')
      .upsert(defaults.map(d => ({ ...d, user_id: userId })), { onConflict: 'user_id,name', ignoreDuplicates: true })
  }

  useEffect(() => {
    if (userId) loadData()
  }, [loadData, userId, refreshKey])

  async function openRecipeDetail(recipeId: number) {
    setLoadingRecipe(true)
    setViewingRecipe(null)
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id, name, description, instructions,
        prep_time, cook_time, servings, calories,
        protein, fat, carbs, rating,
        recipe_ingredients (
          ingredient_id,
          amount,
          measurement,
          ingredients ( name )
        )
      `)
      .eq('id', recipeId)
      .single()
    setLoadingRecipe(false)
    if (error || !data) return
    setViewingRecipe({
      id: data.id,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      prep_time: data.prep_time,
      cook_time: data.cook_time,
      servings: data.servings,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      rating: data.rating,
      recipe_ingredients: (data.recipe_ingredients as any[]).map((ri) => ({
        amount: ri.amount,
        measurement: ri.measurement,
        ingredient_id: ri.ingredient_id,
        ingredient_name: Array.isArray(ri.ingredients) ? ri.ingredients[0]?.name : ri.ingredients?.name ?? ''
      }))
    })
  }

  async function handleRemoveMeal(planId: number) {
    setRemovingId(planId)
    const { error } = await supabase.from('meal_plans').delete().eq('id', planId)
    if (!error) setMealPlans(prev => prev.filter(p => p.id !== planId))
    setRemovingId(null)
  }

  async function handleClearWeek() {
    if (!confirm('Clear all meals for this week?')) return
    const ids = mealPlans.map(p => p.id)
    if (ids.length === 0) { showToast('No meals to clear this week.', 'error'); return }
    const { error } = await supabase.from('meal_plans').delete().in('id', ids)
    if (error) { showToast('Failed to clear the week.', 'error'); return }
    setMealPlans([])
    showToast('Week cleared.', 'success')
  }

  async function saveGoals(g: MealPlanGoals) {
    const { calories, protein, fat, carbs, allowLeftovers } = g
    await supabase.from('app_settings').upsert(
      { user_id: userId, meal_plan_goals: { calories, protein, fat, carbs }, meal_plan_allow_leftovers: allowLeftovers },
      { onConflict: 'user_id' }
    )
  }

  async function handleGeneratePlan() {
    setGeneratingPlan(true)

    // Fetch all recipes with category tags and macro data
    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select(`id, name, calories, protein, fat, carbs,
        recipe_categories_junction ( recipe_categories ( name ) )`)
      .eq('user_id', userId)

    if (recipesError || !recipesData || recipesData.length === 0) {
      showToast('No recipes found. Add some recipes first!', 'error')
      setGeneratingPlan(false)
      return
    }

    // Build a set of known meal type names (lowercase) for tag matching
    const mealTypeNames = new Set(mealTypes.map(mt => mt.name.toLowerCase()))

    type RecipeCandidate = {
      id: number; name: string
      calories: number | null; protein: number | null; fat: number | null; carbs: number | null
      eligibleMealTypes: string[] // empty = any slot
    }

    const candidates: RecipeCandidate[] = recipesData.map((r: any) => {
      const catNames: string[] = (r.recipe_categories_junction || []).flatMap((j: any) => {
        const cats = j.recipe_categories
        if (Array.isArray(cats)) return cats.map((c: any) => (c?.name as string | undefined)?.toLowerCase()).filter(Boolean)
        if (cats?.name) return [(cats.name as string).toLowerCase()]
        return []
      })
      // Only keep category tags that are actual meal type names
      const mealTypeTags = catNames.filter(c => mealTypeNames.has(c))
      return { id: r.id, name: r.name, calories: r.calories ?? null, protein: r.protein ?? null, fat: r.fat ?? null, carbs: r.carbs ?? null, eligibleMealTypes: mealTypeTags }
    })

    type PlannedMeal = { date: string; meal_type: string; recipe_id: number; recipe_name: string; calories: number | null; protein: number | null; fat: number | null; carbs: number | null }
    const planned: PlannedMeal[] = []

    // Week-level dedup: start with recipes already placed this week
    const weekUsedIds = new Set<number>(mealPlans.map(p => p.recipe_id))

    // Per-day dedup: includes both existing + newly planned entries for that day
    function getDayUsedIds(dateISO: string): Set<number> {
      const ids = new Set<number>()
      mealPlans.filter(p => p.date === dateISO).forEach(p => ids.add(p.recipe_id))
      planned.filter(p => p.date === dateISO).forEach(p => ids.add(p.recipe_id))
      return ids
    }

    function isSlotFilled(dateISO: string, mealTypeName: string) {
      return mealPlans.some(p => p.date === dateISO && p.meal_type === mealTypeName) ||
             planned.some(p => p.date === dateISO && p.meal_type === mealTypeName)
    }

    function getDayTotals(dateISO: string) {
      const all = [...mealPlans.filter(p => p.date === dateISO), ...planned.filter(p => p.date === dateISO)]
      return {
        calories: all.reduce((s, p) => s + (p.calories ?? 0), 0),
        protein: all.reduce((s, p) => s + (p.protein ?? 0), 0),
        fat: all.reduce((s, p) => s + (p.fat ?? 0), 0),
        carbs: all.reduce((s, p) => s + (p.carbs ?? 0), 0),
      }
    }

    // Proportional meal-type weights — share of the daily budget each slot should use.
    // Dessert weight is 0: it's optional and gets no reserved budget, fills only if surplus allows.
    const SLOT_WEIGHTS: Record<string, number> = {
      breakfast: 0.20, brunch: 0.25, lunch: 0.30,
      dinner: 0.40, snack: 0.10, dessert: 0,
    }
    function getSlotWeight(name: string): number {
      return SLOT_WEIGHTS[name.toLowerCase()] ?? 0.15
    }

    // For a ≤ goal, compute how much budget this slot can use after reserving
    // proportional shares for all still-unfilled later slots today
    function getEffectiveCap(macro: 'calories' | 'protein' | 'fat' | 'carbs', dateISO: string, mealTypeIdx: number): number {
      const goal = goals[macro]
      if (!goal.enabled || goal.direction !== '≤') return Infinity
      const t = getDayTotals(dateISO)
      let reserved = 0
      for (let i = mealTypeIdx + 1; i < mealTypes.length; i++) {
        if (!isSlotFilled(dateISO, mealTypes[i].name)) {
          reserved += goal.value * getSlotWeight(mealTypes[i].name)
        }
      }
      return goal.value - t[macro] - reserved
    }

    // Strict ≤ enforcement with proportional budget reservation — no fallback
    function passesMaxGoals(dateISO: string, r: RecipeCandidate, mealTypeIdx: number) {
      if ((r.calories ?? 0) > getEffectiveCap('calories', dateISO, mealTypeIdx)) return false
      if ((r.protein ?? 0) > getEffectiveCap('protein', dateISO, mealTypeIdx)) return false
      if ((r.fat ?? 0) > getEffectiveCap('fat', dateISO, mealTypeIdx)) return false
      if ((r.carbs ?? 0) > getEffectiveCap('carbs', dateISO, mealTypeIdx)) return false
      return true
    }

    // For ≥ goals: sort pool so recipes contributing most to lagging macros come first
    // Shuffle first so equal-scored recipes break ties randomly
    function sortForMinGoals(pool: RecipeCandidate[], dateISO: string): RecipeCandidate[] {
      const t = getDayTotals(dateISO)
      return shuffle(pool).sort((a, b) => {
        let scoreA = 0, scoreB = 0
        if (goals.calories.enabled && goals.calories.direction === '≥') {
          const deficit = Math.max(0, goals.calories.value - t.calories)
          scoreA += Math.min(a.calories ?? 0, deficit)
          scoreB += Math.min(b.calories ?? 0, deficit)
        }
        if (goals.protein.enabled && goals.protein.direction === '≥') {
          const deficit = Math.max(0, goals.protein.value - t.protein)
          scoreA += Math.min(a.protein ?? 0, deficit)
          scoreB += Math.min(b.protein ?? 0, deficit)
        }
        if (goals.fat.enabled && goals.fat.direction === '≥') {
          const deficit = Math.max(0, goals.fat.value - t.fat)
          scoreA += Math.min(a.fat ?? 0, deficit)
          scoreB += Math.min(b.fat ?? 0, deficit)
        }
        if (goals.carbs.enabled && goals.carbs.direction === '≥') {
          const deficit = Math.max(0, goals.carbs.value - t.carbs)
          scoreA += Math.min(a.carbs ?? 0, deficit)
          scoreB += Math.min(b.carbs ?? 0, deficit)
        }
        return scoreB - scoreA
      })
    }

    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    const hasMinGoal = (['calories', 'protein', 'fat', 'carbs'] as const).some(
      m => goals[m].enabled && goals[m].direction === '≥'
    )

    const dinnerMTName = mealTypes.find(mt => mt.name.toLowerCase() === 'dinner')?.name
    const lunchMTName = mealTypes.find(mt => mt.name.toLowerCase() === 'lunch')?.name

    let totalEmpty = 0
    let unfilledCount = 0

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dateISO = toLocalISO(weekDays[dayIdx])
      for (let mtIdx = 0; mtIdx < mealTypes.length; mtIdx++) {
        const mealType = mealTypes[mtIdx]
        if (isSlotFilled(dateISO, mealType.name)) continue
        totalEmpty++

        // Leftovers: yesterday's dinner fills today's lunch (exempt from week-dedup)
        if (goals.allowLeftovers && lunchMTName && mealType.name === lunchMTName && dayIdx > 0) {
          const prevISO = toLocalISO(weekDays[dayIdx - 1])
          const prevDinner =
            mealPlans.find(p => p.date === prevISO && !!dinnerMTName && p.meal_type === dinnerMTName) ||
            planned.find(p => p.date === prevISO && !!dinnerMTName && p.meal_type === dinnerMTName)
          if (prevDinner) {
            planned.push({ date: dateISO, meal_type: mealType.name, recipe_id: prevDinner.recipe_id, recipe_name: prevDinner.recipe_name, calories: prevDinner.calories, protein: prevDinner.protein, fat: prevDinner.fat, carbs: prevDinner.carbs })
            continue
          }
        }

        const mealTypeLower = mealType.name.toLowerCase()
        const dayUsed = getDayUsedIds(dateISO)

        // Filter: meal-type tag match + no same-day repeat + no same-week repeat
        const eligible = candidates.filter(r =>
          (r.eligibleMealTypes.length === 0 || r.eligibleMealTypes.includes(mealTypeLower)) &&
          !dayUsed.has(r.id) &&
          !weekUsedIds.has(r.id)
        )

        const withinGoals = eligible.filter(r => passesMaxGoals(dateISO, r, mtIdx))
        if (withinGoals.length === 0) { unfilledCount++; continue }

        const ordered = hasMinGoal ? sortForMinGoals(withinGoals, dateISO) : shuffle(withinGoals)
        const picked = ordered[0]

        planned.push({ date: dateISO, meal_type: mealType.name, recipe_id: picked.id, recipe_name: picked.name, calories: picked.calories, protein: picked.protein, fat: picked.fat, carbs: picked.carbs })
        weekUsedIds.add(picked.id)
      }
    }

    if (planned.length === 0) {
      showToast(
        totalEmpty === 0
          ? 'All slots are already filled this week.'
          : 'No recipes matched your goals — try relaxing the constraints.',
        'error'
      )
      setGeneratingPlan(false)
      return
    }

    const { error: insertError } = await supabase.from('meal_plans').insert(
      planned.map(p => ({ user_id: userId, recipe_id: p.recipe_id, meal_type: p.meal_type, date: p.date }))
    )
    if (insertError) {
      showToast('Failed to save the generated plan.', 'error')
      setGeneratingPlan(false)
      return
    }

    await saveGoals(goals)
    await loadData()
    setShowGenerateModal(false)

    if (unfilledCount > 0) {
      showToast(`Added ${planned.length} meal${planned.length > 1 ? 's' : ''}. ${unfilledCount} slot${unfilledCount > 1 ? 's' : ''} couldn't be filled — add more recipes or relax your goals.`, 'success')
    } else {
      showToast(`🎉 Added ${planned.length} meal${planned.length > 1 ? 's' : ''} to the plan!`, 'success')
    }
    setGeneratingPlan(false)
  }

  async function addRecipeToShoppingList(recipe: RecipeDetail) {
    setAddingToList(true)
    try {
      const validIngredients = recipe.recipe_ingredients.filter(
        (ing) => ing.ingredient_id && ing.amount && ing.measurement
      )
      if (validIngredients.length === 0) {
        showToast('No ingredients with full details to add.', 'error')
        setAddingToList(false)
        return
      }

      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)
      if (fetchError) throw fetchError

      const itemsToUpsert = validIngredients.map((ing) => {
        const existing = existingItems?.find(
          (item) => item.ingredient_id === ing.ingredient_id && item.measurement === ing.measurement
        )
        const recipeIdStr = String(recipe.id)
        const existingCounts = (existing?.recipe_counts as Record<string, number>) || {}
        const nextCounts = { ...existingCounts, [recipeIdStr]: (existingCounts[recipeIdStr] || 0) + 1 }
        return existing
          ? { id: existing.id, user_id: userId, ingredient_id: ing.ingredient_id, amount: Number(existing.amount) + Number(ing.amount), measurement: ing.measurement, recipe_id: recipe.id, recipe_counts: nextCounts }
          : { user_id: userId, ingredient_id: ing.ingredient_id, amount: ing.amount, measurement: ing.measurement, recipe_id: recipe.id, recipe_counts: nextCounts }
      })

      const itemsWithoutId = itemsToUpsert.map(({ id: _id, ...rest }) => rest)
      const { error } = await supabase
        .from('shopping_list')
        .upsert(itemsWithoutId, { onConflict: 'user_id,ingredient_id,measurement' })
      if (error) throw error
      showToast(`Added ${itemsToUpsert.length} ingredients to shopping list.`, 'success')
    } catch (err) {
      console.error('Error adding to shopping list:', err)
      showToast('Failed to add ingredients to shopping list.', 'error')
    }
    setAddingToList(false)
  }

  function goToPrevWeek() {
    setWeekStart(prev => addDays(prev, -7))
  }

  function goToNextWeek() {
    setWeekStart(prev => addDays(prev, 7))
  }

  function goToCurrentWeek() {
    setWeekStart(getWeekStart(new Date(), weekStartDay))
  }

  function isSameWeekAsCurrent(): boolean {
    const currentWeekStart = getWeekStart(new Date(), weekStartDay)
    return toLocalISO(weekStart) === toLocalISO(currentWeekStart)
  }

  function getWeekRangeLabel(): string {
    const start = weekDays[0]
    const end = weekDays[6]
    const startMonth = MONTH_NAMES[start.getMonth()]
    const endMonth = MONTH_NAMES[end.getMonth()]
    if (start.getFullYear() !== end.getFullYear()) {
      return `${startMonth} ${start.getDate()}, ${start.getFullYear()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
    }
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
  }

  function getMealPlan(date: Date, mealTypeName: string): MealPlanEntry | undefined {
    return mealPlans.find(p => p.date === toLocalISO(date) && p.meal_type === mealTypeName)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-9 w-20 bg-white/10 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="h-64 animate-pulse bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Navigation: label left | Prev/Today/Next center | Add-week button right */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <h2 className="text-4xl font-bold text-white drop-shadow-lg flex-1">{getWeekRangeLabel()}</h2>

        <div className="flex items-center gap-2">
          <GlassButton size="sm" onClick={goToPrevWeek}>← Prev</GlassButton>
          <GlassButton size="sm" onClick={goToCurrentWeek}>Today</GlassButton>
          <GlassButton size="sm" onClick={goToNextWeek}>Next →</GlassButton>
        </div>

        <div className="flex-1 flex justify-end gap-2">
          <GlassButton variant="red" size="md" className="meal-clear-btn whitespace-nowrap" onClick={handleClearWeek}>
            🗑️ Clear Week
          </GlassButton>
          <GlassButton size="md" className="meal-generate-btn whitespace-nowrap" onClick={openGenerateModal}>
            🍽️ Generate Meal Plan
          </GlassButton>
          {onAddWeekMealsToList && (
            <GlassButton variant="green" size="md" className="whitespace-nowrap" onClick={() => onAddWeekMealsToList(toLocalISO(weekDays[0]), toLocalISO(weekDays[6]))}>
              🛒 Add Week's Meals to Shopping List
            </GlassButton>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-white/20">
        <div style={{ minWidth: '700px' }}>

          {/* Column headers */}
          <div
            className="grid border-b border-white/20 bg-white/10"
            style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}
          >
            <div className="px-3 py-3 text-white/50 text-xs font-medium uppercase tracking-wide" />
            {weekDays.map((day) => {
              const today = isToday(day)
              return (
                <div
                  key={toLocalISO(day)}
                  className={`px-2 py-3 text-center border-l border-white/10 ${
                    today ? 'bg-white/20' : ''
                  }`}
                >
                  <div className={`text-xs font-medium uppercase tracking-wide ${today ? 'text-white' : 'text-white/50'}`}>
                    {DAY_ABBREVS[day.getDay()]}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      today
                        ? 'text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                        : 'text-white/80'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Meal type rows */}
          {mealTypes.length === 0 ? (
            <div className="py-12 text-center text-white/50 text-sm bg-white/5">
              No meal types found. Visit the calendar to set up your first meal plan.
            </div>
          ) : (
            mealTypes.map((mealType, rowIdx) => (
              <div
                key={mealType.id}
                className={`grid border-b border-white/10 last:border-b-0 ${
                  rowIdx % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent'
                }`}
                style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}
              >
                {/* Meal type label */}
                <div className="px-3 py-4 flex items-center border-r border-white/10">
                  <span className="text-white/80 text-sm font-medium">{mealType.name}</span>
                </div>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const plan = getMealPlan(day, mealType.name)
                  const today = isToday(day)
                  const dateISO = toLocalISO(day)
                  const isRemoving = plan ? removingId === plan.id : false

                  return (
                    <div
                      key={dateISO}
                      className={`border-l border-white/10 h-[62px] flex items-center p-2 ${
                        today ? 'bg-white/10' : ''
                      }`}
                    >
                      {plan ? (
                        <div className="w-full flex items-center gap-1">
                          <button
                            onClick={() => openRecipeDetail(plan.recipe_id)}
                            className="meal-recipe-pill flex-1 min-w-0 px-2 h-[42px] bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 rounded-md text-emerald-100 text-xs font-medium text-left leading-snug transition-all duration-150 overflow-hidden flex items-center"
                            title={plan.recipe_name}
                          >
                            <span className="line-clamp-2">{plan.recipe_name}</span>
                          </button>
                          <button
                            onClick={() => handleRemoveMeal(plan.id)}
                            disabled={isRemoving}
                            className="meal-remove-btn flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-400/30 hover:border-red-400/60 text-red-300 hover:text-red-100 transition-all duration-150 mt-0.5"
                            title="Remove from meal plan"
                          >
                            <span className="text-[10px] leading-none">{isRemoving ? '…' : '✕'}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onDayClick(dateISO)}
                          className="text-white/20 hover:text-white/50 text-xl leading-none transition-colors w-full h-full flex items-center justify-center min-h-[46px]"
                          title={`Add meal for ${DAY_ABBREVS[day.getDay()]} ${day.getDate()}`}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}

          {/* Daily Macro Totals Row */}
          {mealTypes.length > 0 && (
            <div
              className="grid border-t-2 border-white/20 bg-white/[0.07]"
              style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}
            >
              <div className="px-3 py-3 flex items-center border-r border-white/10">
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wide">Nutrition Totals</span>
              </div>
              {weekDays.map((day) => {
                const dateISO = toLocalISO(day)
                const dayMeals = mealPlans.filter(p => p.date === dateISO)
                const totals = dayMeals.reduce(
                  (acc, p) => ({
                    calories: acc.calories + (p.calories ?? 0),
                    protein: acc.protein + (p.protein ?? 0),
                    fat: acc.fat + (p.fat ?? 0),
                    carbs: acc.carbs + (p.carbs ?? 0),
                  }),
                  { calories: 0, protein: 0, fat: 0, carbs: 0 }
                )
                const hasMacros = dayMeals.some(p => p.calories || p.protein || p.fat || p.carbs)
                const today = isToday(day)
                return (
                  <div
                    key={dateISO}
                    className={`border-l border-white/10 px-2 py-2.5 flex items-center ${today ? 'bg-white/10' : ''}`}
                  >
                    {hasMacros ? (
                      <div className="space-y-1 text-xs leading-tight w-full text-center">
                        {totals.calories > 0 && (
                          <div className="meal-totals-cal font-semibold">🔥 {totals.calories} cal</div>
                        )}
                        {totals.protein > 0 && (
                          <div className="meal-totals-pro">💪 {totals.protein}g pro</div>
                        )}
                        {totals.fat > 0 && (
                          <div className="meal-totals-fat">🥑 {totals.fat}g fat</div>
                        )}
                        {totals.carbs > 0 && (
                          <div className="meal-totals-carb">🌾 {totals.carbs}g carb</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/20 text-xs w-full text-center">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-white/40 text-center">
        Click a recipe to view details · Click + to add a meal · Click ✕ to remove
      </div>

      {/* Recipe Detail Modal */}
      {(viewingRecipe || loadingRecipe) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setViewingRecipe(null); setLoadingRecipe(false) }}
        >
          <div
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingRecipe && !viewingRecipe ? (
              <div className="flex items-center justify-center h-48 text-white/60">Loading recipe…</div>
            ) : viewingRecipe ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-white pr-4">{viewingRecipe.name}</h2>
                  <button onClick={() => setViewingRecipe(null)} className="text-white/60 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
                </div>

                {viewingRecipe.description && (
                  <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/80 text-sm leading-relaxed">{viewingRecipe.description}</p>
                  </div>
                )}

                {(viewingRecipe.prep_time || viewingRecipe.cook_time || viewingRecipe.servings || viewingRecipe.calories) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white/5 rounded-lg">
                    {viewingRecipe.prep_time && <div><div className="text-white/60 text-sm">Prep Time</div><div className="text-white font-semibold">{viewingRecipe.prep_time}m</div></div>}
                    {viewingRecipe.cook_time && <div><div className="text-white/60 text-sm">Cook Time</div><div className="text-white font-semibold">{viewingRecipe.cook_time}m</div></div>}
                    {viewingRecipe.servings && <div><div className="text-white/60 text-sm">Servings</div><div className="text-white font-semibold">{viewingRecipe.servings}</div></div>}
                    {viewingRecipe.calories && <div><div className="text-white/60 text-sm">Calories<span className="text-white/40 text-xs ml-1">/serving</span></div><div className="text-white font-semibold">{viewingRecipe.calories}</div></div>}
                  </div>
                )}

                {(viewingRecipe.protein || viewingRecipe.fat || viewingRecipe.carbs) && (
                  <div className="mb-6">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Macros per serving</div>
                    <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
                      {viewingRecipe.protein && <div><div className="text-white/60 text-sm">Protein</div><div className="text-white font-semibold">{viewingRecipe.protein}g</div></div>}
                      {viewingRecipe.fat && <div><div className="text-white/60 text-sm">Fat</div><div className="text-white font-semibold">{viewingRecipe.fat}g</div></div>}
                      {viewingRecipe.carbs && <div><div className="text-white/60 text-sm">Carbs</div><div className="text-white font-semibold">{viewingRecipe.carbs}g</div></div>}
                    </div>
                  </div>
                )}

                {viewingRecipe.recipe_ingredients.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Ingredients</h3>
                    <ul className="space-y-2">
                      {viewingRecipe.recipe_ingredients.map((ing, idx) => (
                        <li key={idx} className="text-white/80 bg-white/5 px-3 py-2 rounded-lg text-sm">
                          • {ing.amount} {ing.measurement} {ing.ingredient_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {viewingRecipe.instructions && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
                    <p className="text-white/80 whitespace-pre-wrap leading-relaxed text-sm">{viewingRecipe.instructions}</p>
                  </div>
                )}

                {viewingRecipe.rating && (
                  <div className="text-white/60 text-sm mb-4">⭐ Rating: <span className="text-white">{viewingRecipe.rating}/10</span></div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => addRecipeToShoppingList(viewingRecipe)}
                    disabled={addingToList}
                    className="w-full mb-3 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-200 font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {addingToList ? 'Adding…' : '🛒 Add ALL Ingredients to Shopping List'}
                  </button>
                  <button
                    onClick={() => setViewingRecipe(null)}
                    className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Generate Meal Plan Modal */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowGenerateModal(false)}
        >
          <div
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">🍽️ Generate Meal Plan</h2>
                <p className="text-white/50 text-sm mt-1">Fill empty slots with recipes matching your goals</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-white/50 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
            </div>

            {/* Nutrition Goals */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Daily Nutrition Goals</div>
              <div className="space-y-3">
                {([ ['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['fat', 'Fat', 'g'], ['carbs', 'Carbs', 'g'] ] as const).map(([macro, label, unit]) => (
                  <div key={macro} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={goals[macro].enabled}
                      onChange={e => updateGoal(macro, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer accent-purple-400 flex-shrink-0"
                    />
                    <span className={`text-sm w-16 flex-shrink-0 ${goals[macro].enabled ? 'text-white' : 'text-white/40'}`}>{label}</span>
                    <button
                      onClick={() => updateGoal(macro, 'direction', goals[macro].direction === '≤' ? '≥' : '≤')}
                      disabled={!goals[macro].enabled}
                      className={`meal-direction-btn w-9 h-8 rounded border text-sm font-bold flex-shrink-0 transition-all ${goals[macro].enabled ? 'border-purple-400/60 hover:bg-purple-500/20' : 'border-white/10 text-white/20 cursor-not-allowed'}`}
                    >
                      {goals[macro].direction}
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={goals[macro].value}
                      onChange={e => updateGoal(macro, 'value', Math.max(0, Number(e.target.value)))}
                      disabled={!goals[macro].enabled}
                      className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm border bg-white/5 transition-all ${goals[macro].enabled ? 'border-white/20 text-white' : 'border-white/10 text-white/30 cursor-not-allowed'}`}
                    />
                    <span className={`text-sm flex-shrink-0 ${goals[macro].enabled ? 'text-white/60' : 'text-white/20'}`}>{unit}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-2">
                ≤ = daily maximum &nbsp;·&nbsp; ≥ = daily minimum target
              </p>
            </div>

            {/* Allow Leftovers */}
            <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={goals.allowLeftovers}
                  onChange={e => setGoals(prev => ({ ...prev, allowLeftovers: e.target.checked }))}
                  className="w-4 h-4 mt-0.5 rounded cursor-pointer accent-purple-400 flex-shrink-0"
                />
                <div>
                  <div className="text-white text-sm font-medium">Allow Leftovers</div>
                  <div className="text-white/50 text-xs mt-0.5">Yesterday&apos;s dinner automatically fills today&apos;s lunch slot</div>
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="meal-generate-btn flex-1 px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                {generatingPlan ? 'Generating…' : '🎲 Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60]">
          <div className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-xl text-sm font-medium ${
            toast.tone === 'success'
              ? 'bg-green-500/20 border-green-500/40 text-green-100'
              : 'bg-red-500/20 border-red-500/40 text-red-100'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
