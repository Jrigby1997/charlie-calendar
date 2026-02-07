'use client'

import React, { useState, useEffect, useRef } from 'react'

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
  baseEventId?: number
}

type CalendarViewProps = {
  events: Event[]
  onAddEventClick: () => void
  onEventClick: (event: Event) => void
  onTimeSlotClick: (date: string, time: string) => void
  onEventDrop: (eventId: number, newDate: string, newStartTime: string) => void
}

export default function CalendarView({ events, onAddEventClick, onEventClick, onTimeSlotClick, onEventDrop }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null)
  const dragOffsetY = useRef<number>(0)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const dayOfMonth = currentDate.getDate()

  // Get the start of the week (Sunday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // Helper function to format time range
  function formatTimeRange(startTime: string | null, endTime: string | null): string {
    if (!startTime) return ''
    if (!endTime) return startTime
    return `${startTime} - ${endTime}`
  }

  // Helper function to calculate event duration in minutes
  function calculateEventDuration(startTime: string | null, endTime: string | null): number {
    if (!startTime || !endTime) return 15 // Default to 15 minutes if no end time

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    const duration = endTotalMinutes - startTotalMinutes
    return Math.max(duration, 15) // Minimum 15 minutes
  }

  // Helper function to calculate event height in pixels (64px per hour)
  function calculateEventHeight(startTime: string | null, endTime: string | null): string {
    const durationMinutes = calculateEventDuration(startTime, endTime)
    const heightPx = (durationMinutes / 60) * 64 // 64px per hour
    return `${heightPx}px`
  }

  // Helper function to blend colors for multiple family members
  function getEventColor(members: { id: number; name: string; color: string }[]): string {
    if (members.length === 0) return '#9CA3AF' // Gray-400 for events with no family members
    if (members.length === 1) return members[0].color

    // Create a gradient for multiple members
    const colors = members.map(m => m.color)
    const percentage = 100 / colors.length
    const gradientStops = colors.map((color, idx) => {
      const start = idx * percentage
      const end = (idx + 1) * percentage
      return `${color} ${start}%, ${color} ${end}%`
    }).join(', ')

    return `linear-gradient(135deg, ${gradientStops})`
  }

  // Helper function to convert color to translucent glass gradient
  function getGlassyEventColor(eventColor: string): string {
    // Parse color from hex or gradient
    if (eventColor.startsWith('linear-gradient')) {
      // Extract colors from gradient
      const colorMatches = eventColor.match(/#[0-9A-Fa-f]{6}/g) || []
      if (colorMatches.length === 0) return eventColor

      // Convert hex colors to rgb with opacity
      const rgbColors = colorMatches.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return { r, g, b }
      })

      if (rgbColors.length === 1) {
        // Single color - simple gradient with opacity
        const { r, g, b } = rgbColors[0]
        return `linear-gradient(135deg, rgb(${r} ${g} ${b} / 25%) 0%, rgb(${r} ${g} ${b} / 67%) 100%)`
      } else {
        // Multiple colors - create gradient with opacity on each
        const percentage = 100 / rgbColors.length
        const stops: string[] = []
        rgbColors.forEach((rgb, idx) => {
          const start = idx * percentage
          const mid = start + percentage / 2
          const end = (idx + 1) * percentage

          if (idx === 0) {
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 25%) ${start}%`)
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 67%) ${mid}%`)
          }
          if (idx === rgbColors.length - 1) {
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 67%) ${mid}%`)
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 25%) ${end}%`)
          } else if (idx > 0) {
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 67%) ${start}%`)
            stops.push(`rgb(${rgb.r} ${rgb.g} ${rgb.b} / 67%) ${end}%`)
          }
        })
        return `linear-gradient(135deg, ${stops.join(', ')})`
      }
    } else {
      // Single hex color
      const hex = eventColor
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `linear-gradient(135deg, rgb(${r} ${g} ${b} / 25%) 0%, rgb(${r} ${g} ${b} / 67%) 100%)`
    }
  }

  // Helper function to calculate horizontal positioning for overlapping events
  function calculateEventPositions(events: Event[]): Map<number, { width: number; left: number; column: number }> {
    const positions = new Map<number, { width: number; left: number; column: number }>()

    // Convert event times to minutes for easier comparison
    const eventTimes = events.map(event => {
      if (!event.start_time) return null
      const [startHour, startMin] = event.start_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin

      let endMinutes = startMinutes + 60 // Default 1 hour
      if (event.end_time) {
        const [endHour, endMin] = event.end_time.split(':').map(Number)
        endMinutes = endHour * 60 + endMin
      }

      return { event, startMinutes, endMinutes }
    }).filter(e => e !== null)

    // Find overlapping groups
    eventTimes.forEach((current, idx) => {
      if (!current) return

      // Find all events that overlap with this one
      const overlapping = eventTimes.filter((other, otherIdx) => {
        if (!other || idx === otherIdx) return false
        // Two events overlap if one starts before the other ends
        return (current.startMinutes < other.endMinutes && current.endMinutes > other.startMinutes)
      })

      // Determine column for this event
      let column = 0
      const usedColumns = new Set<number>()

      overlapping.forEach(overlap => {
        const existingPos = positions.get(overlap.event.id)
        if (existingPos) {
          usedColumns.add(existingPos.column)
        }
      })

      // Find first available column
      while (usedColumns.has(column)) {
        column++
      }

      const totalColumns = Math.max(overlapping.length + 1, column + 1)
      const width = 95 / totalColumns // 95% to leave some margin
      const left = (column * 95) / totalColumns

      positions.set(current.event.id, { width, left, column })
    })

    // Set default position for events without times
    events.forEach(event => {
      if (!positions.has(event.id)) {
        positions.set(event.id, { width: 95, left: 0, column: 0 })
      }
    })

    return positions
  }

  // Get array of dates for current week
  function getWeekDays(): Date[] {
    const weekStart = getWeekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      return date
    })
  }

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday

  // Create array of day numbers
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i)

  // Group events by date
  const eventsByDate: Record<string, Event[]> = {}
  events.forEach(event => {
    const dateKey = event.date // Format: YYYY-MM-DD
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = []
    }
    eventsByDate[dateKey].push(event)
  })

  function previousMonth() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month - 1))
    } else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
    } else {
      // day view
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 1)
      setCurrentDate(newDate)
    }
  }

  function nextMonth() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month + 1))
    } else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
    } else {
      // day view
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
    }
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function getEventsForDay(day: number): Event[] {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return eventsByDate[dateKey] || []
  }

  function getEventsForDate(date: Date): Event[] {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return eventsByDate[dateKey] || []
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear()
  }

  const isTodayDate = (date: Date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  // Get week display text
  const weekDays = getWeekDays()
  const weekStartMonth = monthNames[weekDays[0].getMonth()]
  const weekEndMonth = monthNames[weekDays[6].getMonth()]
  const weekTitle = weekStartMonth === weekEndMonth
    ? `${weekStartMonth} ${weekDays[0].getDate()}-${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`
    : `${weekStartMonth} ${weekDays[0].getDate()} - ${weekEndMonth} ${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`

  // Get day display text
  const dayTitle = `${monthNames[month]} ${dayOfMonth}, ${year}`
  const dayOfWeekName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()]

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 h-full flex flex-col border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
          {view === 'day' ? `${dayOfWeekName}, ${dayTitle}` : view === 'week' ? weekTitle : `${monthNames[month]} ${year}`}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={onAddEventClick}
            className="px-5 py-2.5 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
          >
            <span className="text-xl">+</span> Add Event
          </button>
          <div className="flex bg-white/10 backdrop-blur-lg rounded-xl p-1 shadow-lg border border-white/20">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                view === 'day'
                  ? 'bg-white/30 text-white shadow-md scale-105 border border-white/40'
                  : 'text-white/80 hover:text-white hover:bg-white/20 border border-transparent'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                view === 'week'
                  ? 'bg-white/30 text-white shadow-md scale-105 border border-white/40'
                  : 'text-white/80 hover:text-white hover:bg-white/20 border border-transparent'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                view === 'month'
                  ? 'bg-white/30 text-white shadow-md scale-105 border border-white/40'
                  : 'text-white/80 hover:text-white hover:bg-white/20 border border-transparent'
              }`}
            >
              Month
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-5 py-2.5 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg border border-white/30 hover:scale-105"
          >
            Today
          </button>
          <button
            onClick={previousMonth}
            className="px-4 py-2.5 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-4 py-2.5 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
          >
            →
          </button>
        </div>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="flex-1 overflow-auto rounded-xl">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0 border-l-2 border-white/30 bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden shadow-xl">
            {/* Day headers */}
            <div className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 border-b-2 border-r-2 border-white/30 shadow-lg"></div>
            {weekDays.map((date, idx) => (
              <div
                key={idx}
                className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 text-center font-semibold text-white py-3 border-b-2 border-r-2 border-white/30 shadow-lg"
              >
                <div className="text-sm">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</div>
                <div className={`text-lg ${isTodayDate(date) ? 'text-yellow-300 font-bold drop-shadow-lg' : ''}`}>
                  {date.getDate()}
                </div>
              </div>
            ))}

            {/* All-day events row (events without time) - Sticky at top */}
            <div className="col-span-8 sticky top-[68px] bg-white/10 backdrop-blur-xl border-b border-white/20 z-[9] shadow-lg">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0">
                <div className="text-right pr-2 py-2 text-xs font-medium text-white/90 border-r-2 border-white/30 bg-white/10">
                  All Day
                </div>
                {weekDays.map((date, dayIdx) => {
                  const dayEvents = getEventsForDate(date)
                  const allDayEvents = dayEvents.filter(event => !event.start_time)

                  return (
                    <div key={dayIdx} className="border-r-2 border-gray-300/50 p-1.5 min-h-[40px] bg-transparent">
                      <div className="space-y-1">
                        {allDayEvents.map(event => {
                          const members = event.event_family_members.map(efm => efm.family_members)
                          const eventColor = getEventColor(members)
                          const glassyColor = getGlassyEventColor(eventColor)

                          return (
                            <div
                              key={event.id}
                              onClick={() => onEventClick(event)}
                              className="text-xs px-2 py-1.5 rounded-xl cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-white/20"
                              style={{
                                background: glassyColor,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                                color: 'white',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                              }}
                              title={`${event.title}\n${members.map(m => m.name).join(', ')}`}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time slots - 24 hours */}
            {Array.from({ length: 24 }, (_, hour) => {
              const timeLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`

              return (
                <React.Fragment key={hour}>
                  {/* Time label */}
                  <div className="text-right pr-2 py-2 text-xs font-medium text-white/80 border-r-2 border-white/30 h-16 bg-white/5">
                    {timeLabel}
                  </div>

                  {/* Day cells for this hour */}
                  {weekDays.map((date, dayIdx) => {
                    const dayEvents = getEventsForDate(date)
                    const isCurrentDay = isTodayDate(date)

                    // Calculate positions for all timed events in this day
                    const timedEvents = dayEvents.filter(e => e.start_time)
                    const eventPositions = calculateEventPositions(timedEvents)

                    // Get events for this hour
                    const hourEvents = dayEvents.filter(event => {
                      if (!event.start_time) return false
                      const [eventHour] = event.start_time.split(':').map(Number)
                      return eventHour === hour
                    })

                    // Check if current time indicator should be shown
                    const showCurrentTime = isCurrentDay &&
                      currentTime.getHours() === hour &&
                      currentTime.getMinutes() > 0
                    const currentMinuteOffset = (currentTime.getMinutes() / 60) * 100

                    return (
                      <div
                        key={`${dayIdx}-${hour}`}
                      className={`relative border-r-2 border-b border-white/30 h-16 ${
                        isCurrentDay ? 'bg-white/10' : 'bg-white/5'
                      } hover:bg-white/15 transition-all duration-150 cursor-pointer`}
                        onClick={(e) => {
                          // Only trigger if clicking empty space (not on an event)
                          if (e.target === e.currentTarget) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const offsetY = e.clientY - rect.top
                            const minutePercent = (offsetY / 64) * 60 // 64px per hour
                            const minutes = Math.round(minutePercent / 15) * 15 // Round to nearest 15 min
                            const clampedMinutes = Math.min(Math.max(minutes, 0), 45)
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                            const timeStr = `${String(hour).padStart(2, '0')}:${String(clampedMinutes).padStart(2, '0')}`
                            onTimeSlotClick(dateStr, timeStr)
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (draggedEventId !== null) {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const offsetY = e.clientY - rect.top - dragOffsetY.current

                            // Calculate minutes from the hour boundary (can be negative or > 60)
                            const minutesFromHour = (offsetY / 64) * 60

                            // Convert to total minutes from midnight
                            const totalMinutesFromMidnight = hour * 60 + minutesFromHour

                            // Round to nearest 15 minutes
                            const roundedMinutes = Math.round(totalMinutesFromMidnight / 15) * 15

                            // Convert back to hours and minutes
                            let finalHour = Math.floor(roundedMinutes / 60)
                            let finalMinutes = roundedMinutes % 60

                            // Clamp to valid 24-hour range
                            finalHour = Math.min(Math.max(finalHour, 0), 23)
                            if (finalHour === 23) {
                              finalMinutes = Math.min(finalMinutes, 45)
                            }

                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                            const timeStr = `${String(finalHour).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
                            onEventDrop(draggedEventId, dateStr, timeStr)
                            setDraggedEventId(null)
                          }
                        }}
                      >
                        {/* Events in this time slot */}
                        {hourEvents.map((event, eventIdx) => {
                          const members = event.event_family_members.map(efm => efm.family_members)
                          const eventColor = getEventColor(members)
                          const glassyColor = getGlassyEventColor(eventColor)

                          // Calculate vertical position based on minutes
                          let topOffset = 0
                          if (event.start_time) {
                            const [, minutes] = event.start_time.split(':').map(Number)
                            topOffset = (minutes / 60) * 100
                          }

                          const timeRange = formatTimeRange(event.start_time, event.end_time)
                          const eventHeight = calculateEventHeight(event.start_time, event.end_time)

                          // Get horizontal position for this event
                          const position = eventPositions.get(event.id) || { width: 95, left: 0, column: 0 }

                          return (
                            <div
                              key={event.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedEventId(event.id)
                                const rect = e.currentTarget.getBoundingClientRect()
                                dragOffsetY.current = e.clientY - rect.top
                                e.stopPropagation()
                              }}
                              onDragEnd={() => setDraggedEventId(null)}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick(event)
                              }}
                              className="absolute px-2 py-1.5 rounded-xl text-white text-xs cursor-move hover:scale-[1.08] transition-all duration-200 overflow-hidden border-2 border-white/20"
                              style={{
                                background: glassyColor,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                top: `${topOffset}%`,
                                height: eventHeight,
                                left: `${position.left}%`,
                                width: `${position.width}%`,
                                zIndex: position.column + 1
                              }}
                              title={`${event.title}${timeRange ? ` at ${timeRange}` : ''}\n${members.map(m => m.name).join(', ')}`}
                            >
                              {timeRange && (
                                <div className="text-[10px] font-semibold mb-0.5 opacity-90">{timeRange}</div>
                              )}
                              <div className="font-medium truncate flex items-center gap-1">
                                {event.baseEventId && <span className="text-[10px]" title="Recurring or multi-day event">↻</span>}
                                <span className="truncate">{event.title}</span>
                              </div>
                              {members.length > 0 && (
                                <div className="text-[10px] opacity-90 truncate">
                                  {members.map(m => m.name).join(', ')}
                                </div>
                              )}
                              {event.description && calculateEventDuration(event.start_time, event.end_time) >= 60 && (
                                <div className="text-[10px] opacity-75 mt-0.5 truncate">{event.description}</div>
                              )}
                            </div>
                          )
                        })}

                        {/* Current time indicator */}
                        {showCurrentTime && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-red-500 z-20 shadow-lg shadow-red-500/50"
                            style={{ top: `${currentMinuteOffset}%` }}
                          >
                            <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="flex-1 overflow-auto rounded-xl">
          <div className="grid grid-cols-[60px_1fr] gap-0 border-l-2 border-white/30 max-w-2xl mx-auto bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden shadow-xl">
            {/* Day header */}
            <div className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 border-b-2 border-r-2 border-white/30 shadow-lg"></div>
            <div className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 text-center font-semibold text-white py-3 border-b-2 border-r-2 border-white/30 shadow-lg">
              <div className="text-sm">{dayOfWeekName}</div>
              <div className={`text-lg ${isTodayDate(currentDate) ? 'text-yellow-300 font-bold drop-shadow-lg' : ''}`}>
                {dayOfMonth}
              </div>
            </div>

            {/* All-day events row - Sticky at top */}
            <div className="col-span-2 sticky top-[68px] bg-white/10 backdrop-blur-xl border-b border-white/20 z-[9] shadow-lg">
              <div className="grid grid-cols-[60px_1fr] gap-0">
                <div className="text-right pr-2 py-2 text-xs font-medium text-white/90 border-r-2 border-white/30 bg-white/10">
                  All Day
                </div>
                <div className="border-r-2 border-white/30 p-2 min-h-[40px] bg-transparent">
                  <div className="space-y-1">
                    {getEventsForDate(currentDate)
                      .filter(event => !event.start_time)
                      .map(event => {
                        const members = event.event_family_members.map(efm => efm.family_members)
                        const eventColor = getEventColor(members)
                        const glassyColor = getGlassyEventColor(eventColor)

                        return (
                          <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="text-sm px-3 py-2 rounded-xl cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-white/20"
                            style={{
                              background: glassyColor,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                              color: 'white',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                            }}
                            title={`${event.title}\n${members.map(m => m.name).join(', ')}`}
                          >
                            <div className="font-semibold">{event.title}</div>
                            {members.length > 0 && (
                              <div className="text-xs opacity-90 mt-1">
                                {members.map(m => m.name).join(', ')}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Time slots - 24 hours */}
            {(() => {
              // Calculate positions for all timed events in this day
              const allDayEvents = getEventsForDate(currentDate)
              const timedEvents = allDayEvents.filter(e => e.start_time)
              const eventPositions = calculateEventPositions(timedEvents)

              return Array.from({ length: 24 }, (_, hour) => {
                const timeLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
                const isCurrentDay = isTodayDate(currentDate)

              // Get events for this hour
                const hourEvents = allDayEvents.filter(event => {
              })

              // Check if current time indicator should be shown
              const showCurrentTime = isCurrentDay &&
                currentTime.getHours() === hour &&
                currentTime.getMinutes() > 0
              const currentMinuteOffset = (currentTime.getMinutes() / 60) * 100

                return (
                <React.Fragment key={hour}>
                  {/* Time label */}
                  <div className="text-right pr-2 py-2 text-xs font-medium text-white/80 border-r-2 border-white/30 h-16 bg-white/5">
                    {timeLabel}
                  </div>

                  {/* Day cell for this hour */}
                  <div
                    className={`relative border-r-2 border-b border-white/30 h-16 ${
                      isCurrentDay ? 'bg-white/10' : 'bg-white/5'
                    } hover:bg-white/15 transition-all duration-150 cursor-pointer`}
                    onClick={(e) => {
                      // Only trigger if clicking empty space (not on an event)
                      if (e.target === e.currentTarget) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const offsetY = e.clientY - rect.top
                        const minutePercent = (offsetY / 64) * 60 // 64px per hour
                        const minutes = Math.round(minutePercent / 15) * 15 // Round to nearest 15 min
                        const clampedMinutes = Math.min(Math.max(minutes, 0), 45)
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                        const timeStr = `${String(hour).padStart(2, '0')}:${String(clampedMinutes).padStart(2, '0')}`
                        onTimeSlotClick(dateStr, timeStr)
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedEventId !== null) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const offsetY = e.clientY - rect.top - dragOffsetY.current

                        // Calculate minutes from the hour boundary (can be negative or > 60)
                        const minutesFromHour = (offsetY / 64) * 60

                        // Convert to total minutes from midnight
                        const totalMinutesFromMidnight = hour * 60 + minutesFromHour

                        // Round to nearest 15 minutes
                        const roundedMinutes = Math.round(totalMinutesFromMidnight / 15) * 15

                        // Convert back to hours and minutes
                        let finalHour = Math.floor(roundedMinutes / 60)
                        let finalMinutes = roundedMinutes % 60

                        // Clamp to valid 24-hour range
                        finalHour = Math.min(Math.max(finalHour, 0), 23)
                        if (finalHour === 23) {
                          finalMinutes = Math.min(finalMinutes, 45)
                        }

                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                        const timeStr = `${String(finalHour).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`
                        onEventDrop(draggedEventId, dateStr, timeStr)
                        setDraggedEventId(null)
                      }
                    }}
                  >
                    {/* Events in this time slot */}
                    {hourEvents.map((event, eventIdx) => {
                      const members = event.event_family_members.map(efm => efm.family_members)
                      const eventColor = getEventColor(members)
                      const glassyColor = getGlassyEventColor(eventColor)

                      // Calculate vertical position based on minutes
                      let topOffset = 0
                      if (event.start_time) {
                        const [, minutes] = event.start_time.split(':').map(Number)
                        topOffset = (minutes / 60) * 100
                      }

                      const timeRange = formatTimeRange(event.start_time, event.end_time)
                      const eventHeight = calculateEventHeight(event.start_time, event.end_time)

                      // Get horizontal position for this event
                      const position = eventPositions.get(event.id) || { width: 95, left: 0, column: 0 }

                      return (
                        <div
                          key={event.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedEventId(event.id)
                            const rect = e.currentTarget.getBoundingClientRect()
                            dragOffsetY.current = e.clientY - rect.top
                            e.stopPropagation()
                          }}
                          onDragEnd={() => setDraggedEventId(null)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          className="absolute px-2 py-1.5 rounded-xl text-white text-xs cursor-move hover:scale-[1.08] transition-all duration-200 overflow-hidden border-2 border-white/20"
                          style={{
                            background: glassyColor,
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25), 0 2px 10px rgba(255, 255, 255, 0.3) inset',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                            top: `${topOffset}%`,
                            height: eventHeight,
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            zIndex: position.column + 1
                          }}
                          title={`${event.title}${timeRange ? ` at ${timeRange}` : ''}\n${members.map(m => m.name).join(', ')}`}
                        >
                          {timeRange && (
                            <div className="text-xs font-semibold mb-1 opacity-90">{timeRange}</div>
                          )}
                          <div className="font-semibold flex items-center gap-1">
                            {event.baseEventId && <span className="text-sm" title="Recurring or multi-day event">↻</span>}
                            <span className="truncate">{event.title}</span>
                          </div>
                          {members.length > 0 && (
                            <div className="text-xs opacity-90 mt-1">
                              {members.map(m => m.name).join(', ')}
                            </div>
                          )}
                          {event.description && calculateEventDuration(event.start_time, event.end_time) >= 60 && (
                            <div className="text-xs opacity-75 mt-1 truncate">{event.description}</div>
                          )}
                          {event.description && (
                            <div className="text-xs opacity-75 mt-1">{event.description}</div>
                          )}
                        </div>
                      )
                    })}

                    {/* Current time indicator */}
                    {showCurrentTime && (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                        style={{ top: `${currentMinuteOffset}%` }}
                      >
                        <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })
            })()}
          </div>
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <div className="grid grid-cols-7 gap-3">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-white/90 py-3 text-sm">
            {day}
          </div>
        ))}

        {/* Blank spaces before first day */}
        {blanks.map(i => (
          <div key={`blank-${i}`} className="bg-white/5 rounded-xl min-h-24 border border-white/20" />
        ))}

        {/* Calendar days */}
        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const isTodayDate = isToday(day)

          return (
            <div
              key={day}
              className={`border rounded-xl p-3 min-h-24 transition-all duration-200 shadow-lg hover:shadow-xl ${
                isTodayDate
                  ? 'bg-white/20 backdrop-blur-lg border-yellow-300/50 shadow-yellow-500/20'
                  : 'bg-white/10 backdrop-blur-lg border-white/20 hover:border-white/40'
              }`}
            >
              <div className={`text-sm font-bold mb-2 ${
                isTodayDate ? 'text-yellow-300 drop-shadow-lg' : 'text-white/90'
              }`}>
                {day}
              </div>
              <div className="space-y-1.5">
                {dayEvents.map(event => {
                  const members = event.event_family_members.map(efm => efm.family_members)
                  const eventColor = getEventColor(members)
                  const glassyColor = getGlassyEventColor(eventColor)
                  const timeRange = formatTimeRange(event.start_time, event.end_time)

                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="text-xs p-1.5 rounded-xl cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-white/20"
                      style={{
                        background: glassyColor,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(255, 255, 255, 0.3) inset',
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                      }}
                      title={`${event.title}${timeRange ? ` at ${timeRange}` : ''}`}
                    >
                      <div className="font-medium truncate flex items-center gap-1">
                        {event.baseEventId && <span title="Recurring or multi-day event">↻</span>}
                        {timeRange && <span>{timeRange}</span>}
                        <span className="truncate">{event.title}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
