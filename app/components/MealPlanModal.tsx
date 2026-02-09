'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Recipe = {
  id: number
  name: string
}

type RecipeDetails = {
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
    ingredients: {
      name: string
    }
  }[]
}

type MealType = {
  id: number
  name: string
  sort_order: number
}

type MealPlan = {
  id: number
  recipe_id: number
  meal_type: string
  recipe_name: string
}

type MealPlanModalProps = {
  isOpen: boolean
  onClose: () => void
  selectedDate: string | null
  userId: string
  onRefresh: () => void
  onShowToast?: (message: string, tone: 'success' | 'error') => void
}

export default function MealPlanModal({ isOpen, onClose, selectedDate, userId, onRefresh, onShowToast }: MealPlanModalProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [mealTypes, setMealTypes] = useState<MealType[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [newMealType, setNewMealType] = useState('')
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(false)
  const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null)
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetails | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  useEffect(() => {
    if (isOpen && selectedDate && userId) {
      loadData()
    }
  }, [isOpen, selectedDate, userId])

  async function loadData() {
    setLoading(true)
    await Promise.all([
      loadMealPlans(),
      loadMealTypes(),
      loadRecipes()
    ])
    setLoading(false)
  }

  async function loadMealPlans() {
    if (!selectedDate) return

    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        id,
        recipe_id,
        meal_type,
        recipes!inner (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('date', selectedDate)

    if (error) {
      console.error('Error loading meal plans:', error)
      return
    }

    const plans: MealPlan[] = (data || []).map((item: any) => ({
      id: item.id,
      recipe_id: item.recipe_id,
      meal_type: item.meal_type,
      recipe_name: item.recipes.name
    }))

    setMealPlans(plans)

    // Initialize selected recipes state
    const selected: Record<string, number | null> = {}
    plans.forEach(plan => {
      selected[plan.meal_type] = plan.recipe_id
    })
    setSelectedRecipes(selected)
  }

  async function loadMealTypes() {
    const { data, error } = await supabase
      .from('meal_types')
      .select('id, name, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading meal types:', error)
      return
    }

    // If no meal types exist, seed default ones
    if (!data || data.length === 0) {
      await seedDefaultMealTypes()
      await loadMealTypes() // Reload after seeding
      return
    }

    setMealTypes(data || [])
  }

  async function seedDefaultMealTypes() {
    const defaults = [
      { name: 'Breakfast', sort_order: 1 },
      { name: 'Lunch', sort_order: 2 },
      { name: 'Dinner', sort_order: 3 },
      { name: 'Dessert', sort_order: 4 }
    ]

    const { error } = await supabase
      .from('meal_types')
      .insert(defaults.map(d => ({ ...d, user_id: userId })))

    if (error) {
      console.error('Error seeding meal types:', error)
    }
  }

  async function loadRecipes() {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading recipes:', error)
      return
    }

    setRecipes(data || [])
  }

  async function handleAssignRecipe(mealType: string, recipeId: number | null) {
    if (!selectedDate) return

    if (recipeId === null) {
      // Remove assignment
      const plan = mealPlans.find(p => p.meal_type === mealType)
      if (plan) {
        await handleRemoveMeal(plan.id, mealType)
      }
      return
    }

    const { error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: userId,
        recipe_id: recipeId,
        date: selectedDate,
        meal_type: mealType
      }, {
        onConflict: 'user_id,date,meal_type'
      })

    if (error) {
      console.error('Error assigning recipe:', error)
      onShowToast?.('Failed to assign recipe', 'error')
      return
    }

    await loadMealPlans()
    onRefresh()
  }

  async function handleRemoveMeal(mealPlanId: number, mealType: string) {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId)

    if (error) {
      console.error('Error removing meal:', error)
      onShowToast?.('Failed to remove meal', 'error')
      return
    }

    setSelectedRecipes(prev => ({ ...prev, [mealType]: null }))
    await loadMealPlans()
    onRefresh()
  }

  async function handleAddMealType() {
    if (!newMealType.trim()) return

    const maxSortOrder = mealTypes.reduce((max, mt) => Math.max(max, mt.sort_order), 0)

    const { error } = await supabase
      .from('meal_types')
      .insert({
        user_id: userId,
        name: newMealType.trim(),
        sort_order: maxSortOrder + 1
      })

    if (error) {
      console.error('Error adding meal type:', error)
      if (error.code === '23505') {
        onShowToast?.('This meal type already exists', 'error')
      } else {
        onShowToast?.('Failed to add meal type', 'error')
      }
      return
    }

    setNewMealType('')
    await loadMealTypes()
  }

  async function handleViewRecipe(recipeId: number) {
    setViewingRecipeId(recipeId)
    setLoadingRecipe(true)

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        instructions,
        prep_time,
        cook_time,
        servings,
        calories,
        rating,
        recipe_ingredients (
          amount,
          measurement,
          ingredients (
            name
          )
        )
      `)
      .eq('id', recipeId)
      .single()

    if (error) {
      console.error('Error loading recipe details:', error)
      onShowToast?.('Failed to load recipe details', 'error')
      setViewingRecipeId(null)
      setLoadingRecipe(false)
      return
    }

    // Transform the data to match RecipeDetails type
    // Handle both array and object responses from Supabase
    const transformedData: RecipeDetails = {
      ...data,
      recipe_ingredients: data.recipe_ingredients.map((ri: any) => {
        let ingredientObj = { name: '' }
        if (Array.isArray(ri.ingredients) && ri.ingredients.length > 0) {
          ingredientObj = ri.ingredients[0]
        } else if (ri.ingredients && typeof ri.ingredients === 'object' && !Array.isArray(ri.ingredients)) {
          ingredientObj = ri.ingredients
        }
        return {
          amount: ri.amount,
          measurement: ri.measurement,
          ingredients: ingredientObj
        }
      })
    }

    setRecipeDetails(transformedData)
    setLoadingRecipe(false)
  }

  function handleCloseRecipeView() {
    setViewingRecipeId(null)
    setRecipeDetails(null)
  }

  if (!isOpen) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Meal Plan</h2>
              <p className="text-white/70 text-sm mt-1">{formatDate(selectedDate)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-3xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-white/60 text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Meal Type Assignments */}
              {mealTypes.map(mealType => {
                const assignedRecipeId = selectedRecipes[mealType.name]

                return (
                  <div key={mealType.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <label className="block text-white font-semibold mb-3">
                      {mealType.name}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={assignedRecipeId || ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : null
                          setSelectedRecipes(prev => ({ ...prev, [mealType.name]: value }))
                          handleAssignRecipe(mealType.name, value)
                        }}
                        className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                      >
                        <option value="" className="bg-gray-800">No recipe assigned</option>
                        {recipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id} className="bg-gray-800">
                            {recipe.name}
                          </option>
                        ))}
                      </select>
                      {assignedRecipeId && (
                        <button
                          onClick={() => handleViewRecipe(assignedRecipeId)}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-lg border border-blue-500/40 rounded-xl text-blue-200 font-medium transition-all duration-200 hover:scale-105 whitespace-nowrap"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Add Custom Meal Type */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <label className="block text-white font-semibold mb-3">
                  Add Custom Meal Type
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMealType}
                    onChange={(e) => setNewMealType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMealType()}
                    placeholder="e.g., Snack, Brunch..."
                    className="flex-1 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                  />
                  <button
                    onClick={handleAddMealType}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
                  >
                    Add
                  </button>
                </div>
              </div>

              {recipes.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  No recipes available. Create recipes first to assign them to meals.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/10 backdrop-blur-xl border-t border-white/20 p-6">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
          >
            Done
          </button>
        </div>
      </div>

      {/* Recipe Detail View Modal */}
      {viewingRecipeId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white/10 backdrop-blur-xl border-b border-white/20 p-6 z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">
                  {recipeDetails?.name || 'Loading...'}
                </h3>
                <button
                  onClick={handleCloseRecipeView}
                  className="text-white/60 hover:text-white text-3xl leading-none transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingRecipe ? (
                <div className="text-white/60 text-center py-8">Loading recipe...</div>
              ) : recipeDetails ? (
                <div className="space-y-6">
                  {/* Stats */}
                  {(recipeDetails.prep_time || recipeDetails.cook_time || recipeDetails.servings || recipeDetails.calories) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-lg">
                      {recipeDetails.prep_time && (
                        <div>
                          <div className="text-white/60 text-sm">Prep Time</div>
                          <div className="text-white font-semibold">{recipeDetails.prep_time}m</div>
                        </div>
                      )}
                      {recipeDetails.cook_time && (
                        <div>
                          <div className="text-white/60 text-sm">Cook Time</div>
                          <div className="text-white font-semibold">{recipeDetails.cook_time}m</div>
                        </div>
                      )}
                      {recipeDetails.servings && (
                        <div>
                          <div className="text-white/60 text-sm">Servings</div>
                          <div className="text-white font-semibold">{recipeDetails.servings}</div>
                        </div>
                      )}
                      {recipeDetails.calories && (
                        <div>
                          <div className="text-white/60 text-sm">Calories</div>
                          <div className="text-white font-semibold">{recipeDetails.calories}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ingredients */}
                  {recipeDetails.recipe_ingredients.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Ingredients</h4>
                      <ul className="space-y-2">
                        {recipeDetails.recipe_ingredients.map((ing, idx) => (
                          <li key={idx} className="text-white/80 bg-white/5 p-3 rounded-lg">
                            • {ing.amount} {ing.measurement} {ing.ingredients.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instructions */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Instructions</h4>
                    <p className="text-white/80 whitespace-pre-wrap leading-relaxed bg-white/5 p-4 rounded-lg">
                      {recipeDetails.instructions}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/10 backdrop-blur-xl border-t border-white/20 p-6">
              <button
                onClick={handleCloseRecipeView}
                className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
