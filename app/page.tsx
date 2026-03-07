'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import CalendarView from './components/CalendarView'
import RecipesView from './components/RecipesView'
import ShoppingListView from './components/ShoppingListView'
import TasksView from './components/TasksView'
import RewardsView from './components/RewardsView'
import AddEventModal from './components/AddEventModal'
import MealPlanModal from './components/MealPlanModal'
import SettingsModal from './components/SettingsModal'
import ExternalEventDetailModal from './components/ExternalEventDetailModal'

type Event = {
  id: number
  title: string
  date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
  is_recurring: boolean
  recurrence_pattern: string | null
  recurrence_interval: number
  recurrence_end_date: string | null
  recurrence_days: string | null
  created_at: string
  event_family_members: {
    family_members: {
      id: number
      name: string
      color: string
    }
  }[]
  baseEventId?: number // For virtual instances of recurring/multi-day events
  isExternal?: boolean // True for events synced from external providers (Google, etc.)
  externalProvider?: string // 'google' | 'outlook' | 'apple'
}

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

export default function Home() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingInstanceDate, setEditingInstanceDate] = useState<string>('')
  const [newEventDate, setNewEventDate] = useState<string>('')
  const [newEventTime, setNewEventTime] = useState<string>('')
  const [eventExceptions, setEventExceptions] = useState<any[]>([])
  const [currentView, setCurrentView] = useState<'calendar' | 'recipes' | 'shopping-list' | 'tasks' | 'rewards'>('calendar')
  const [visibleMembers, setVisibleMembers] = useState<Set<number>>(new Set())
  const [showUnassigned, setShowUnassigned] = useState(true)
  const [mealPlans, setMealPlans] = useState<any[]>([])
  const [selectedMealDate, setSelectedMealDate] = useState<string | null>(null)
  const [isMealModalOpen, setIsMealModalOpen] = useState(false)
  const [mealPlanRefreshKey, setMealPlanRefreshKey] = useState(0)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [calendarTitle, setCalendarTitle] = useState('Charlie Calendar')
  const [familySectionTitle, setFamilySectionTitle] = useState('Family Members')
  const [colorTheme, setColorTheme] = useState('default')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [weekStartDay, setWeekStartDay] = useState('Sunday')
  const [externalRawEvents, setExternalRawEvents] = useState<any[]>([])
  const [externalCalendarConfigs, setExternalCalendarConfigs] = useState<Map<string, {
    family_member_ids: number[]
    calendar_name: string
    google_email: string | null
  }>>(new Map())
  const [googleConnected, setGoogleConnected] = useState(false)
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false)

  // External event detail modal
  const [externalEventDetail, setExternalEventDetail] = useState<{
    event: Event
    calendarName: string
    googleEmail: string | null
  } | null>(null)

  // Toast auto-dismiss effect
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

  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N for new event
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setNewEventDate(new Date().toISOString().split('T')[0])
        setIsModalOpen(true)
      }
      // Ctrl+F for search (focus on search if available)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setIsModalOpen(false)
        setIsMealModalOpen(false)
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load events from database
  useEffect(() => {
    if (!user) return // Don't load data if not authenticated

    loadEvents()
    loadFamilyMembers()
    loadEventExceptions()
    loadMealPlans()
    loadSettings()
    loadExternalData()

    // Subscribe to realtime changes
    const eventsChannel = supabase
      .channel('events-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          loadEvents()
        }
      )
      .subscribe()

    const membersChannel = supabase
      .channel('members-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'family_members' },
        () => {
          loadFamilyMembers()
        }
      )
      .subscribe()

    const exceptionsChannel = supabase
      .channel('exceptions-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_exceptions' },
        () => {
          loadEventExceptions()
        }
      )
      .subscribe()

    const mealPlansChannel = supabase
      .channel('meal-plans-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meal_plans' },
        () => {
          loadMealPlans()
        }
      )
      .subscribe()

    const settingsChannel = supabase
      .channel('settings-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          loadSettings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(exceptionsChannel)
      supabase.removeChannel(mealPlansChannel)
      supabase.removeChannel(settingsChannel)
    }
  }, [user])

  // Handle redirect back from Google OAuth consent screen
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google') {
      window.history.replaceState({}, '', window.location.pathname)
      ;(async () => {
        setIsSyncingGoogle(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          const res = await fetch('/api/google-calendar/sync', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (res.ok) {
            await loadExternalData()
            showToast('Google Calendar connected! Events synced.', 'success')
          } else {
            showToast('Connected, but sync failed — try syncing manually.', 'error')
          }
        } finally {
          setIsSyncingGoogle(false)
        }
      })()
    } else if (params.get('google_error')) {
      window.history.replaceState({}, '', window.location.pathname)
      showToast(`Google Calendar error: ${params.get('google_error')}`, 'error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Initialize all members as visible when family members load
  useEffect(() => {
    if (familyMembers.length > 0) {
      setVisibleMembers(new Set(familyMembers.map(m => m.id)))
    }
  }, [familyMembers])

  async function loadFamilyMembers() {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, color, role, avatar_url')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading family members:', error)
    } else {
      setFamilyMembers(data || [])
    }
  }

  async function loadSettings() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('Error loading settings:', error)
      // Keep defaults if no settings found
    } else if (data) {
      setCalendarTitle(data.calendar_title)
      setFamilySectionTitle(data.family_section_title)
      setColorTheme(data.color_theme || 'default')
      setDateFormat(data.date_format || 'MM/DD/YYYY')
      setWeekStartDay(data.week_start_day || 'Sunday')
    }
  }

  async function loadEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_family_members (
          family_members (
            id,
            name,
            color
          )
        )
      `)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading events:', error)
    } else {
      setEvents(data || [])
    }
  }

  async function loadEventExceptions() {
    const { data, error } = await supabase
      .from('event_exceptions')
      .select('*')

    if (error) {
      console.error('Error loading event exceptions:', error)
    } else {
      setEventExceptions(data || [])
    }
  }

  async function loadMealPlans() {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')

    if (error) {
      console.error('Error loading meal plans:', error)
    } else {
      setMealPlans(data || [])
    }
  }

  async function loadExternalData() {
    // Load enabled external calendar configs for deriving family member assignment
    const { data: calendars } = await supabase
      .from('external_calendars')
      .select('external_calendar_id, family_member_ids, is_enabled, calendar_name, integration_id')
      .eq('is_enabled', true)

    // Also load integrations to resolve google_email per calendar
    const integrationIds = [...new Set((calendars || []).map(c => c.integration_id).filter(Boolean))]
    let integrationEmailMap: Map<number, string | null> = new Map()
    if (integrationIds.length > 0) {
      const { data: integrations } = await supabase
        .from('user_integrations')
        .select('id, google_email')
        .in('id', integrationIds)
      ;(integrations || []).forEach(i => integrationEmailMap.set(i.id, i.google_email))
    }

    const configMap = new Map(
      (calendars || []).map(c => [
        c.external_calendar_id,
        {
          family_member_ids: (() => {
            try { return JSON.parse(c.family_member_ids || '[]') as number[] }
            catch { return [] }
          })(),
          calendar_name: c.calendar_name as string,
          google_email: integrationEmailMap.get(c.integration_id) ?? null,
        },
      ])
    )
    setExternalCalendarConfigs(configMap)
    setGoogleConnected((calendars?.length ?? 0) > 0)

    if (calendars && calendars.length > 0) {
      const calIds = calendars.map(c => c.external_calendar_id)
      const { data: evs, error } = await supabase
        .from('external_events')
        .select('*')
        .in('external_calendar_id', calIds)
      if (!error) setExternalRawEvents(evs || [])
    } else {
      setExternalRawEvents([])
    }
  }

  async function syncGoogleCalendar() {
    if (!user) return
    setIsSyncingGoogle(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        await loadExternalData()
        showToast('Google Calendar synced!', 'success')
      } else {
        showToast('Sync failed — please try again', 'error')
      }
    } catch {
      showToast('Sync failed — please try again', 'error')
    } finally {
      setIsSyncingGoogle(false)
    }
  }

  function toggleMemberVisibility(memberId: number) {
    setVisibleMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  function shouldShowEvent(event: Event): boolean {
    const assignedMembers = event.event_family_members || []

    // If event has no assigned members, show based on unassigned filter
    if (assignedMembers.length === 0) {
      return showUnassigned
    }

    // If event has assigned members, show if at least one is visible
    return assignedMembers.some(efm => visibleMembers.has(efm.family_members.id))
  }

  function getFilteredEvents(eventsToFilter: Event[]): Event[] {
    return eventsToFilter.filter(shouldShowEvent)
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 animate-gradient-slow"></div>
        </div>
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  async function handleAddEvent(title: string, date: string, endDate: string, startTime: string, endTime: string, description: string, selectedMemberIds: number[], isRecurring: boolean, recurrencePattern: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[]) {
    if (!user) {
      console.error('No user logged in')
      return
    }

    // First, create the event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert([{
        title,
        date,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        description: description || null,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        recurrence_interval: isRecurring ? recurrenceInterval : 1,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
        recurrence_days: isRecurring && recurrenceDays.length > 0 ? JSON.stringify(recurrenceDays) : null,
        user_id: user.id
      }])
      .select()
      .single()

    if (eventError) {
      console.error('Error adding event:', eventError)
      return
    }

    // Then, create the family member associations
    if (selectedMemberIds.length > 0 && newEvent) {
      const associations = selectedMemberIds.map(memberId => ({
        event_id: newEvent.id,
        family_member_id: memberId
      }))

      const { error: associationError } = await supabase
        .from('event_family_members')
        .insert(associations)

      if (associationError) {
        console.error('Error adding family member associations:', associationError)
        return
      }
    }
  }

  async function handleUpdateEvent(id: number, title: string, date: string, endDate: string, startTime: string, endTime: string, description: string, selectedMemberIds: number[], isRecurring: boolean, recurrencePattern: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[], updateScope?: 'single' | 'all' | 'future', instanceDate?: string) {

    if (updateScope === 'single' && instanceDate) {
      // Create or update exception for this single instance
      const { error } = await supabase
        .from('event_exceptions')
        .upsert({
          base_event_id: id,
          exception_date: instanceDate,
          is_deleted: false,
          modified_title: title,
          modified_start_time: startTime || null,
          modified_end_time: endTime || null,
          modified_description: description || null,
          modified_family_member_ids: selectedMemberIds.length > 0 ? JSON.stringify(selectedMemberIds) : null
        }, {
          onConflict: 'base_event_id,exception_date'
        })

      if (error) {
        console.error('Error creating exception:', error)
      }
    } else if (updateScope === 'future' && instanceDate) {
      // End the current series before this date, create new series from this date forward
      const originalEvent = events.find(e => e.id === id)
      if (!originalEvent) return

      // Update the original event to end before this instance
      const dayBefore = new Date(instanceDate)
      dayBefore.setDate(dayBefore.getDate() - 1)

      await supabase
        .from('events')
        .update({
          recurrence_end_date: dayBefore.toISOString().split('T')[0]
        })
        .eq('id', id)

      // Create new recurring event starting from this instance
      const { data: newEvent, error: newEventError } = await supabase
        .from('events')
        .insert([{
          title,
          date: instanceDate,
          end_date: endDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          description: description || null,
          is_recurring: isRecurring,
          recurrence_pattern: originalEvent.recurrence_pattern,
          recurrence_interval: originalEvent.recurrence_interval,
          recurrence_end_date: recurrenceEndDate || null,
          recurrence_days: originalEvent.recurrence_days,
          user_id: user?.id
        }])
        .select()
        .single()

      if (!newEventError && newEvent && selectedMemberIds.length > 0) {
        const associations = selectedMemberIds.map(memberId => ({
          event_id: newEvent.id,
          family_member_id: memberId
        }))
        await supabase.from('event_family_members').insert(associations)
      }
    } else {
      // Update all instances (original behavior)
      const { error: eventError } = await supabase
        .from('events')
        .update({
          title,
          date,
          end_date: endDate || null,
          start_time: startTime || null,
          end_time: endTime || null,
          description: description || null,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          recurrence_interval: isRecurring ? recurrenceInterval : 1,
          recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
          recurrence_days: isRecurring && recurrenceDays.length > 0 ? JSON.stringify(recurrenceDays) : null
        })
        .eq('id', id)

      if (eventError) {
        console.error('Error updating event:', eventError)
        return
      }

      // Delete existing family member associations
      await supabase
        .from('event_family_members')
        .delete()
        .eq('event_id', id)

      // Create new associations
      if (selectedMemberIds.length > 0) {
        const associations = selectedMemberIds.map(memberId => ({
          event_id: id,
          family_member_id: memberId
        }))

        const { error: associationError } = await supabase
          .from('event_family_members')
          .insert(associations)

        if (associationError) {
          console.error('Error updating family member associations:', associationError)
        }
      }
    }

    await loadEvents()
    setEditingEvent(null)
    setEditingInstanceDate('')
  }

async function handleDeleteEvent(id: number, deleteScope?: 'single' | 'all' | 'future', instanceDate?: string) {

    if (deleteScope === 'single' && instanceDate) {
      // Mark this single instance as deleted in exceptions
      const { error } = await supabase
        .from('event_exceptions')
        .upsert({
          base_event_id: id,
          exception_date: instanceDate,
          is_deleted: true
        }, {
          onConflict: 'base_event_id,exception_date'
        })

      if (error) {
        console.error('Error creating deletion exception:', error)
      }
    } else if (deleteScope === 'future' && instanceDate) {
      // End the recurrence before this date
      const dayBefore = new Date(instanceDate)
      dayBefore.setDate(dayBefore.getDate() - 1)

      const { error } = await supabase
        .from('events')
        .update({
          recurrence_end_date: dayBefore.toISOString().split('T')[0]
        })
        .eq('id', id)

      if (error) {
        console.error('Error ending recurrence:', error)
      }
    } else {
      // Delete all instances (delete the base event)
      await supabase
        .from('event_family_members')
        .delete()
        .eq('event_id', id)

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting event:', error)
      }
    }

    setEditingEvent(null)
    setEditingInstanceDate('')
  }

  function handleEventClick(event: Event) {
    // External events open a read-only detail popup
    if (event.isExternal) {
      const rawEv = externalRawEvents.find(e => -(e.id as number) === event.id)
      const cal = rawEv ? externalCalendarConfigs.get(rawEv.external_calendar_id) : undefined
      setExternalEventDetail({
        event,
        calendarName: cal?.calendar_name ?? 'Google Calendar',
        googleEmail: cal?.google_email ?? null,
      })
      return
    }

    // If this is a virtual instance, find and edit the base event
    if (event.baseEventId) {
      const baseEvent = events.find(e => e.id === event.baseEventId)
      if (baseEvent) {
        setEditingEvent(baseEvent)
        setEditingInstanceDate(event.date) // Track the instance date
        setIsModalOpen(true)
      }
    } else {
      setEditingEvent(event)
      setEditingInstanceDate('') // Not an instance
      setIsModalOpen(true)
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingEvent(null)
    setEditingInstanceDate('')
    setNewEventDate('')
    setNewEventTime('')
  }

  function handleOpenNewEvent() {
    setEditingEvent(null)
    setNewEventDate('')
    setNewEventTime('')
    setIsModalOpen(true)
  }

  function handleTimeSlotClick(date: string, time: string) {
    setEditingEvent(null)
    setNewEventDate(date)
    setNewEventTime(time)
    setIsModalOpen(true)
  }

  async function handleEventDrop(eventId: number, newDate: string, newStartTime: string) {
    // Check if this is a virtual instance
    const expandedEvent = expandedEvents.find(e => e.id === eventId)
    if (expandedEvent?.baseEventId) {
      showToast('Cannot move individual instances of recurring or multi-day events. Please edit the original event.', 'error')
      return
    }

    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Calculate the duration to maintain it
    let newEndTime = event.end_time
    let newEndDate = event.end_date

    // If this is a multi-day event, calculate new end date based on duration
    if (event.end_date && event.end_date !== event.date) {
      const oldStart = new Date(event.date)
      const oldEnd = new Date(event.end_date)
      const durationDays = Math.floor((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24))

      const newStart = new Date(newDate)
      const calculatedEnd = new Date(newStart)
      calculatedEnd.setDate(calculatedEnd.getDate() + durationDays)
      newEndDate = calculatedEnd.toISOString().split('T')[0]
    }

    if (event.start_time && event.end_time) {
      const [oldStartHour, oldStartMin] = event.start_time.split(':').map(Number)
      const [oldEndHour, oldEndMin] = event.end_time.split(':').map(Number)
      const durationMinutes = (oldEndHour * 60 + oldEndMin) - (oldStartHour * 60 + oldStartMin)

      const [newStartHour, newStartMin] = newStartTime.split(':').map(Number)
      const endTotalMinutes = (newStartHour * 60 + newStartMin) + durationMinutes
      const endHour = Math.floor(endTotalMinutes / 60)
      const endMin = endTotalMinutes % 60
      newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
    }

    // Update the event in database
    const { error } = await supabase
      .from('events')
      .update({
        date: newDate,
        end_date: newEndDate,
        start_time: newStartTime,
        end_time: newEndTime
      })
      .eq('id', eventId)

    if (error) {
      console.error('Error updating event:', error)
    }
  }

  // Expand recurring events into individual instances
  function expandRecurringEvents(baseEvents: Event[], allFamilyMembers: FamilyMember[]): Event[] {
    const expanded: Event[] = []
    const today = new Date()
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(today.getMonth() - 6)
    const oneYearFromNow = new Date(today)
    oneYearFromNow.setFullYear(today.getFullYear() + 1)

    baseEvents.forEach((event) => {
      if (!event.is_recurring) {
        // Non-recurring events: expand multi-day events
        if (event.end_date && event.end_date !== event.date) {
          const startDate = new Date(event.date)
          const endDate = new Date(event.end_date)
          const currentDate = new Date(startDate)

          while (currentDate <= endDate) {
            expanded.push({
              ...event,
              date: currentDate.toISOString().split('T')[0],
              baseEventId: event.id // Track the base event
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
        } else {
          expanded.push(event)
        }
      } else {
        // Recurring events: generate instances
        const startDate = new Date(event.date)
        const endDate = event.recurrence_end_date
          ? new Date(event.recurrence_end_date)
          : oneYearFromNow

        const currentDate = new Date(Math.max(startDate.getTime(), sixMonthsAgo.getTime()))

        while (currentDate <= endDate && currentDate <= oneYearFromNow) {
          let shouldInclude = false

          if (event.recurrence_pattern === 'daily') {
            shouldInclude = true
          } else if (event.recurrence_pattern === 'weekly') {
            const dayOfWeek = currentDate.getDay()
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            const dayName = dayNames[dayOfWeek]

            if (event.recurrence_days) {
              const recurDays = JSON.parse(event.recurrence_days)
              shouldInclude = recurDays.includes(dayName)
            } else {
              // If no specific days, use the original event's day
              shouldInclude = dayOfWeek === startDate.getDay()
            }
          } else if (event.recurrence_pattern === 'monthly') {
            shouldInclude = currentDate.getDate() === startDate.getDate()
          } else if (event.recurrence_pattern === 'yearly') {
            shouldInclude = currentDate.getDate() === startDate.getDate() &&
                          currentDate.getMonth() === startDate.getMonth()
          }

          if (shouldInclude && currentDate >= startDate) {
            const dateStr = currentDate.toISOString().split('T')[0]

            // Check if this instance has an exception
            const exception = eventExceptions.find(
              ex => ex.base_event_id === event.id && ex.exception_date === dateStr
            )

            // Skip if deleted
            if (exception?.is_deleted) {
              // Don't add this instance
            } else {
              // Apply modifications from exception if present
              const modifiedEvent: Event = {
                ...event,
                date: dateStr,
                baseEventId: event.id,
                title: exception?.modified_title || event.title,
                start_time: exception?.modified_start_time !== undefined ? exception.modified_start_time : event.start_time,
                end_time: exception?.modified_end_time !== undefined ? exception.modified_end_time : event.end_time,
                description: exception?.modified_description !== undefined ? exception.modified_description : event.description
              }

              // Apply modified family members if specified in exception
              if (exception?.modified_family_member_ids) {
                const modifiedMemberIds = JSON.parse(exception.modified_family_member_ids)
                // Reconstruct event_family_members array with the modified member IDs
                modifiedEvent.event_family_members = modifiedMemberIds.map((memberId: number) => {
                  const member = allFamilyMembers.find(m => m.id === memberId)
                  if (member) {
                    return {
                      family_members: {
                        id: member.id,
                        name: member.name,
                        color: member.color
                      }
                    }
                  }
                  return null
                }).filter((m: any) => m !== null)
              }

              expanded.push(modifiedEvent)
            }
          }

          // Increment based on pattern
          if (event.recurrence_pattern === 'daily') {
            currentDate.setDate(currentDate.getDate() + (event.recurrence_interval || 1))
          } else if (event.recurrence_pattern === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 1)
          } else if (event.recurrence_pattern === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + (event.recurrence_interval || 1))
          } else if (event.recurrence_pattern === 'yearly') {
            currentDate.setFullYear(currentDate.getFullYear() + (event.recurrence_interval || 1))
          }
        }
      }
    })

    return expanded
  }

  const expandedEvents = expandRecurringEvents(events, familyMembers)

  // Shape external (Google) events into the same Event type for unified rendering
  const externalEvents: Event[] = externalRawEvents.map(ev => {
    const cal = externalCalendarConfigs.get(ev.external_calendar_id)
    const memberIds: number[] = cal?.family_member_ids ?? []
    const members = memberIds
      .map(id => familyMembers.find(m => m.id === id))
      .filter((m): m is FamilyMember => m !== undefined)
    return {
      id: -(ev.id as number), // Negative ID avoids collisions with local event IDs
      title: ev.title,
      date: ev.date,
      end_date: ev.end_date ?? null,
      start_time: ev.start_time ?? null,
      end_time: ev.end_time ?? null,
      description: ev.description || '',
      is_recurring: false,
      recurrence_pattern: null,
      recurrence_interval: 1,
      recurrence_end_date: null,
      recurrence_days: null,
      created_at: ev.created_at,
      event_family_members: members.map(m => ({ family_members: { id: m.id, name: m.name, color: m.color } })),
      isExternal: true,
      externalProvider: ev.provider || 'google',
    }
  })

  const filteredEvents = getFilteredEvents([...expandedEvents, ...externalEvents])

  // Compute meal plans count by date
  const mealPlansCount: Record<string, number> = mealPlans.reduce((acc, plan) => {
    acc[plan.date] = (acc[plan.date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  function handleMealIconClick(date: string) {
    setSelectedMealDate(date)
    setIsMealModalOpen(true)
  }

  function handleCloseMealModal() {
    setIsMealModalOpen(false)
    setSelectedMealDate(null)
  }

  async function handleAddWeekMealsToList(startDate: string, endDate: string) {
    try {
      // Filter meal plans for the week
      const weekMealPlans = mealPlans.filter(plan =>
        plan.date >= startDate && plan.date <= endDate
      )

      if (weekMealPlans.length === 0) {
        showToast('No meals planned for this week.', 'error')
        return
      }

      // Get unique recipe IDs
      const recipeIds = [...new Set(weekMealPlans.map(plan => plan.recipe_id))]

      // Load all recipes with their ingredients
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_ingredients (
            ingredient_id,
            amount,
            measurement,
            ingredients (
              id,
              name
            )
          )
        `)
        .in('id', recipeIds)

      if (recipesError) throw recipesError

      if (!recipes || recipes.length === 0) {
        showToast('No recipes found.', 'error')
        return
      }

      // Get current shopping list
      const { data: existingItems, error: fetchError } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', user?.id)

      if (fetchError) throw fetchError

      // Collect all ingredients from all recipes
      const itemsToUpsert: any[] = []
      let totalIngredients = 0

      recipes.forEach((recipe: any) => {
        const recipeIngredients = recipe.recipe_ingredients || []

        recipeIngredients.forEach((ri: any) => {
          if (!ri.ingredient_id || !ri.amount || !ri.measurement) return

          totalIngredients++

          // Check if this ingredient+measurement already exists
          const existing = existingItems?.find(
            (item) =>
              item.ingredient_id === ri.ingredient_id &&
              item.measurement === ri.measurement
          )

          const recipeIdStr = String(recipe.id)
          const existingCounts = (existing?.recipe_counts as Record<string, number>) || {}
          const nextCounts = {
            ...existingCounts,
            [recipeIdStr]: (existingCounts[recipeIdStr] || 0) + 1,
          }

          if (existing) {
            // Combine amounts
            itemsToUpsert.push({
              id: existing.id,
              user_id: user?.id,
              ingredient_id: ri.ingredient_id,
              amount: Number(existing.amount) + Number(ri.amount),
              measurement: ri.measurement,
              recipe_id: recipe.id,
              recipe_counts: nextCounts,
            })
          } else {
            // New item
            itemsToUpsert.push({
              user_id: user?.id,
              ingredient_id: ri.ingredient_id,
              amount: ri.amount,
              measurement: ri.measurement,
              recipe_id: recipe.id,
              recipe_counts: nextCounts,
            })
          }
        })
      })

      // Remove duplicates by combining items with same id
      const uniqueItems = itemsToUpsert.reduce((acc, item) => {
        const existingIndex = acc.findIndex((i: any) =>
          i.id && i.id === item.id ||
          (!i.id && !item.id && i.ingredient_id === item.ingredient_id && i.measurement === item.measurement)
        )

        if (existingIndex >= 0) {
          // Combine amounts and recipe_counts
          acc[existingIndex].amount = Number(acc[existingIndex].amount) + Number(item.amount)
          acc[existingIndex].recipe_counts = {
            ...acc[existingIndex].recipe_counts,
            ...item.recipe_counts
          }
        } else {
          acc.push(item)
        }

        return acc
      }, [])

      if (uniqueItems.length === 0) {
        showToast('No ingredients to add.', 'error')
        return
      }

      // Upsert items — use the table's unique constraint (user_id, ingredient_id, measurement)
      // so new items merge correctly even without an id
      const itemsWithoutId = uniqueItems.map(({ id: _id, ...rest }: any) => rest)
      const { error } = await supabase
        .from('shopping_list')
        .upsert(itemsWithoutId, { onConflict: 'user_id,ingredient_id,measurement' })

      if (error) {
        console.error('Shopping list upsert error:', JSON.stringify(error), error)
        throw error
      }

      showToast(`Added ${recipes.length} recipes (${totalIngredients} ingredients) to shopping list!`, 'success')
    } catch (error) {
      console.error('Error adding week meals to shopping list:', error)
      showToast('Failed to add meals to shopping list.', 'error')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Get gradient classes based on color theme
  function getThemeGradient() {
    switch (colorTheme) {
      case 'ocean':
        return 'bg-gradient-to-br from-blue-900/20 via-teal-900/20 to-black'
      case 'sunset':
        return 'bg-gradient-to-br from-orange-900/20 via-pink-900/20 to-black'
      case 'forest':
        return 'bg-gradient-to-br from-green-900/20 via-emerald-900/20 to-black'
      case 'lavender':
        return 'bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-black'
      case 'default':
      default:
        return 'bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black'
    }
  }

  return (
    <div className={`h-screen overflow-hidden flex flex-row bg-black ${getThemeGradient()}`}>
      <div className="flex-1 flex min-h-0 gap-4">
        {/* Left Sidebar - Navigation - Minimal */}
        <div className="w-20 flex-shrink-0 flex flex-col gap-3 overflow-y-auto py-4">
          {/* View Toggle - Vertical, Minimal */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                currentView === 'calendar'
                  ? 'bg-white/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Calendar"
            >
              <span className="text-xl">📅</span>
              <span className="text-xs font-medium">Calendar</span>
            </button>
            <button
              onClick={() => setCurrentView('recipes')}
              className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                currentView === 'recipes'
                  ? 'bg-white/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Recipes"
            >
              <span className="text-xl">📖</span>
              <span className="text-xs font-medium">Recipes</span>
            </button>
            <button
              onClick={() => setCurrentView('shopping-list')}
              className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                currentView === 'shopping-list'
                  ? 'bg-white/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Shopping List"
            >
              <span className="text-xl">🛒</span>
              <span className="text-xs font-medium">Lists</span>
            </button>
            <button
              onClick={() => setCurrentView('tasks')}
              className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                currentView === 'tasks'
                  ? 'bg-white/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Tasks"
            >
              <span className="text-xl">✅</span>
              <span className="text-xs font-medium">Tasks</span>
            </button>
            <button
              onClick={() => setCurrentView('rewards')}
              className={`px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                currentView === 'rewards'
                  ? 'bg-white/30 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Rewards"
            >
              <span className="text-xl">🏆</span>
              <span className="text-xs font-medium">Rewards</span>
            </button>
          </div>

          {/* Settings and Sign Out Buttons */}
          <div className="flex flex-col gap-2 mt-auto">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
              title="Settings"
            >
              <span className="text-xl">⚙️</span>
              <span className="text-xs font-medium">Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
              title="Sign Out"
            >
              <span className="text-xl">🚪</span>
              <span className="text-xs font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Header with Calendar Title */}
          <div className="px-6 py-4 border-b border-white/10">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">{calendarTitle}</h1>
          </div>

          {/* Main Content - takes full space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {currentView === 'calendar' ? (
              <CalendarView
                events={filteredEvents}
                onAddEventClick={handleOpenNewEvent}
                onEventClick={handleEventClick}
                onTimeSlotClick={handleTimeSlotClick}
                onEventDrop={handleEventDrop}
                familyMembers={familyMembers}
                visibleMembers={visibleMembers}
                showUnassigned={showUnassigned}
                onToggleMember={toggleMemberVisibility}
                onToggleUnassigned={setShowUnassigned}
                mealPlansCount={mealPlansCount}
                onMealIconClick={handleMealIconClick}
                onAddWeekMealsToList={handleAddWeekMealsToList}
                dateFormat={dateFormat}
                weekStartDay={weekStartDay}
                isGoogleConnected={googleConnected}
                onSyncGoogleCalendar={syncGoogleCalendar}
                isSyncingGoogle={isSyncingGoogle}
              />
            ) : currentView === 'recipes' ? (
              <div className="h-full p-6">
                <RecipesView
                  userId={user?.id || ''}
                  weekStartDay={weekStartDay}
                  onMealDayClick={handleMealIconClick}
                  mealRefreshKey={mealPlanRefreshKey}
                  onAddWeekMealsToList={handleAddWeekMealsToList}
                />
              </div>
            ) : currentView === 'shopping-list' ? (
              <div className="h-full p-6">
                <ShoppingListView userId={user?.id || ''} />
              </div>
            ) : currentView === 'tasks' ? (
              <div className="h-full p-6">
                <TasksView
                  familyMembers={familyMembers}
                  onShowToast={showToast}
                />
              </div>
            ) : (
              <div className="h-full p-6">
                <RewardsView
                  familyMembers={familyMembers}
                  onShowToast={showToast}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
        <AddEventModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          familyMembers={familyMembers}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          editingEvent={editingEvent}
          instanceDate={editingInstanceDate}
          initialDate={newEventDate}
          initialStartTime={newEventTime}
          onShowToast={showToast}
        />

        {/* Meal Plan Modal */}
        <MealPlanModal
          isOpen={isMealModalOpen}
          onClose={handleCloseMealModal}
          selectedDate={selectedMealDate}
          userId={user?.id || ''}
          onRefresh={() => { loadMealPlans(); setMealPlanRefreshKey(k => k + 1) }}
          onShowToast={showToast}
        />

        {/* External Event Detail Modal */}
        <ExternalEventDetailModal
          isOpen={externalEventDetail !== null}
          onClose={() => setExternalEventDetail(null)}
          event={externalEventDetail?.event ?? null}
          calendarName={externalEventDetail?.calendarName ?? ''}
          googleEmail={externalEventDetail?.googleEmail ?? null}
          assignedMembers={
            (externalEventDetail?.event?.event_family_members ?? [])
              .map(efm => familyMembers.find(m => m.id === efm.family_members.id))
              .filter((m): m is FamilyMember => m !== undefined)
          }
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdate={loadSettings}
          onShowToast={showToast}
          onExternalCalendarsChange={loadExternalData}
        />

        {/* Toast Notification */}
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
