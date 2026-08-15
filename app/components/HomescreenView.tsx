'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SpecialDay } from './AddSpecialDayModal'
import GlassButton from './ui/GlassButton'

interface Event {
  id: number
  title: string
  date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  is_special_day?: boolean | null
  event_family_members: { family_members: { id: number; name: string; color: string } }[]
}

interface FamilyMember {
  id: number
  name: string
  color: string
  avatar_url?: string | null
}

interface MealPlan {
  date: string
  meal_type: string
  recipe_id?: number | null
  recipes?: { name: string } | null
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
  recipe_ingredients: { amount: number; measurement: string; ingredient_name: string; ingredient_id?: number }[]
}

interface WeatherDay {
  date: string
  weathercode: number
  tempMax: number
  tempMin: number
  wind: number
  precipitation: number
  snowfall: number
}

interface WeatherData {
  daily: WeatherDay[]
  units: string
}

interface HomescreenViewProps {
  userId: string
  colorTheme: string
  familyMembers: FamilyMember[]
  familySectionTitle: string
  specialDays: SpecialDay[]
  events: Event[]
  mealPlans: MealPlan[]
  weatherData: WeatherData | null
  weatherUnits: string
  weatherLocation?: string
  onNavigateToDate?: (dateISO: string) => void
  onOpenTasks?: () => void
  onEditMeal?: (mealType: string, dateISO: string) => void
  onAddSpecialDay?: () => void
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code <= 3) return '☁️'
  if (code <= 49) return '🌫️'
  if (code <= 59) return '🌦️'
  if (code <= 69) return '🌧️'
  if (code <= 79) return '❄️'
  if (code <= 82) return '🌧️'
  if (code <= 84) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌡️'
}

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2,'0')} ${ampm}`
}

function toLocalDateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function HomescreenView({
  userId, colorTheme, familyMembers, familySectionTitle,
  specialDays, events, mealPlans, weatherData, weatherUnits, onAddSpecialDay,
  weatherLocation, onNavigateToDate, onOpenTasks, onEditMeal,
}: HomescreenViewProps) {
  const today = toLocalDateISO(new Date())
  const tomorrow = toLocalDateISO(new Date(Date.now() + 86400000))

  // Task completions for today - per member
  const [taskStats, setTaskStats] = useState<Map<number, { total: number; done: number }>>(new Map())

  // Recipe detail viewer
  const [viewingRecipe, setViewingRecipe] = useState<RecipeDetail | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [addingToList, setAddingToList] = useState(false)

  async function openRecipeDetail(recipeId: number) {
    setLoadingRecipe(true)
    setViewingRecipe(null)
    const { data, error } = await supabase
      .from('recipes')
      .select(`id, name, description, instructions, prep_time, cook_time, servings, calories, protein, fat, carbs, rating,
        recipe_ingredients ( ingredient_id, amount, measurement, ingredients ( name ) )`)
      .eq('id', recipeId)
      .single()
    setLoadingRecipe(false)
    if (error || !data) return
    setViewingRecipe({
      id: data.id, name: data.name, description: data.description, instructions: data.instructions,
      prep_time: data.prep_time, cook_time: data.cook_time, servings: data.servings, calories: data.calories,
      protein: data.protein, fat: data.fat, carbs: data.carbs, rating: data.rating,
      recipe_ingredients: (data.recipe_ingredients as any[]).map(ri => ({
        amount: ri.amount, measurement: ri.measurement, ingredient_id: ri.ingredient_id,
        ingredient_name: Array.isArray(ri.ingredients) ? ri.ingredients[0]?.name : ri.ingredients?.name ?? ''
      }))
    })
  }

  async function addRecipeToShoppingList(recipe: RecipeDetail) {
    setAddingToList(true)
    try {
      const valid = recipe.recipe_ingredients.filter(i => i.ingredient_id && i.amount && i.measurement)
      if (valid.length === 0) { setAddingToList(false); return }
      const { data: existing } = await supabase.from('shopping_list').select('*').eq('user_id', userId)
      const items = valid.map(ing => {
        const ex = (existing || []).find(e => e.ingredient_id === ing.ingredient_id && e.measurement === ing.measurement)
        const counts = { ...((ex?.recipe_counts as Record<string,number>) || {}), [String(recipe.id)]: ((ex?.recipe_counts as Record<string,number>)?.[String(recipe.id)] || 0) + 1 }
        return ex
          ? { id: ex.id, user_id: userId, ingredient_id: ing.ingredient_id, amount: Number(ex.amount) + Number(ing.amount), measurement: ing.measurement, recipe_id: recipe.id, recipe_counts: counts }
          : { user_id: userId, ingredient_id: ing.ingredient_id, amount: ing.amount, measurement: ing.measurement, recipe_id: recipe.id, recipe_counts: counts }
      })
      await supabase.from('shopping_list').upsert(items.map(({ id: _id, ...r }) => r), { onConflict: 'user_id,ingredient_id,measurement' })
    } catch (err) { console.error(err) }
    setAddingToList(false)
  }

  // Family notepad
  const [noteContent, setNoteContent] = useState('')
  const [noteLoaded, setNoteLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load tasks today & completions
  useEffect(() => {
    async function loadTaskStats() {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, task_assignments(family_member_id)')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (!tasks) return

      const { data: completions } = await supabase
        .from('task_completions')
        .select('task_id, family_member_id')
        .eq('completed_date', today)

      const completionSet = new Set((completions || []).map((c: any) => `${c.task_id}-${c.family_member_id}`))

      const stats = new Map<number, { total: number; done: number }>()
      for (const member of familyMembers) {
        stats.set(member.id, { total: 0, done: 0 })
      }

      for (const task of tasks) {
        const memberIds: number[] = (task.task_assignments as { family_member_id: number }[]).map(a => a.family_member_id)
        for (const mid of memberIds) {
          const s = stats.get(mid)
          if (!s) continue
          s.total++
          if (completionSet.has(`${task.id}-${mid}`)) s.done++
        }
      }

      setTaskStats(new Map(stats))
    }

    if (familyMembers.length > 0) {
      loadTaskStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, today, familyMembers.length])

  // Load family notepad
  useEffect(() => {
    async function loadNote() {
      const { data } = await supabase
        .from('family_notes')
        .select('content')
        .eq('user_id', userId)
        .maybeSingle()
      setNoteContent(data?.content ?? '')
      setNoteLoaded(true)
    }
    loadNote()
  }, [userId])

  const handleNoteChange = useCallback((value: string) => {
    setNoteContent(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await supabase.from('family_notes').upsert({
        user_id: userId,
        content: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }, 1000)
  }, [userId])

  // Clear any pending note-save timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Special day countdowns — next 90 days
  const now = new Date()
  now.setHours(0,0,0,0)
  const upcoming: { emoji: string; title: string; date: Date; daysAway: number; color: string | null }[] = []

  for (const sd of specialDays) {
    let sdDate = new Date(sd.date + 'T00:00:00')
    if (sd.is_recurring) {
      sdDate = new Date(now.getFullYear(), sdDate.getMonth(), sdDate.getDate())
      if (sdDate < now) sdDate = new Date(sdDate.getFullYear() + 1, sdDate.getMonth(), sdDate.getDate())
    }
    const daysAway = Math.round((sdDate.getTime() - now.getTime()) / 86400000)
    if (daysAway >= 0 && daysAway <= 90) {
      upcoming.push({ emoji: sd.emoji, title: sd.title, date: sdDate, daysAway, color: sd.color })
    }
  }

  for (const ev of events) {
    if (!ev.is_special_day) continue
    const evDate = new Date(ev.date + 'T00:00:00')
    const daysAway = Math.round((evDate.getTime() - now.getTime()) / 86400000)
    if (daysAway >= 0 && daysAway <= 90) {
      upcoming.push({ emoji: '⭐', title: ev.title, date: evDate, daysAway, color: null })
    }
  }

  upcoming.sort((a, b) => a.daysAway - b.daysAway)

  // Today/tomorrow events
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  const tomorrowEvents = events.filter(e => e.date === tomorrow).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))

  // Today's meals
  const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
  const todayMeals = mealPlans.filter(m => m.date === today)
  const PROMO_MEALS = ['Breakfast', 'Lunch', 'Dinner']

  // Weather today
  const weatherToday = weatherData?.daily?.[0]

  const colorBorderMap: Record<string, string> = {
    rose: 'border-rose-400', pink: 'border-pink-400', purple: 'border-purple-400',
    blue: 'border-blue-400', cyan: 'border-cyan-400', green: 'border-green-400',
    yellow: 'border-yellow-400', orange: 'border-orange-400', red: 'border-red-400',
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Good {getGreeting()}</h1>
          <p className="text-white/60 text-sm mt-0.5">{formatFullDate(new Date())}</p>
          {weatherLocation && <p className="text-white/50 text-xs mt-0.5">📍 {weatherLocation}</p>}
        </div>
        {weatherToday && (
          <div className="text-right">
            <div className="text-3xl">{weatherEmoji(weatherToday.weathercode)}</div>
            <div className="text-white font-semibold">{Math.round(weatherToday.tempMax)}°{weatherUnits === 'celsius' ? 'C' : 'F'}</div>
          </div>
        )}
      </div>

      {/* Special Day Countdowns */}
      {/* Always show Breakfast/Lunch/Dinner tiles (mobile-ready) */}
      <section>
        <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">🍽️ Today's Meals</h2>
        <div className="grid grid-cols-3 gap-2">
          {PROMO_MEALS.map(mealType => {
            const meal = todayMeals.find(m => m.meal_type === mealType)
            const name = meal?.recipes?.name || ''
            const hasRecipe = !!meal?.recipe_id
            return (
              <div
                key={mealType}
                className={`bg-white/10 rounded-xl p-2 border border-white/15 transition-colors ${hasRecipe ? 'cursor-pointer hover:bg-white/20 active:bg-white/25' : 'cursor-pointer hover:bg-white/12'}`}
                onClick={() => hasRecipe && meal?.recipe_id ? openRecipeDetail(meal.recipe_id) : onEditMeal?.(mealType, today)}
              >
                <p className="text-white/50 text-xs mb-0.5">{mealType}</p>
                <p className="text-white text-sm font-medium leading-tight truncate">{name || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {hasRecipe ? <p className="text-white/30 text-[10px]">Tap to view</p> : <p className="text-white/30 text-[10px]">No recipe</p>}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditMeal?.(mealType, today) }}
                    className="ml-auto text-xs text-white/60 hover:text-white px-2 py-1 rounded-md bg-white/5"
                  >
                    Change
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => onNavigateToDate?.(today)} className="cursor-pointer">
            <EventColumn title="📅 Today" events={todayEvents} emptyText="Nothing today" />
          </div>
          <div onClick={() => onNavigateToDate?.(tomorrow)} className="cursor-pointer">
            <EventColumn title="📅 Tomorrow" events={tomorrowEvents} emptyText="Nothing tomorrow" />
          </div>
        </div>
      </section>


      {/* Task Overview */}
      {familyMembers.length > 0 && (
        <section>
          <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">✅ Tasks Today</h2>
          <div className="flex flex-wrap gap-3">
            {familyMembers.map(member => {
              const stats = taskStats.get(member.id) ?? { total: 0, done: 0 }
              const pct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0
              return (
                  <div key={member.id} onClick={() => onOpenTasks?.()} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/15 min-w-[120px] cursor-pointer hover:bg-white/20">
                  {member.avatar_url ? (
                    <img src={`/avatars/${member.avatar_url}`} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: member.color }}>
                      {member.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{member.name}</p>
                    <p className="text-white/50 text-xs">{stats.done}/{stats.total} done</p>
                    <div className="mt-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Family Notepad */}
      <section>
        <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">📝 Family Notepad</h2>
        <div className="bg-white/10 rounded-xl border border-white/15 p-3">
          {noteLoaded ? (
            <textarea
              value={noteContent}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Shared notes for the family… grocery reminders, passwords, plans…"
              rows={5}
              className="w-full bg-transparent text-white placeholder-white/30 resize-none focus:outline-none text-base leading-relaxed"
            />
          ) : (
            <div className="h-24 flex items-center justify-center text-white/30 text-sm">Loading…</div>
          )}
        </div>
      </section>

      {/* Weather Widget */}
      {weatherData && weatherData.daily.length > 0 && (
        <section>
          <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">🌤️ Weather</h2>
          <div className="bg-white/10 rounded-xl border border-white/15 p-3">
            {/* Today big card */}
            {weatherToday && (
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-white/15">
                <div className="text-5xl">{weatherEmoji(weatherToday.weathercode)}</div>
                <div>
                  <p className="text-3xl font-bold text-white">{Math.round(weatherToday.tempMax)}°<span className="text-white/50 text-lg font-normal">/ {Math.round(weatherToday.tempMin)}°</span></p>
                    <p className="text-white/60 text-sm">💨 {Math.round(weatherToday.wind)} mph · 💧 {weatherToday.precipitation.toFixed(1)}&quot;</p>
                    {weatherLocation && <p className="text-white/50 text-xs mt-1">📍 {weatherLocation}</p>}
                </div>
              </div>
            )}
            {/* 6-day strip */}
            <div className="grid grid-cols-6 gap-1">
              {weatherData.daily.slice(1, 7).map(day => (
                <div key={day.date} className="flex flex-col items-center gap-0.5">
                  <p className="text-white/50 text-xs">{new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <span className="text-lg">{weatherEmoji(day.weathercode)}</span>
                  <p className="text-white text-xs font-medium">{Math.round(day.tempMax)}°</p>
                  <p className="text-white/40 text-xs">{Math.round(day.tempMin)}°</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recipe Detail Modal */}
      {(viewingRecipe || loadingRecipe) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewingRecipe(null)}
        >
          <div
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {loadingRecipe ? (
              <div className="p-8 text-center text-white/60">Loading recipe…</div>
            ) : viewingRecipe && (
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-white leading-tight">{viewingRecipe.name}</h2>
                  <button onClick={() => setViewingRecipe(null)} className="shrink-0 text-white/50 hover:text-white text-2xl leading-none">✕</button>
                </div>

                {viewingRecipe.description && (
                  <p className="text-white/70 text-sm leading-relaxed">{viewingRecipe.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Prep', value: viewingRecipe.prep_time ? `${viewingRecipe.prep_time}m` : '—' },
                    { label: 'Cook', value: viewingRecipe.cook_time ? `${viewingRecipe.cook_time}m` : '—' },
                    { label: 'Servings', value: viewingRecipe.servings ?? '—' },
                    { label: 'Calories', value: viewingRecipe.calories ?? '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
                      <p className="text-white/50 text-xs">{s.label}</p>
                      <p className="text-white font-semibold text-sm">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Macros */}
                {(viewingRecipe.protein != null || viewingRecipe.fat != null || viewingRecipe.carbs != null) && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Protein', value: viewingRecipe.protein, unit: 'g' },
                      { label: 'Fat', value: viewingRecipe.fat, unit: 'g' },
                      { label: 'Carbs', value: viewingRecipe.carbs, unit: 'g' },
                    ].map(m => (
                      <div key={m.label} className="bg-white/10 rounded-xl p-2 text-center">
                        <p className="text-white/50 text-xs">{m.label}</p>
                        <p className="text-white font-semibold text-sm">{m.value != null ? `${m.value}${m.unit}` : '—'}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ingredients */}
                {viewingRecipe.recipe_ingredients.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Ingredients</h3>
                    <ul className="space-y-1">
                      {viewingRecipe.recipe_ingredients.map((ing, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-white/30 mt-0.5">•</span>
                          <span className="text-white/80">{ing.amount} {ing.measurement} {ing.ingredient_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {viewingRecipe.instructions && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Instructions</h3>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{viewingRecipe.instructions}</p>
                  </div>
                )}

                {viewingRecipe.rating != null && (
                  <p className="text-white/50 text-sm">Rating: {'★'.repeat(viewingRecipe.rating)}{'☆'.repeat(5 - viewingRecipe.rating)}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => addRecipeToShoppingList(viewingRecipe)}
                    disabled={addingToList}
                    className="flex-1 bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {addingToList ? 'Adding…' : '🛒 Add ALL Ingredients to Shopping List'}
                  </button>
                  <button
                    onClick={() => setViewingRecipe(null)}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

function formatFullDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function EventColumn({ title, events, emptyText }: { title: string; events: Event[]; emptyText: string }) {
  return (
    <div className="bg-white/10 rounded-xl border border-white/15 p-3">
      <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">{title}</h3>
      {events.length === 0 ? (
        <p className="text-white/30 text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-2">
              {ev.start_time && (
                <span className="text-xs font-medium text-white/50 mt-0.5 shrink-0">{formatTime(ev.start_time)}</span>
              )}
              <p className="text-white text-sm leading-tight line-clamp-2">{ev.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
