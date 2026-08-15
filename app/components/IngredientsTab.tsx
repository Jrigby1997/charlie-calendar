'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import GlassButton from './ui/GlassButton'
import { AISLE_OPTIONS } from '@/lib/aisleOptions'
import { PRESET_INGREDIENTS } from '@/lib/presetIngredients'

type Ingredient = {
  id: number
  name: string
  aliases: string[]
  aisle: string | null
  is_pantry_staple: boolean
}

type IngredientsTabProps = {
  userId: string
}

export default function IngredientsTab({ userId }: IngredientsTabProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  // Per-ingredient state
  const [addAliasInput, setAddAliasInput] = useState<Record<number, string>>({})
  const [mergeTarget, setMergeTarget] = useState<Record<number, number | ''>>({})
  const [merging, setMerging] = useState<number | null>(null)
  const [confirmMergeId, setConfirmMergeId] = useState<number | null>(null)
  const [aisleEditId, setAisleEditId] = useState<number | null>(null)
  const [restoringDefaults, setRestoringDefaults] = useState(false)

  function showToast(message: string, tone: 'success' | 'error') {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadIngredients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (error) {
      console.error('Error loading ingredients:', error)
    } else {
      setIngredients((data ?? []).map(i => ({ ...i, aliases: i.aliases ?? [], aisle: i.aisle ?? null, is_pantry_staple: i.is_pantry_staple ?? false })))
    }
    setLoading(false)
  }

  useEffect(() => { loadIngredients() }, [userId])

  async function restoreDefaults() {
    setRestoringDefaults(true)
    try {
      const existingNames = new Set(ingredients.map(i => i.name.toLowerCase()))
      const toInsert = PRESET_INGREDIENTS
        .filter(p => !existingNames.has(p.name.toLowerCase()))
        .map(p => ({ user_id: userId, name: p.name, aliases: p.aliases, aisle: p.aisle }))
      if (toInsert.length === 0) {
        showToast('All default ingredients are already present.', 'success')
        return
      }
      const { error } = await supabase.from('ingredients').insert(toInsert)
      if (error) throw error
      showToast(`Restored ${toInsert.length} default ingredient${toInsert.length !== 1 ? 's' : ''}.`, 'success')
      await loadIngredients()
    } catch {
      showToast('Failed to restore defaults.', 'error')
    } finally {
      setRestoringDefaults(false)
    }
  }

  async function addAlias(ingredient: Ingredient) {
    const alias = (addAliasInput[ingredient.id] ?? '').trim()
    if (!alias) return
    if (ingredient.aliases.map(a => a.toLowerCase()).includes(alias.toLowerCase())) {
      showToast('That alias already exists.', 'error')
      return
    }

    const newAliases = [...ingredient.aliases, alias]
    const { error } = await supabase
      .from('ingredients')
      .update({ aliases: newAliases })
      .eq('id', ingredient.id)
      .eq('user_id', userId)

    if (error) {
      showToast('Failed to add alias.', 'error')
    } else {
      setAddAliasInput(prev => ({ ...prev, [ingredient.id]: '' }))
      setIngredients(prev =>
        prev.map(i => i.id === ingredient.id ? { ...i, aliases: newAliases } : i)
      )
      showToast(`Added alias "${alias}" to ${ingredient.name}.`, 'success')
    }
  }

  async function togglePantryStaple(ingredient: Ingredient) {
    const next = !ingredient.is_pantry_staple
    const { error } = await supabase.from('ingredients').update({ is_pantry_staple: next }).eq('id', ingredient.id).eq('user_id', userId)
    if (error) {
      showToast('Failed to update pantry staple.', 'error')
      return
    }
    setIngredients(prev => prev.map(i => i.id === ingredient.id ? { ...i, is_pantry_staple: next } : i))
  }

  async function updateIngredientAisle(id: number, aisle: string | null) {
    const { error } = await supabase.from('ingredients').update({ aisle }).eq('id', id).eq('user_id', userId)
    if (!error) {
      setIngredients(prev => prev.map(i => i.id === id ? { ...i, aisle } : i))
      setAisleEditId(null)
    }
  }

  async function removeAlias(ingredient: Ingredient, alias: string) {
    const newAliases = ingredient.aliases.filter(a => a !== alias)
    const { error } = await supabase
      .from('ingredients')
      .update({ aliases: newAliases })
      .eq('id', ingredient.id)
      .eq('user_id', userId)

    if (error) {
      showToast('Failed to remove alias.', 'error')
    } else {
      setIngredients(prev =>
        prev.map(i => i.id === ingredient.id ? { ...i, aliases: newAliases } : i)
      )
    }
  }

  async function mergeIngredient(sourceId: number) {
    const source = ingredients.find(i => i.id === sourceId)
    const targetId = mergeTarget[sourceId]
    if (!source || !targetId) return

    const target = ingredients.find(i => i.id === targetId)
    if (!target) return

    setMerging(sourceId)
    try {
      // 1. Reroute recipe_ingredients rows to target
      const { error: riError } = await supabase
        .from('recipe_ingredients')
        .update({ ingredient_id: targetId })
        .eq('ingredient_id', sourceId)
      if (riError) throw riError

      // 2. Reroute shopping_list rows to target
      const { error: slError } = await supabase
        .from('shopping_list')
        .update({ ingredient_id: targetId })
        .eq('ingredient_id', sourceId)
        .eq('user_id', userId)
      if (slError) throw slError

      // 3. Merge source name + aliases into target's aliases (deduped)
      const combined = [...new Set([
        ...target.aliases,
        source.name,
        ...source.aliases,
      ])].filter(a => a.toLowerCase() !== target.name.toLowerCase())

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ aliases: combined })
        .eq('id', targetId)
        .eq('user_id', userId)
      if (updateError) throw updateError

      // 4. Delete the source ingredient
      const { error: deleteError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', sourceId)
        .eq('user_id', userId)
      if (deleteError) throw deleteError

      setConfirmMergeId(null)
      setMergeTarget(prev => { const n = { ...prev }; delete n[sourceId]; return n })
      showToast(`Merged "${source.name}" into "${target.name}".`, 'success')
      await loadIngredients()
    } catch (err) {
      console.error('Merge error:', err)
      showToast('Merge failed. Please try again.', 'error')
    } finally {
      setMerging(null)
    }
  }

  const filtered = search.trim()
    ? ingredients.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()))
      )
    : ingredients

  // Other ingredients available as merge targets (excludes the source)
  function getMergeOptions(sourceId: number) {
    return ingredients.filter(i => i.id !== sourceId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/50">
        Loading ingredients…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${toast.tone === 'success' ? 'bg-emerald-600/90' : 'bg-red-600/90'}`}>
          {toast.message}
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search ingredients or aliases…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="recipe-input w-full px-4 py-2 bg-black/20 border border-white/25 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/45 focus:ring-1 focus:ring-white/20"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-white/40 text-xs mt-1.5 pl-1">{ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} total</p>
          <button
            onClick={restoreDefaults}
            disabled={restoringDefaults}
            className="text-xs text-white/40 hover:text-white/60 transition-colors disabled:opacity-40 mt-1"
          >
            {restoringDefaults ? 'Restoring…' : '↩ Restore defaults'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            {search ? 'No ingredients match that search.' : 'No ingredients yet — add recipes to create them.'}
          </div>
        ) : filtered.map(ingredient => {
          const isConfirmingMerge = confirmMergeId === ingredient.id
          const isMergingThis = merging === ingredient.id

          return (
            <div
              key={ingredient.id}
              className="bg-white/5 border border-white/15 rounded-xl px-4 py-3 space-y-2"
            >
              {/* Name row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-semibold text-sm">{ingredient.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePantryStaple(ingredient)}
                    aria-pressed={ingredient.is_pantry_staple}
                    className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                      ingredient.is_pantry_staple
                        ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-100'
                        : 'bg-white/8 hover:bg-white/15 border-white/15 text-white/40 hover:text-white/70'
                    }`}
                    title={ingredient.is_pantry_staple ? 'Pantry staple — skipped when building the shopping list. Click to unset.' : 'Mark as pantry staple (always on hand → skip on shopping list)'}
                  >
                    🥫 Staple
                  </button>
                  <button
                    onClick={() => setConfirmMergeId(isConfirmingMerge ? null : ingredient.id)}
                    className="text-white/40 hover:text-white/70 text-xs px-2 py-1 bg-white/8 hover:bg-white/15 rounded-lg border border-white/15 transition-all"
                    title="Merge this ingredient into another"
                  >
                    Merge into…
                  </button>
                </div>
              </div>

              {/* Alias chips */}
              {ingredient.aliases.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ingredient.aliases.map(alias => (
                    <span
                      key={alias}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-200"
                    >
                      {alias}
                      <button
                        onClick={() => removeAlias(ingredient, alias)}
                        className="text-purple-300/60 hover:text-red-300 transition-colors leading-none"
                        title={`Remove alias "${alias}"`}
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add alias input */}
              <form
                onSubmit={e => { e.preventDefault(); addAlias(ingredient) }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Add alias (e.g. large eggs)…"
                  value={addAliasInput[ingredient.id] ?? ''}
                  onChange={e => setAddAliasInput(prev => ({ ...prev, [ingredient.id]: e.target.value }))}
                  className="recipe-input flex-1 text-xs px-3 py-1.5 bg-black/20 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
                <GlassButton
                  size="sm"
                  type="submit"
                  className="text-xs px-3 py-1.5"
                  disabled={!(addAliasInput[ingredient.id] ?? '').trim()}
                >
                  + Add
                </GlassButton>
              </form>

              {/* Aisle */}
              <div>
                {aisleEditId === ingredient.id ? (
                  <div className="bg-white/5 border border-white/15 rounded-xl p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {AISLE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateIngredientAisle(ingredient.id, opt.value)}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            ingredient.aisle === opt.value
                              ? 'bg-purple-500/40 border border-purple-400/40 text-white'
                              : 'bg-white/8 hover:bg-white/15 text-white/60 hover:text-white'
                          }`}
                        >
                          <span>{opt.emoji}</span>
                          <span className="truncate">{opt.value}</span>
                        </button>
                      ))}
                      {ingredient.aisle && (
                        <button
                          onClick={() => updateIngredientAisle(ingredient.id, null)}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/12 text-white/40 hover:text-white/60 transition-all"
                        >✕ None</button>
                      )}
                    </div>
                    <button onClick={() => setAisleEditId(null)} className="mt-1.5 w-full text-center text-xs text-white/40 hover:text-white/60 transition-colors">Done</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAisleEditId(ingredient.id)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors inline-flex items-center gap-1"
                  >
                    {ingredient.aisle
                      ? <><span>{AISLE_OPTIONS.find(a => a.value === ingredient.aisle)?.emoji ?? '📦'}</span><span>{ingredient.aisle}</span></>
                      : <span>+ aisle</span>
                    }
                  </button>
                )}
              </div>

              {/* Merge panel */}
              {isConfirmingMerge && (
                <div className="border-t border-white/10 pt-2 space-y-2">
                  <p className="text-white/50 text-xs">
                    Merging will redirect all recipes + shopping list items to the target ingredient, then add
                    "<span className="text-white/70">{ingredient.name}</span>" as an alias on the target.
                  </p>
                  <div className="flex items-center gap-2 min-w-0">
                    <select
                      value={mergeTarget[ingredient.id] ?? ''}
                      onChange={e => setMergeTarget(prev => ({ ...prev, [ingredient.id]: e.target.value ? Number(e.target.value) : '' }))}
                      className="min-w-0 flex-1 truncate text-xs px-2 py-1.5 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="">— select target —</option>
                      {getMergeOptions(ingredient.id).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={!mergeTarget[ingredient.id] || isMergingThis}
                      onClick={() => mergeIngredient(ingredient.id)}
                      title={isMergingThis ? 'Merging…' : 'Confirm merge'}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-400/30 text-emerald-300 hover:text-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span className="text-sm leading-none">{isMergingThis ? '…' : '✓'}</span>
                    </button>
                    <button
                      onClick={() => setConfirmMergeId(null)}
                      title="Cancel"
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/50 hover:text-white transition-all"
                    >
                      <span className="text-xs leading-none">✕</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
