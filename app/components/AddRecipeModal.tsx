'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  instructions: string
  recipe_ingredients: RecipeIngredient[]
  categories?: RecipeCategory[]
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  calories: number | null
  rating: number | null
}

type AddRecipeModalProps = {
  isOpen: boolean
  onClose: () => void
  onAddRecipe: (recipe: Recipe) => void
  onUpdateRecipe?: (id: number, recipe: Recipe) => void
  onDeleteRecipe?: (id: number) => void
  editingRecipe?: Recipe | null
  userId: string
  availableCategories: RecipeCategory[]
}

const MEASUREMENTS = [
  'oz', 'lb', 'g', 'kg',
  'cup', 'tbsp', 'tsp', 'ml', 'l',
  'pinch', 'dash', 'piece', 'whole'
]

export default function AddRecipeModal({
  isOpen,
  onClose,
  onAddRecipe,
  onUpdateRecipe,
  onDeleteRecipe,
  editingRecipe,
  userId,
  availableCategories,
}: AddRecipeModalProps) {
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [prepTime, setPrepTime] = useState<number | ''>('')
  const [cookTime, setCookTime] = useState<number | ''>('')
  const [servings, setServings] = useState<number | ''>('')
  const [calories, setCalories] = useState<number | ''>('')
  const [rating, setRating] = useState<number | ''>('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null)
  const [ingredientSearchInput, setIngredientSearchInput] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')

  // Load available ingredients on mount
  useEffect(() => {
    if (isOpen && userId) {
      loadIngredients()
    }
  }, [isOpen, userId])

  // Pre-fill form when editing
  useEffect(() => {
    if (editingRecipe) {
      setName(editingRecipe.name)
      setInstructions(editingRecipe.instructions)
      setPrepTime(editingRecipe.prep_time ?? '')
      setCookTime(editingRecipe.cook_time ?? '')
      setServings(editingRecipe.servings ?? '')
      setCalories(editingRecipe.calories ?? '')
      setRating(editingRecipe.rating ?? '')
      setIngredients(editingRecipe.recipe_ingredients || [])
      setSelectedCategories(editingRecipe.categories ? editingRecipe.categories.map((c) => c.id) : [])
    } else {
      resetForm()
    }
  }, [editingRecipe, isOpen])

  async function loadIngredients() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setAvailableIngredients(data || [])
    } catch (error) {
      console.error('Error loading ingredients:', error)
    }
  }

  function resetForm() {
    setName('')
    setInstructions('')
    setPrepTime('')
    setCookTime('')
    setServings('')
    setCalories('')
    setRating('')
    setIngredients([])
    setSelectedCategories([])
    setIngredientSearchInput('')
    setEditingIngredientIndex(null)
    setImportUrl('')
    setImportError('')
  }

  async function handleImportRecipe() {
    if (!importUrl.trim()) return

    setIsImporting(true)
    setImportError('')

    try {
      const response = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to import recipe')
      }

      const recipeData = await response.json()

      // Auto-fill form with imported data
      if (recipeData.name) setName(recipeData.name)
      if (recipeData.instructions) setInstructions(recipeData.instructions)
      if (recipeData.prep_time) setPrepTime(recipeData.prep_time)
      if (recipeData.cook_time) setCookTime(recipeData.cook_time)
      if (recipeData.servings) setServings(recipeData.servings)
      if (recipeData.calories) setCalories(recipeData.calories)

      // Process ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const processedIngredients = await Promise.all(
          recipeData.ingredients.map(async (ing: any) => {
            // Try to find existing ingredient
            let ingredient = availableIngredients.find(
              (i) => i.name.toLowerCase() === ing.ingredient_name.toLowerCase()
            )

            // Create new ingredient if not found
            if (!ingredient) {
              ingredient = await createNewIngredient(ing.ingredient_name) || undefined
            }

            if (!ingredient) {
              return null
            }

            return {
              ingredient_id: ingredient.id,
              ingredient_name: ing.ingredient_name,
              amount: ing.amount || 1,
              measurement: ing.measurement || 'whole',
            }
          })
        )

        setIngredients(processedIngredients.filter((ing): ing is NonNullable<typeof ing> => ing !== null && ing.ingredient_id !== undefined))
      }

      setImportUrl('')
      setImportError('')
    } catch (error: any) {
      console.error('Error importing recipe:', error)
      setImportError(error.message || 'Failed to import recipe. Please check the URL and try again.')
    } finally {
      setIsImporting(false)
    }
  }

  async function createNewIngredient(name: string): Promise<Ingredient | null> {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert([{ name, user_id: userId }])
        .select('id, name')
        .single()

      if (error) throw error
      if (data) {
        setAvailableIngredients((prev) => [...prev, data])
        return data
      }
    } catch (error) {
      console.error('Error creating ingredient:', error)
    }
    return null
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { ingredient_name: '', amount: '', measurement: 'cup' }])
  }

  function removeIngredientRow(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof RecipeIngredient, value: any) {
    setIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function updateIngredientFields(index: number, updates: Partial<RecipeIngredient>) {
    setIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }

  async function selectOrCreateIngredient(index: number, ingredientName: string) {
    const existing = availableIngredients.find(
      (ing) => ing.name.toLowerCase() === ingredientName.toLowerCase()
    )

    if (existing) {
      updateIngredientFields(index, {
        ingredient_name: existing.name,
        ingredient_id: existing.id,
      })
    } else if (ingredientName.trim()) {
      const newIngredient = await createNewIngredient(ingredientName.trim())
      if (newIngredient) {
        updateIngredientFields(index, {
          ingredient_name: newIngredient.name,
          ingredient_id: newIngredient.id,
        })
      }
    }

    // Clear search and close dropdown
    setIngredientSearchInput('')
    setEditingIngredientIndex(null)
  }

  function getFilteredIngredients(): Ingredient[] {
    const searchTerm = ingredientSearchInput.toLowerCase()
    if (!searchTerm) return availableIngredients
    return availableIngredients.filter((ing) => ing.name.toLowerCase().includes(searchTerm))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Check if required fields are filled
    if (!name.trim()) {
      alert('Please enter a recipe name')
      return
    }

    // Filter ingredients - ensure all required fields are present
    const validIngredients = ingredients.filter((ing) => {
      const hasId = ing.ingredient_id !== undefined && ing.ingredient_id !== null && ing.ingredient_id > 0
      const hasName = ing.ingredient_name && ing.ingredient_name.trim()
      const hasAmount = ing.amount || ing.amount === 0
      const hasMeasurement = ing.measurement && ing.measurement.trim()

      return hasId && hasName && hasAmount && hasMeasurement
    })

    const recipeData: Recipe = {
      name,
      instructions,
      recipe_ingredients: validIngredients,
      categories: availableCategories.filter((cat) => selectedCategories.includes(cat.id)),
      prep_time: prepTime === '' ? null : Number(prepTime),
      cook_time: cookTime === '' ? null : Number(cookTime),
      servings: servings === '' ? null : Number(servings),
      calories: calories === '' ? null : Number(calories),
      rating: rating === '' ? null : Number(rating),
    }

    if (editingRecipe && onUpdateRecipe) {
      onUpdateRecipe(editingRecipe.id!, recipeData)
    } else {
      onAddRecipe(recipeData)
    }

    onClose()
  }

  const handleDelete = () => {
    if (
      editingRecipe &&
      onDeleteRecipe &&
      confirm('Are you sure you want to delete this recipe?')
    ) {
      onDeleteRecipe(editingRecipe.id!)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="p-6 border-b border-white/20 sticky top-0 bg-white/10 backdrop-blur-xl z-10">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">
            {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Import from URL */}
          <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-4">
            <div className="text-white/80 font-medium mb-2">Import from URL</div>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="Paste recipe URL (AllRecipes, NYTimes, Food Network...)"
                className="flex-1 px-4 py-2 border border-white/30 rounded-lg text-white placeholder-white/60 bg-white/10"
              />
              <button
                type="button"
                onClick={handleImportRecipe}
                disabled={isImporting || !importUrl.trim()}
                className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
            {importError && (
              <div className="mt-2 text-red-300 text-sm">{importError}</div>
            )}
          </div>

          {/* Recipe Name */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Recipe Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Chocolate Chip Cookies"
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
            />
          </div>

          {/* Categories */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Categories
              </label>
              <div className="flex gap-2 flex-wrap">
                {availableCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id)
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
                      type="button"
                      onClick={() => {
                        setSelectedCategories((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== category.id)
                            : [...prev, category.id]
                        )
                      }}
                      style={{
                        backgroundColor: style.bg,
                        borderColor: style.border,
                        borderWidth: isSelected ? '2px' : '1px',
                      }}
                      onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = style.bgHover!)}
                      onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = style.bg)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all text-white"
                    >
                      {category.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Time and Servings Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Prep Time (min)
              </label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value === '' ? '' : Number(e.target.value))}
                min="0"
                placeholder="15"
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Cook Time (min)
              </label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value === '' ? '' : Number(e.target.value))}
                min="0"
                placeholder="30"
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Servings
              </label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value === '' ? '' : Number(e.target.value))}
                min="1"
                placeholder="4"
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">
                Calories
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                min="0"
                placeholder="250"
                className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Rating (1-10)
            </label>
            <input
              type="number"
              value={rating}
              onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
              max="10"
              placeholder="8"
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
            />
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-white/90">Ingredients *</label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
              >
                + Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <p className="text-white/60 text-sm mb-2">Click "Add Ingredient" to start adding ingredients</p>
            ) : (
              <div className="space-y-2 mb-3 bg-white/5 rounded-xl p-4 border border-white/10">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    {/* Amount */}
                    <input
                      type="number"
                      step="0.25"
                      value={ingredient.amount}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value)
                        updateIngredient(index, 'amount', val)
                      }}
                      placeholder="Amt"
                      className="w-16 px-3 py-2 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40 text-sm"
                    />

                    {/* Measurement */}
                    <select
                      value={ingredient.measurement}
                      onChange={(e) => updateIngredient(index, 'measurement', e.target.value)}
                      className="w-20 px-3 py-2 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40 text-sm"
                    >
                      {MEASUREMENTS.map((m) => (
                        <option key={m} value={m} className="bg-gray-800">
                          {m}
                        </option>
                      ))}
                    </select>

                    {/* Ingredient Search/Select */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={editingIngredientIndex === index ? ingredientSearchInput : ingredient.ingredient_name}
                        onChange={(e) => {
                          setEditingIngredientIndex(index)
                          setIngredientSearchInput(e.target.value)
                        }}
                        onFocus={() => setEditingIngredientIndex(index)}
                        placeholder="Search or type..."
                        className="w-full px-3 py-2 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40 text-sm"
                      />

                      {/* Dropdown suggestions - only show when editing this ingredient */}
                      {editingIngredientIndex === index && ingredientSearchInput && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white/20 backdrop-blur-lg border border-white/30 rounded-lg z-50 max-h-40 overflow-y-auto shadow-lg">
                          {getFilteredIngredients().length > 0 ? (
                            getFilteredIngredients().map((ing) => (
                              <button
                                key={`${ing.id}-${ing.name}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  selectOrCreateIngredient(index, ing.name)
                                }}
                                className="w-full text-left px-3 py-2 text-white/90 hover:bg-white/30 transition-all duration-200 text-sm"
                              >
                                {ing.name}
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                selectOrCreateIngredient(index, ingredientSearchInput)
                              }}
                              className="w-full text-left px-3 py-2 text-white/70 hover:bg-white/30 transition-all duration-200 text-sm font-medium"
                            >
                              ✓ Create &quot;{ingredientSearchInput}&quot;
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(index)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all duration-200 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Instructions *
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              rows={10}
              placeholder="1. Preheat oven to 350°F&#10;2. Mix dry ingredients&#10;3. Add wet ingredients&#10;4. Bake for 10-12 minutes"
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {editingRecipe && onDeleteRecipe && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500/30 backdrop-blur-lg hover:bg-red-500/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-red-300/30"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
            >
              {editingRecipe ? 'Update Recipe' : 'Add Recipe'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200 border border-white/20 hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
