'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AddRecipeModal from './AddRecipeModal'
import MealPlanWeekView from './MealPlanWeekView'

type Ingredient = {
  id: number
  name: string
}

type RecipeCategory = {
  id: number
  name: string
  color: string
}

type RecipeIngredient = {
  id?: number
  ingredient_id?: number
  ingredient_name: string
  amount: number | ''
  measurement: string
}

type Recipe = {
  id?: number
  name: string
  description?: string | null
  instructions: string
  recipe_ingredients: RecipeIngredient[]
  categories?: RecipeCategory[]
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  calories: number | null
  protein?: number | null
  fat?: number | null
  carbs?: number | null
  rating: number | null
}

type RecipeFromDB = {
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
  recipe_ingredients: Array<{
    id: number
    amount: number
    measurement: string
    ingredients: {
      id: number
      name: string
    }[]
  }>
  recipe_categories_junction: Array<{
    category_id: number
    recipe_categories: {
      id: number
      name: string
      color: string
    } | {
      id: number
      name: string
      color: string
    }[]
  }>
}

type RecipesViewProps = {
  sectionTitle?: string
  userId: string
  weekStartDay?: string
  onMealDayClick?: (date: string) => void
  mealRefreshKey?: number
  onAddWeekMealsToList?: (startDate: string, endDate: string) => void
}

