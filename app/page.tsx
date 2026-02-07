'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FamilyMembers from './components/FamilyMembers'
import CalendarView from './components/CalendarView'
import AddEventModal from './components/AddEventModal'

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
}

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingInstanceDate, setEditingInstanceDate] = useState<string>('')
  const [newEventDate, setNewEventDate] = useState<string>('')
  const [newEventTime, setNewEventTime] = useState<string>('')
  const [eventExceptions, setEventExceptions] = useState<any[]>([])

  // Load events from database
  useEffect(() => {
    loadEvents()
    loadFamilyMembers()
    loadEventExceptions()

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

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(exceptionsChannel)
    }
  }, [])

  async function loadFamilyMembers() {
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, color, role')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading family members:', error)
    } else {
      setFamilyMembers(data || [])
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

  async function handleAddEvent(title: string, date: string, endDate: string, startTime: string, endTime: string, description: string, selectedMemberIds: number[], isRecurring: boolean, recurrencePattern: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[]) {
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
        recurrence_days: isRecurring && recurrenceDays.length > 0 ? JSON.stringify(recurrenceDays) : null
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
          recurrence_days: originalEvent.recurrence_days
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
      alert('Cannot move individual instances of recurring or multi-day events. Please edit the original event.')
      return
    }

    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Calculate the duration to maintain it
    let newEndTime = event.end_time
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-full mx-auto h-screen flex flex-col">
        <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">Freeby Calendar</h1>

        {/* Main Content - Sidebar Layout */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Family Members Sidebar */}
          <div className="w-64 flex-shrink-0">
            <FamilyMembers />
          </div>

          {/* Calendar View - takes remaining space */}
          <div className="flex-1 min-w-0">
            <CalendarView
              events={expandedEvents}
              onAddEventClick={handleOpenNewEvent}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
              onEventDrop={handleEventDrop}
            />
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
        />
      </div>
    </div>
  )
}
