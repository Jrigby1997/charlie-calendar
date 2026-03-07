'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ShoppingListItem = {
  id: number
  ingredient_id: number
  amount: number
  measurement: string
  recipe_id: number | null
  recipe_counts?: Record<string, number> | null
  ingredients: {
    name: string
  }
}

type Ingredient = {
  id: number
  name: string
}

type ShoppingListViewProps = {
  sectionTitle?: string
  userId: string
}

export default function ShoppingListView({ sectionTitle, userId }: ShoppingListViewProps) {
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [recipesMap, setRecipesMap] = useState<Record<number, string>>({})
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newAmount, setNewAmount] = useState<number | ''>('')
  const [newMeasurement, setNewMeasurement] = useState('cup')
  const [showIngredientSuggestions, setShowIngredientSuggestions] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingAmount, setEditingAmount] = useState<number | ''>('')
  const [editingMeasurement, setEditingMeasurement] = useState('')

  const MEASUREMENTS = [
    'oz', 'lb', 'g', 'kg',
    'cup', 'tbsp', 'tsp', 'ml', 'l',
    'pinch', 'dash', 'piece', 'whole'
  ]

  useEffect(() => {
    if (userId) {
      loadShoppingList()
      loadRecipesMap()
      loadIngredients()
    }
  }, [userId])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  function showToast(message: string, tone: 'success' | 'error') {
    setToast({ message, tone })
  }

  async function loadShoppingList() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shopping_list')
        .select(`
          id,
          ingredient_id,
          amount,
          measurement,
          recipe_id,
          recipe_counts,
          ingredients (name)
        `)
        .order('ingredient_id')

      if (error) throw error

      // Transform data to match ShoppingListItem type
      // Handle both array and object responses from Supabase
      const transformedData: ShoppingListItem[] = (data || []).map((item: any) => {
        let ingredientObj = { name: '' }
        if (Array.isArray(item.ingredients) && item.ingredients.length > 0) {
          ingredientObj = item.ingredients[0]
        } else if (item.ingredients && typeof item.ingredients === 'object' && !Array.isArray(item.ingredients)) {
          ingredientObj = item.ingredients
        }
        return {
          ...item,
          ingredients: ingredientObj
        }
      })

      setItems(transformedData)
    } catch (error) {
      console.error('Error loading shopping list:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecipesMap() {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name')

      if (error) throw error

      const map: Record<number, string> = {}
      ;(data || []).forEach((recipe) => {
        map[recipe.id] = recipe.name
      })
      setRecipesMap(map)
    } catch (error) {
      console.error('Error loading recipes:', error)
    }
  }

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

  function formatShoppingList() {
    const unchecked = groupedList.filter(g => !checkedItems.has(g.ingredient_id))

    let text = '🛒 Shopping List\n━━━━━━━━━━━━━━━━━━\n\n'

    unchecked.forEach((group) => {
      const amounts = group.parts.map((part) => `${part.amount} ${part.measurement}`).join(' + ')
      text += `☐ ${amounts} ${group.name}\n`

      const sources = formatSources(group.recipeCounts)
      if (sources) text += `   (${sources})\n`
      text += '\n'
    })

    const checkedCount = checkedItems.size
    if (checkedCount > 0) {
      text += `\n━━━━━━━━━━━━━━━━━━\n✓ ${checkedCount} item${checkedCount > 1 ? 's' : ''} already checked off\n`
    }

    return unchecked.length > 0 ? text : 'Shopping List\n\nNo items to share!'
  }

  async function handleShareList() {
    try {
      const text = formatShoppingList()

      if (navigator.share) {
        await navigator.share({ title: 'Shopping List', text })
        showToast('List shared successfully!', 'success')
      } else {
        await navigator.clipboard.writeText(text)
        showToast('List copied to clipboard!', 'success')
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
        showToast('Failed to share list', 'error')
      }
    }
  }

  async function clearShoppingList() {
    if (!confirm('Clear entire shopping list?')) return

    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
      await loadShoppingList()
      setCheckedItems(new Set())
    } catch (error) {
      console.error('Error clearing shopping list:', error)
    }
  }

  async function removeItem(ingredientId: number) {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', userId)
        .eq('ingredient_id', ingredientId)

      if (error) throw error
      await loadShoppingList()
      setCheckedItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(ingredientId)
        return newSet
      })
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  async function updateItemAmount(itemId: number, newAmount: number, newMeasurement: string) {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .update({ amount: newAmount, measurement: newMeasurement })
        .eq('id', itemId)

      if (error) throw error
      await loadShoppingList()
      setEditingItemId(null)
      showToast('Amount updated', 'success')
    } catch (error) {
      console.error('Error updating item:', error)
      showToast('Failed to update amount', 'error')
    }
  }

  function toggleCheck(ingredientId: number) {
    setCheckedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId)
      } else {
        newSet.add(ingredientId)
      }
      return newSet
    })
  }

  function formatSources(recipeCounts: Record<string, number> | null | undefined) {
    if (!recipeCounts || Object.keys(recipeCounts).length === 0) return null

    const parts = Object.entries(recipeCounts).map(([recipeId, count]) => {
      const name = recipesMap[Number(recipeId)] || `Recipe ${recipeId}`
      return count > 1 ? `${name} x ${count}` : name
    })

    return parts.join(', ')
  }

  async function addManualItem() {
    const name = newIngredientName.trim()
    if (!name || newAmount === '' || !newMeasurement) return

    try {
      let ingredient = availableIngredients.find(
        (ing) => ing.name.toLowerCase() === name.toLowerCase()
      )

      if (!ingredient) {
        const { data, error } = await supabase
          .from('ingredients')
          .insert([{ name, user_id: userId }])
          .select('id, name')
          .single()

        if (error) throw error
        ingredient = data
        setAvailableIngredients((prev) => [...prev, data])
      }

      const { data: existingItem, error: fetchError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)
        .eq('ingredient_id', ingredient.id)
        .eq('measurement', newMeasurement)
        .maybeSingle()

      if (fetchError) throw fetchError

      const nextAmount = Number(existingItem?.amount || 0) + Number(newAmount)
      const recipeCounts = existingItem?.recipe_counts || {}

      const { error } = await supabase
        .from('shopping_list')
        .upsert({
          id: existingItem?.id,
          user_id: userId,
          ingredient_id: ingredient.id,
          amount: nextAmount,
          measurement: newMeasurement,
          recipe_id: null,
          recipe_counts: recipeCounts,
        })

      if (error) throw error

      setNewIngredientName('')
      setNewAmount('')
      setNewMeasurement('cup')
      await loadShoppingList()
    } catch (error) {
      console.error('Error adding manual item:', error)
    }
  }

  function getManualIngredientSuggestions() {
    const term = newIngredientName.trim().toLowerCase()
    if (!term) return []

    return availableIngredients.filter((ing) =>
      ing.name.toLowerCase().includes(term)
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-white/60">Loading shopping list...</div>
      </div>
    )
  }

  const groupedItems = items.reduce<Record<number, {
    ingredient_id: number
    name: string
    parts: Array<{ id: number; amount: number; measurement: string }>
    recipeCounts: Record<string, number>
  }>>((acc, item) => {
    const existing = acc[item.ingredient_id]
    const counts = (item.recipe_counts as Record<string, number>) || {}

    if (existing) {
      existing.parts.push({ id: item.id, amount: item.amount, measurement: item.measurement })
      Object.entries(counts).forEach(([key, value]) => {
        existing.recipeCounts[key] = (existing.recipeCounts[key] || 0) + value
      })
    } else {
      acc[item.ingredient_id] = {
        ingredient_id: item.ingredient_id,
        name: item.ingredients.name,
        parts: [{ id: item.id, amount: item.amount, measurement: item.measurement }],
        recipeCounts: { ...counts },
      }
    }
    return acc
  }, {})

  const groupedList = Object.values(groupedItems).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 h-full flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">{sectionTitle || '🛒 Shopping List'}</h2>
        {items.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={handleShareList}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-200 font-medium transition-all duration-200 flex items-center gap-2"
            >
              <span>📤</span> Share List
            </button>
            <button
              onClick={clearShoppingList}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 font-medium transition-all duration-200"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Add Manual Item */}
      <div className="flex-shrink-0 px-6 py-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-4">
        <div className="text-white/80 font-medium mb-3">Add item</div>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="number"
            step="0.25"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Amt"
            className="w-24 px-3 py-2 border border-white/30 rounded-lg text-white placeholder-white/60 bg-white/10"
          />
          <select
            value={newMeasurement}
            onChange={(e) => setNewMeasurement(e.target.value)}
            className="w-24 px-3 py-2 border border-white/30 rounded-lg text-white bg-white/10"
          >
            {MEASUREMENTS.map((m) => (
              <option key={m} value={m} className="bg-gray-800">
                {m}
              </option>
            ))}
          </select>
          <div className="flex-1 min-w-[220px] relative">
            <input
              type="text"
              value={newIngredientName}
              onChange={(e) => {
                setNewIngredientName(e.target.value)
                setShowIngredientSuggestions(true)
              }}
              onFocus={() => setShowIngredientSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowIngredientSuggestions(false), 150)
              }}
              placeholder="Ingredient name"
              className="w-full px-3 py-2 border border-white/30 rounded-lg text-white placeholder-white/60 bg-white/10"
            />
            {showIngredientSuggestions && getManualIngredientSuggestions().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/20 backdrop-blur-lg border border-white/30 rounded-lg z-50 max-h-40 overflow-y-auto shadow-lg">
                {getManualIngredientSuggestions().map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setNewIngredientName(ing.name)
                      setShowIngredientSuggestions(false)
                    }}
                    className="w-full text-left px-3 py-2 text-white/90 hover:bg-white/30 transition-all duration-200 text-sm"
                  >
                    {ing.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addManualItem}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white font-medium transition-all duration-200"
          >
            Add to list
          </button>
        </div>
      </div>
      </div>{/* end add item */}

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto view-scroll px-6 pb-6 pr-1">
        {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-white/60">
            Your shopping list is empty. Add ingredients from recipes to get started!
          </div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-6">
          <div className="space-y-3">
            {groupedList.map((group) => (
              <div
                key={group.ingredient_id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-200 ${
                  checkedItems.has(group.ingredient_id)
                    ? 'bg-white/5 opacity-50'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={checkedItems.has(group.ingredient_id)}
                  onChange={() => toggleCheck(group.ingredient_id)}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-white/90 focus:ring-2 focus:ring-white/50 cursor-pointer"
                />

                {/* Ingredient Info */}
                <div className="flex-1">
                  <div
                    className={`text-white font-medium ${
                      checkedItems.has(group.ingredient_id) ? 'line-through' : ''
                    }`}
                  >
                    {group.parts.map((part, idx) => (
                      <div key={part.id} className="flex items-center gap-2 mb-1">
                        {editingItemId === part.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.25"
                              value={editingAmount}
                              onChange={(e) =>
                                setEditingAmount(e.target.value === '' ? '' : Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 border border-white/30 rounded text-white placeholder-white/60 bg-white/10 text-sm"
                            />
                            <select
                              value={editingMeasurement}
                              onChange={(e) => setEditingMeasurement(e.target.value)}
                              className="w-20 px-2 py-1 border border-white/30 rounded text-white bg-white/10 text-sm"
                            >
                              {MEASUREMENTS.map((m) => (
                                <option key={m} value={m} className="bg-gray-800">
                                  {m}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                if (editingAmount !== '' && editingMeasurement) {
                                  updateItemAmount(part.id, Number(editingAmount), editingMeasurement)
                                }
                              }}
                              className="px-2 py-1 bg-green-500/30 hover:bg-green-500/40 border border-green-500/50 rounded text-green-200 text-xs font-medium transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-2 py-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white/80 text-xs font-medium transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingItemId(part.id)
                              setEditingAmount(part.amount)
                              setEditingMeasurement(part.measurement)
                            }}
                            className="text-blue-300 hover:text-blue-200 hover:underline text-sm transition-colors"
                          >
                            {part.amount} {part.measurement}
                          </button>
                        )}
                      </div>
                    ))}
                    {group.parts.length > 0 && <span>{group.name}</span>}
                  </div>
                  {formatSources(group.recipeCounts) && (
                    <div className="text-white/50 text-sm">
                      from {formatSources(group.recipeCounts)}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => removeItem(group.ingredient_id)}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all duration-200 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="text-white/70">
              Total: <span className="font-semibold text-white">{groupedList.length}</span> items
              {checkedItems.size > 0 && (
                <span className="ml-4">
                  • <span className="font-semibold text-white">{checkedItems.size}</span> checked
                </span>
              )}
            </div>
          </div>
        </div>
        )}
      </div>{/* end scrollable list */}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-6 py-3 rounded-lg shadow-lg border backdrop-blur-xl ${
            toast.tone === 'success'
              ? 'bg-green-500/20 border-green-500/40 text-green-200'
              : 'bg-red-500/20 border-red-500/40 text-red-200'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