export default function RecipesView({ sectionTitle, userId, weekStartDay = 'Sunday', onMealDayClick, mealRefreshKey, onAddWeekMealsToList }: RecipesViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [subView, setSubView] = useState<'recipes' | 'mealplan'>('recipes')

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function saveRecipeCategories(recipeId: number, selectedCategoryIds: number[]) {
    try {
      // Delete existing category associations
      const { error: deleteError } = await supabase
        .from('recipe_categories_junction')
        .delete()
        .eq('recipe_id', recipeId)

      if (deleteError) throw deleteError

      // Insert new category associations
      if (selectedCategoryIds.length > 0) {
        const entries = selectedCategoryIds.map((categoryId) => ({
          recipe_id: recipeId,
          category_id: categoryId,
        }))

        const { error: insertError } = await supabase
          .from('recipe_categories_junction')
          .insert(entries)

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error saving recipe categories:', error)
      throw error
    }
  }

  // Load recipes with ingredients on mount
  useEffect(() => {
    if (userId) {
      loadRecipes()
      loadCategories()
    }
  }, [userId])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 2500)

    return () => clearTimeout(timer)
  }, [toast])

  function showToast(message: string, tone: 'success' | 'error') {
    setToast({ message, tone })
  }

  async function loadRecipes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          description,
          instructions,
          prep_time,
          cook_time,
          servings,
          calories,
          protein,
          fat,
          carbs,
          rating,
          recipe_ingredients (
            id,
            amount,
            measurement,
            ingredients (
              id,
              name
            )
          ),
          recipe_categories_junction (
            category_id,
            recipe_categories (
              id,
              name,
              color
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform DB data to app format
      const transformedRecipes: Recipe[] = (data || []).map((dbRecipe: RecipeFromDB) => {
        // Handle recipe categories
        const recipeCategories: RecipeCategory[] = (dbRecipe.recipe_categories_junction || [])
          .map((junction: any) => {
            if (Array.isArray(junction.recipe_categories) && junction.recipe_categories.length > 0) {
              return junction.recipe_categories[0]
            } else if (junction.recipe_categories && typeof junction.recipe_categories === 'object') {
              return junction.recipe_categories
            }
            return null
          })
          .filter(Boolean)

        return {
          id: dbRecipe.id,
          name: dbRecipe.name,
          description: dbRecipe.description,
          instructions: dbRecipe.instructions,
          prep_time: dbRecipe.prep_time,
          cook_time: dbRecipe.cook_time,
          servings: dbRecipe.servings,
          calories: dbRecipe.calories,
          protein: dbRecipe.protein,
          fat: dbRecipe.fat,
          carbs: dbRecipe.carbs,
          rating: dbRecipe.rating,
          categories: recipeCategories,
          recipe_ingredients: (dbRecipe.recipe_ingredients || []).map((ri: any) => {
            // Handle both array and object responses from Supabase
            let ingredientName = ''
            let ingredientId = 0

            if (Array.isArray(ri.ingredients) && ri.ingredients.length > 0) {
              ingredientName = ri.ingredients[0]?.name || ''
              ingredientId = ri.ingredients[0]?.id || 0
            } else if (ri.ingredients && typeof ri.ingredients === 'object' && !Array.isArray(ri.ingredients)) {
              ingredientName = (ri.ingredients as any).name || ''
              ingredientId = (ri.ingredients as any).id || 0
            }

            return {
              id: ri.id,
              ingredient_id: ingredientId,
              ingredient_name: ingredientName,
              amount: ri.amount,
              measurement: ri.measurement,
            }
          }),
        }
      })

      setRecipes(transformedRecipes)
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRecipe(recipe: Recipe) {
    try {
      // Insert recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: userId,
          name: recipe.name,
          description: recipe.description || null,
          instructions: recipe.instructions,
          prep_time: recipe.prep_time || null,
          cook_time: recipe.cook_time || null,
          servings: recipe.servings || null,
          calories: recipe.calories || null,
          protein: recipe.protein || null,
          fat: recipe.fat || null,
          carbs: recipe.carbs || null,
          rating: recipe.rating || null,
        })
        .select()

      if (recipeError) throw recipeError
      if (!recipeData || recipeData.length === 0) throw new Error('Failed to create recipe')

      const newRecipeId = recipeData[0].id

      // Insert recipe ingredients
      if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
        const ingredientEntries = recipe.recipe_ingredients
          .filter((ing) => ing.ingredient_id !== undefined && ing.ingredient_id > 0 && ing.amount && ing.measurement)
          .map((ing) => ({
            recipe_id: newRecipeId,
            ingredient_id: ing.ingredient_id,
            amount: ing.amount,
            measurement: ing.measurement,
          }))

        if (ingredientEntries.length > 0) {
          const { error: ingredientError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientEntries)

          if (ingredientError) throw ingredientError
        }
      }

      // Save recipe categories
      if (recipe.categories && recipe.categories.length > 0) {
        const categoryIds = recipe.categories.map((cat) => cat.id)
        await saveRecipeCategories(newRecipeId, categoryIds)
      }

      // Reload recipes
      await loadRecipes()
      setIsModalOpen(false)
    } catch (error: any) {
      console.error('Error adding recipe:', error)
      showToast(`Failed to add recipe: ${error?.message || JSON.stringify(error)}`, 'error')
    }
  }

  async function handleUpdateRecipe(id: number, recipe: Recipe) {
    try {
      // Update recipe
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          name: recipe.name,
          description: recipe.description || null,
          instructions: recipe.instructions,
          prep_time: recipe.prep_time || null,
          cook_time: recipe.cook_time || null,
          servings: recipe.servings || null,
          calories: recipe.calories || null,
          protein: recipe.protein || null,
          fat: recipe.fat || null,
          carbs: recipe.carbs || null,
          rating: recipe.rating || null,
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Delete old recipe ingredients
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)

      if (deleteError) throw deleteError

      // Insert new recipe ingredients
      if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
        const ingredientEntries = recipe.recipe_ingredients
          .filter((ing) => ing.ingredient_id !== undefined && ing.ingredient_id > 0 && ing.amount && ing.measurement)
          .map((ing) => ({
            recipe_id: id,
            ingredient_id: ing.ingredient_id,
            amount: ing.amount,
            measurement: ing.measurement,
          }))

        if (ingredientEntries.length > 0) {
          const { error: ingredientError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientEntries)

          if (ingredientError) throw ingredientError
        }
      }

      // Save recipe categories
      const categoryIds = recipe.categories ? recipe.categories.map((cat) => cat.id) : []
      await saveRecipeCategories(id, categoryIds)

      // Reload recipes
      await loadRecipes()
      setIsModalOpen(false)
      setEditingRecipe(null)
      setIsDetailModalOpen(false)
    } catch (error: any) {
      console.error('Error updating recipe:', error)
      showToast(`Failed to update recipe: ${error?.message || JSON.stringify(error)}`, 'error')
    }
  }

  async function handleDeleteRecipe(id: number) {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id)

      if (error) throw error

      await loadRecipes()
      setIsDetailModalOpen(false)
      setSelectedRecipe(null)
    } catch (error: any) {
      console.error('Error deleting recipe:', error)
      showToast(`Failed to delete recipe: ${error?.message || JSON.stringify(error)}`, 'error')
    }
  }

  async function addToShoppingList(recipe: Recipe) {
    try {
      // Get current shopping list
      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      // Process each ingredient
      const itemsToUpsert = recipe.recipe_ingredients
        .filter((ing) => ing.ingredient_id && ing.amount && ing.measurement)
        .map((ing) => {
          // Check if this ingredient+measurement already exists
          const existing = existingItems?.find(
            (item) =>
              item.ingredient_id === ing.ingredient_id &&
              item.measurement === ing.measurement
          )

          const recipeId = recipe.id ? String(recipe.id) : null
          const existingCounts = (existing?.recipe_counts as Record<string, number>) || {}
          const nextCounts = recipeId
            ? {
                ...existingCounts,
                [recipeId]: (existingCounts[recipeId] || 0) + 1,
              }
            : existingCounts

          if (existing) {
            // Combine amounts
            return {
              id: existing.id,
              user_id: userId,
              ingredient_id: ing.ingredient_id,
              amount: Number(existing.amount) + Number(ing.amount),
              measurement: ing.measurement,
              recipe_id: recipe.id || null,
              recipe_counts: nextCounts,
            }
          } else {
            // New item
            return {
              user_id: userId,
              ingredient_id: ing.ingredient_id,
              amount: ing.amount,
              measurement: ing.measurement,
              recipe_id: recipe.id || null,
              recipe_counts: nextCounts,
            }
          }
        })

      if (itemsToUpsert.length === 0) {
        showToast('No ingredients to add.', 'error')
        return
      }

      // Upsert items — use unique constraint so new items don't crash
      const itemsWithoutId = itemsToUpsert.map(({ id: _id, ...rest }: any) => rest)
      const { error } = await supabase
        .from('shopping_list')
        .upsert(itemsWithoutId, { onConflict: 'user_id,ingredient_id,measurement' })

      if (error) throw error

      showToast(`Added ${itemsToUpsert.length} ingredients to shopping list.`, 'success')
    } catch (error) {
      console.error('Error adding to shopping list:', error)
      showToast('Failed to add ingredients to shopping list.', 'error')
    }
  }

  async function addSingleIngredientToShoppingList(
    ingredient: RecipeIngredient,
    recipeId: number | undefined
  ) {
    try {
      if (!ingredient.ingredient_id || !ingredient.amount || !ingredient.measurement) {
        showToast('Missing ingredient details.', 'error')
        return
      }

      // Get current shopping list
      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      // Check if this ingredient+measurement already exists
      const existing = existingItems?.find(
        (item) =>
          item.ingredient_id === ingredient.ingredient_id &&
          item.measurement === ingredient.measurement
      )

      const recipeIdStr = recipeId ? String(recipeId) : null
      const existingCounts = (existing?.recipe_counts as Record<string, number>) || {}
      const nextCounts = recipeIdStr
        ? {
            ...existingCounts,
            [recipeIdStr]: (existingCounts[recipeIdStr] || 0) + 1,
          }
        : existingCounts

      const itemToUpsert = existing
        ? {
            id: existing.id,
            user_id: userId,
            ingredient_id: ingredient.ingredient_id,
            amount: Number(existing.amount) + Number(ingredient.amount),
            measurement: ingredient.measurement,
            recipe_id: recipeId || null,
            recipe_counts: nextCounts,
          }
        : {
            user_id: userId,
            ingredient_id: ingredient.ingredient_id,
            amount: ingredient.amount,
            measurement: ingredient.measurement,
            recipe_id: recipeId || null,
            recipe_counts: nextCounts,
          }

      const { id: _id, ...itemWithoutId } = itemToUpsert
      const { error } = await supabase
        .from('shopping_list')
        .upsert([itemWithoutId], { onConflict: 'user_id,ingredient_id,measurement' })

      if (error) throw error

      showToast(`Added ${ingredient.ingredient_name} to shopping list.`, 'success')
    } catch (error) {
      console.error('Error adding ingredient to shopping list:', error)
      showToast('Failed to add ingredient to shopping list.', 'error')
    }
  }

  function openEditModal(recipe: Recipe) {
    setEditingRecipe(recipe)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingRecipe(null)
  }

  // Filter recipes by search query and category
  const filteredRecipes = recipes.filter((recipe) => {
    // Search query filter
    const query = searchQuery.toLowerCase()
    const matchesName = recipe.name.toLowerCase().includes(query)
    const matchesInstructions = recipe.instructions.toLowerCase().includes(query)
    const matchesIngredients = recipe.recipe_ingredients.some((ing) =>
      ing.ingredient_name.toLowerCase().includes(query)
    )
    const matchesSearch = matchesName || matchesInstructions || matchesIngredients

    // Category filter
    const matchesCategory =
      !selectedCategoryFilter ||
      (recipe.categories && recipe.categories.some((cat) => cat.id === selectedCategoryFilter))

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-white/60">Loading recipes...</div>
      </div>
    )
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
      {/* Header + controls */}
      <div className="flex-shrink-0 space-y-3 px-6 py-4">
        {/* Title + Toggle row */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{sectionTitle || '📖 Recipes'}</h2>
          <div className="flex bg-white/10 border border-white/20 rounded-xl p-1 gap-1">
            <button
              onClick={() => setSubView('recipes')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                subView === 'recipes'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              🍳 Recipes
            </button>
            <button
              onClick={() => setSubView('mealplan')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                subView === 'mealplan'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              📅 Meal Plan
            </button>
          </div>
        </div>

        {subView === 'recipes' && (<>
      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-white/60">Filter:</span>
          <button
            onClick={() => setSelectedCategoryFilter(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              selectedCategoryFilter === null
                ? 'bg-white/30 text-white border-2 border-white/40'
                : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {categories.map((category) => {
            const isSelected = selectedCategoryFilter === category.id
            const getCategoryStyle = (color: string, selected: boolean) => {
              const colors: Record<string, { bg: string; border: string; bgHover?: string }> = {
                yellow: { bg: selected ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.2)', border: selected ? 'rgba(250, 204, 21, 0.6)' : 'rgba(234, 179, 8, 0.3)', bgHover: 'rgba(234, 179, 8, 0.3)' },
                blue: { bg: selected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)', border: selected ? 'rgba(96, 165, 250, 0.6)' : 'rgba(59, 130, 246, 0.3)', bgHover: 'rgba(59, 130, 246, 0.3)' },
                purple: { bg: selected ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.2)', border: selected ? 'rgba(192, 132, 252, 0.6)' : 'rgba(168, 85, 247, 0.3)', bgHover: 'rgba(168, 85, 247, 0.3)' },
                pink: { bg: selected ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.2)', border: selected ? 'rgba(244, 114, 182, 0.6)' : 'rgba(236, 72, 153, 0.3)', bgHover: 'rgba(236, 72, 153, 0.3)' },
                green: { bg: selected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.2)', border: selected ? 'rgba(74, 222, 128, 0.6)' : 'rgba(34, 197, 94, 0.3)', bgHover: 'rgba(34, 197, 94, 0.3)' },
                orange: { bg: selected ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.2)', border: selected ? 'rgba(251, 146, 60, 0.6)' : 'rgba(249, 115, 22, 0.3)', bgHover: 'rgba(249, 115, 22, 0.3)' },
              }
              return colors[color] || colors.blue
            }
            const style = getCategoryStyle(category.color, isSelected)
            return (
              <button
                key={category.id}
                onClick={() =>
                  setSelectedCategoryFilter(
                    selectedCategoryFilter === category.id ? null : category.id
                  )
                }
                style={{
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  borderWidth: isSelected ? '2px' : '1px',
                }}
                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = style.bgHover!)}
                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = style.bg)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-all text-white"
              >
                {category.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Header with Search and Add Button */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search recipes, ingredients, instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20"
          />
        </div>
        <button
          onClick={() => {
            setEditingRecipe(null)
            setIsModalOpen(true)
          }}
          className="px-6 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
        >
          + Add Recipe
        </button>
      </div>
        </>)}
      </div>{/* end sticky header */}

      {/* Meal plan — fills remaining height, handles its own internal layout */}
      {subView === 'mealplan' && (
        <div className="flex-1 min-h-0 px-6 pb-6">
          <MealPlanWeekView
            userId={userId}
            weekStartDay={weekStartDay}
            onDayClick={onMealDayClick ?? (() => {})}
            refreshKey={mealRefreshKey}
            onAddWeekMealsToList={onAddWeekMealsToList}
          />
        </div>
      )}

      {/* Recipe grid — scrollable */}
      {subView === 'recipes' && (
        <div className="flex-1 min-h-0 overflow-y-auto view-scroll px-6 pb-6 pr-1">
          {filteredRecipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-white/60">
            {recipes.length === 0
              ? 'No recipes yet. Create one to get started!'
              : 'No recipes match your search.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => {
                setSelectedRecipe(recipe)
                setIsDetailModalOpen(true)
              }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-4 hover:bg-white/20 hover:border-white/40 cursor-pointer transition-all duration-200"
            >
              <h3 className="text-lg font-semibold text-white mb-2 truncate">
                {recipe.name}
              </h3>

              {/* Category Badges */}
              {recipe.categories && recipe.categories.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {recipe.categories.map((category) => {
                    const colors: Record<string, { bg: string; border: string }> = {
                      yellow: { bg: 'rgba(234, 179, 8, 0.3)', border: 'rgba(234, 179, 8, 0.4)' },
                      blue: { bg: 'rgba(59, 130, 246, 0.3)', border: 'rgba(59, 130, 246, 0.4)' },
                      purple: { bg: 'rgba(168, 85, 247, 0.3)', border: 'rgba(168, 85, 247, 0.4)' },
                      pink: { bg: 'rgba(236, 72, 153, 0.3)', border: 'rgba(236, 72, 153, 0.4)' },
                      green: { bg: 'rgba(34, 197, 94, 0.3)', border: 'rgba(34, 197, 94, 0.4)' },
                      orange: { bg: 'rgba(249, 115, 22, 0.3)', border: 'rgba(249, 115, 22, 0.4)' },
                    }
                    const style = colors[category.color] || colors.blue
                    return (
                      <span
                        key={category.id}
                        style={{ backgroundColor: style.bg, borderColor: style.border }}
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white border"
                      >
                        {category.name}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Quick Stats */}
              <div className="space-y-2 mb-4">
                {recipe.prep_time && (
                  <div className="text-sm text-white/70">
                    ⏱️ Prep: <span className="text-white">{recipe.prep_time}m</span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="text-sm text-white/70">
                    🔥 Cook: <span className="text-white">{recipe.cook_time}m</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="text-sm text-white/70">
                    🍽️ Servings: <span className="text-white">{recipe.servings}</span>
                  </div>
                )}
                {recipe.calories && (
                  <div className="text-sm text-white/70">
                    🔥 Calories: <span className="text-white">{recipe.calories}</span>
                  </div>
                )}
                {recipe.rating && (
                  <div className="text-sm text-white/70">
                    ⭐ Rating: <span className="text-white">{recipe.rating}/10</span>
                  </div>
                )}
              </div>

              {/* Ingredient Preview */}
              {recipe.recipe_ingredients.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs text-white/60 mb-2">
                    {recipe.recipe_ingredients.length} ingredients
                  </div>
                  <div className="space-y-1">
                    {recipe.recipe_ingredients.slice(0, 3).map((ing, idx) => (
                      <div key={idx} className="text-xs text-white/70">
                        {ing.amount} {ing.measurement} {ing.ingredient_name}
                      </div>
                    ))}
                    {recipe.recipe_ingredients.length > 3 && (
                      <div className="text-xs text-white/50 italic">
                        +{recipe.recipe_ingredients.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

        </div>
      )}

      {/* Add/Edit Recipe Modal */}
      <AddRecipeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onAddRecipe={handleAddRecipe}
        onUpdateRecipe={handleUpdateRecipe}
        onDeleteRecipe={handleDeleteRecipe}
        editingRecipe={editingRecipe}
        userId={userId}
        availableCategories={categories}
      />

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto w-full p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedRecipe.name}</h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            {selectedRecipe.description && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/80 text-sm leading-relaxed">{selectedRecipe.description}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white/5 rounded-lg">
              {selectedRecipe.prep_time && (
                <div>
                  <div className="text-white/60 text-sm">Prep Time</div>
                  <div className="text-white font-semibold">{selectedRecipe.prep_time}m</div>
                </div>
              )}
              {selectedRecipe.cook_time && (
                <div>
                  <div className="text-white/60 text-sm">Cook Time</div>
                  <div className="text-white font-semibold">{selectedRecipe.cook_time}m</div>
                </div>
              )}
              {selectedRecipe.servings && (
                <div>
                  <div className="text-white/60 text-sm">Servings</div>
                  <div className="text-white font-semibold">{selectedRecipe.servings}</div>
                </div>
              )}
              {selectedRecipe.calories && (
                <div>
                  <div className="text-white/60 text-sm">Calories</div>
                  <div className="text-white font-semibold">{selectedRecipe.calories}</div>
                </div>
              )}
            </div>

            {/* Nutrition Macros */}
            {(selectedRecipe.protein || selectedRecipe.fat || selectedRecipe.carbs) && (
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg">
                {selectedRecipe.protein && (
                  <div>
                    <div className="text-white/60 text-sm">Protein</div>
                    <div className="text-white font-semibold">{selectedRecipe.protein}g</div>
                  </div>
                )}
                {selectedRecipe.fat && (
                  <div>
                    <div className="text-white/60 text-sm">Fat</div>
                    <div className="text-white font-semibold">{selectedRecipe.fat}g</div>
                  </div>
                )}
                {selectedRecipe.carbs && (
                  <div>
                    <div className="text-white/60 text-sm">Carbs</div>
                    <div className="text-white font-semibold">{selectedRecipe.carbs}g</div>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients */}
            {selectedRecipe.recipe_ingredients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {selectedRecipe.recipe_ingredients.map((ing, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between text-white/80 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-all"
                    >
                      <span>
                        • {ing.amount} {ing.measurement} {ing.ingredient_name}
                      </span>
                      <button
                        onClick={() => addSingleIngredientToShoppingList(ing, selectedRecipe.id)}
                        className="px-3 py-1 bg-green-500/30 hover:bg-green-500/40 border border-green-500/50 rounded text-green-200 text-sm font-medium transition-all duration-200 flex-shrink-0 ml-3"
                      >
                        Add to shopping list
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {selectedRecipe.instructions}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  addToShoppingList(selectedRecipe)
                }}
                className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-200 font-medium transition-all duration-200"
              >
                🛒 Add ALL Ingredients to Shopping List
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    openEditModal(selectedRecipe)
                    setIsDetailModalOpen(false)
                  }}
                  className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-xl text-sm font-medium ${
              toast.tone === 'success'
                ? 'bg-green-500/20 border-green-500/40 text-green-100'
                : 'bg-red-500/20 border-red-500/40 text-red-100'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
