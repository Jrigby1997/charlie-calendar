'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getWeekStart } from '@/lib/dateUtils'

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

  function showToast(message: string, tone: 'success' | 'error') {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 3000)
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
            name
          )
        `)
        .eq('user_id', userId)
        .gte('date', startISO)
        .lte('date', endISO)
    ])

    // Seed default meal types if none exist
    if (!typesResult.error && (!typesResult.data || typesResult.data.length === 0)) {
      await seedDefaultMealTypes()
      const reloaded = await supabase
        .from('meal_types')
        .select('id, name, sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      setMealTypes(reloaded.data || [])
    } else {
      setMealTypes(typesResult.data || [])
    }

    if (!plansResult.error) {
      const entries: MealPlanEntry[] = (plansResult.data || []).map((item: any) => ({
        id: item.id,
        recipe_id: item.recipe_id,
        meal_type: item.meal_type,
        date: item.date,
        recipe_name: item.recipes?.name ?? '(Unknown Recipe)'
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
      { name: 'Dessert', sort_order: 4 }
    ]
    await supabase
      .from('meal_types')
      .insert(defaults.map(d => ({ ...d, user_id: userId })))
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
          <button
            onClick={goToPrevWeek}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
          >
            ← Prev
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white text-sm font-medium transition-all duration-200"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200"
          >
            Next →
          </button>
        </div>

        {onAddWeekMealsToList && (
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => onAddWeekMealsToList(toLocalISO(weekDays[0]), toLocalISO(weekDays[6]))}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-200 text-sm font-medium transition-all duration-200 whitespace-nowrap"
            >
              🛒 Add Week’s Meals to Shopping List
            </button>
          </div>
        )}
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
                      className={`border-l border-white/10 min-h-[62px] flex items-center p-2 ${
                        today ? 'bg-white/10' : ''
                      }`}
                    >
                      {plan ? (
                        <div className="w-full flex items-start gap-1">
                          <button
                            onClick={() => openRecipeDetail(plan.recipe_id)}
                            className="flex-1 min-w-0 px-2 py-1.5 bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 rounded-md text-emerald-100 text-xs font-medium text-left leading-snug transition-all duration-150"
                            title={plan.recipe_name}
                          >
                            <span className="line-clamp-2">{plan.recipe_name}</span>
                          </button>
                          <button
                            onClick={() => handleRemoveMeal(plan.id)}
                            disabled={isRemoving}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-400/30 hover:border-red-400/60 text-red-300 hover:text-red-100 transition-all duration-150 mt-0.5"
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
                    {viewingRecipe.calories && <div><div className="text-white/60 text-sm">Calories</div><div className="text-white font-semibold">{viewingRecipe.calories}</div></div>}
                  </div>
                )}

                {(viewingRecipe.protein || viewingRecipe.fat || viewingRecipe.carbs) && (
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg">
                    {viewingRecipe.protein && <div><div className="text-white/60 text-sm">Protein</div><div className="text-white font-semibold">{viewingRecipe.protein}g</div></div>}
                    {viewingRecipe.fat && <div><div className="text-white/60 text-sm">Fat</div><div className="text-white font-semibold">{viewingRecipe.fat}g</div></div>}
                    {viewingRecipe.carbs && <div><div className="text-white/60 text-sm">Carbs</div><div className="text-white font-semibold">{viewingRecipe.carbs}g</div></div>}
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
