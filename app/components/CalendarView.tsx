'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getWeekDays as getWeekDaysUtil, formatDate } from '@/lib/dateUtils'
import SectionCard from './ui/SectionCard'
import PillToggle from './ui/PillToggle'
import AvatarFilterGroup from './ui/AvatarFilterGroup'
import GlassButton from './ui/GlassButton'
import { useSwipe } from '@/lib/useSwipe'
import WeatherPopup from './WeatherPopup'

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
  isExternal?: boolean // True for events synced from Google Calendar etc.
  externalProvider?: string // 'google' | 'outlook' | 'apple'
  isPending?: boolean // True while waiting to sync back from provider
  custom_color?: string | null
  checklist?: { text: string; checked: boolean }[] | null
  notes?: string | null
}

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
  avatar_url?: string | null
}

type CalendarViewProps = {
  events: Event[]
  onAddEventClick: () => void
  onEventClick: (event: Event) => void
  onTimeSlotClick: (date: string, time: string) => void
  onEventDrop: (eventId: number, newDate: string, newStartTime: string) => void
  familyMembers: FamilyMember[]
  visibleMembers: Set<number>
  showUnassigned: boolean
  onToggleMember: (memberId: number) => void
  onToggleUnassigned: (show: boolean) => void
  mealPlansCount: Record<string, number>
  onMealIconClick: (date: string) => void
  onAddWeekMealsToList: (startDate: string, endDate: string) => void
  dateFormat?: string
  weekStartDay?: string
  isGoogleConnected?: boolean
  onSyncGoogleCalendar?: () => Promise<void>
  isSyncingGoogle?: boolean
  sectionTitle?: string
  eventColorMode?: string
  colorTheme?: string
  linkedTaskEventIds?: Set<number>
  weatherData?: { daily: { date: string; weathercode: number; tempMax: number; tempMin: number; wind: number; precipitation: number; snowfall: number }[]; hourly: { time: string; temp: number; weathercode: number; wind: number; precipitationProbability: number }[]; units: string } | null
  weatherUnits?: string
  weatherLocation?: string
  specialDays?: { id: number; title: string; date: string; emoji: string; color: string | null; is_recurring: boolean }[]
  targetDate?: string | null
  targetView?: 'day' | 'week' | 'month' | null
}

export default function CalendarView({ events, onAddEventClick, onEventClick, onTimeSlotClick, onEventDrop, familyMembers, visibleMembers, showUnassigned, onToggleMember, onToggleUnassigned, mealPlansCount, onMealIconClick, onAddWeekMealsToList, dateFormat = 'MM/DD/YYYY', weekStartDay = 'Sunday', isGoogleConnected = false, onSyncGoogleCalendar, isSyncingGoogle = false, sectionTitle, eventColorMode, colorTheme, linkedTaskEventIds, weatherData, weatherUnits = 'fahrenheit', weatherLocation = '', specialDays = [], targetDate = null, targetView = null }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [draggedEventId, setDraggedEventId] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const dragOffsetY = useRef<number>(0)

  // Weather popup state
  const [weatherPopup, setWeatherPopup] = useState<{ date: string; rect: DOMRect } | null>(null)

  function getWeatherForDate(dateStr: string) {
    return weatherData?.daily?.find(d => d.date === dateStr) ?? null
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

  function getSpecialDaysForDate(dateStr: string) {
    const results: { emoji: string; title: string }[] = []
    for (const sd of specialDays) {
      if (sd.is_recurring) {
        // Match month+day only
        const [, sdMonth, sdDay] = sd.date.split('-')
        const [, dateMonth, dateDay] = dateStr.split('-')
        if (sdMonth === dateMonth && sdDay === dateDay) {
          results.push({ emoji: sd.emoji, title: sd.title })
        }
      } else if (sd.date === dateStr) {
        results.push({ emoji: sd.emoji, title: sd.title })
      }
    }
    return results
  }

  const swipeHandlers = useSwipe({
    onSwipeLeft:  () => { if (view !== 'week' || isMobile) nextMonth() },
    onSwipeRight: () => { if (view !== 'week' || isMobile) previousMonth() },
  })

  function handleEventInteraction(event: Event) {
    onEventClick(event)
  }

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Apply external navigation targets (e.g., from Homescreen)
  useEffect(() => {
    if (targetDate) {
      const d = new Date(targetDate + 'T00:00:00')
      if (!isNaN(d.getTime())) setCurrentDate(d)
    }
    if (targetView) {
      setView(targetView)
    }
  }, [targetDate, targetView])

  // Detect mobile and auto-switch week view to day view on small screens
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && view === 'week') setView('day')
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Helper function to get avatar display for family member icons
  function getMemberAvatarDisplay(member: FamilyMember, isVisible: boolean = true) {
    if (member.avatar_url) {
      return (
        <img
          src={`/avatars/${member.avatar_url}`}
          alt={member.name}
          className={`w-full h-full object-cover ${isVisible ? '' : 'opacity-50'}`}
          onError={(e) => {
            // Fallback to initial if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const initial = document.createElement('span')
              initial.className = 'text-white text-xs font-bold'
              initial.textContent = member.name.charAt(0).toUpperCase()
              parent.appendChild(initial)
            }
          }}
        />
      )
    }
    return (
      <span className="text-white text-xs font-bold">
        {member.name.charAt(0).toUpperCase()}
      </span>
    )
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const dayOfMonth = currentDate.getDate()

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

  // Helper function to check if event is multi-day
  function isMultiDayEvent(event: Event): boolean {
    if (!event.end_date) return false
    return event.end_date > event.date
  }

  // Helper function to format multi-day event range display
  function formatMultiDayRange(event: Event): string {
    const startDate = new Date(event.date)
    const endDate = event.end_date ? new Date(event.end_date) : startDate

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const startDay = dayNames[startDate.getDay()]
    const endDay = dayNames[endDate.getDay()]

    const startMonthDate = startDate.getDate()
    const endMonthDate = endDate.getDate()

    // Format start time if available
    let startStr = `${startDay} ${startMonthDate}`
    if (event.start_time) {
      const [hour, minute] = event.start_time.split(':').map(Number)
      const period = hour < 12 ? 'AM' : 'PM'
      const displayHour = hour % 12 === 0 ? 12 : hour % 12
      startStr += ` ${displayHour}:${String(minute).padStart(2, '0')} ${period}`
    }

    // Format end time if available
    let endStr = `${endDay} ${endMonthDate}`
    if (event.end_time) {
      const [hour, minute] = event.end_time.split(':').map(Number)
      const period = hour < 12 ? 'AM' : 'PM'
      const displayHour = hour % 12 === 0 ? 12 : hour % 12
      endStr += ` ${displayHour}:${String(minute).padStart(2, '0')} ${period}`
    }

    return `${startStr} → ${endStr}`
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

  // Helper: pastel sticky-note style for events
  function getPastelEventStyle(hex: string): React.CSSProperties {
    const r = parseInt(hex.slice(1, 3), 16) || 160
    const g = parseInt(hex.slice(3, 5), 16) || 160
    const b = parseInt(hex.slice(5, 7), 16) || 180
    const bg = `rgb(${Math.round(r * 0.28 + 255 * 0.72)},${Math.round(g * 0.28 + 255 * 0.72)},${Math.round(b * 0.28 + 255 * 0.72)})`
    const border = `rgb(${Math.round(r * 0.55 + 255 * 0.45)},${Math.round(g * 0.55 + 255 * 0.45)},${Math.round(b * 0.55 + 255 * 0.45)})`
    return {
      backgroundColor: bg,
      border: `1.5px solid ${border}`,
      boxShadow: `2px 3px 0 rgba(${r},${g},${b},0.22)`,
      color: '#1e1133',
      textShadow: 'none',
      borderRadius: '5px',
    }
  }

  // Helper: pastel sticky-note style for multi-member events
  function getPastelMultiEventStyle(memberColors: string[]): React.CSSProperties {
    const toPastel = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) || 160
      const g = parseInt(hex.slice(3, 5), 16) || 160
      const b = parseInt(hex.slice(5, 7), 16) || 180
      return {
        bg: `rgb(${Math.round(r * 0.28 + 255 * 0.72)},${Math.round(g * 0.28 + 255 * 0.72)},${Math.round(b * 0.28 + 255 * 0.72)})`,
        border: `rgb(${Math.round(r * 0.55 + 255 * 0.45)},${Math.round(g * 0.55 + 255 * 0.45)},${Math.round(b * 0.55 + 255 * 0.45)})`,
      }
    }
    const pastel = memberColors.map(toPastel)
    const pct = 100 / pastel.length
    const stops = pastel.map((c, i) => `${c.bg} ${i * pct}%, ${c.bg} ${(i + 1) * pct}%`).join(', ')
    return {
      background: `linear-gradient(135deg, ${stops})`,
      border: `1.5px solid ${pastel[0].border}`,
      boxShadow: '2px 3px 0 rgba(0,0,0,0.1)',
      color: '#1e1133',
      textShadow: 'none',
      borderRadius: '5px',
    }
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

  // Get array of dates for current week (respects weekStartDay preference)
  function getWeekDays(): Date[] {
    return getWeekDaysUtil(currentDate, weekStartDay)
  }

  // Get ordered day names based on week start preference
  function getOrderedDayNames(): string[] {
    const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const startIndex = weekStartDay === 'Monday' ? 1 : weekStartDay === 'Saturday' ? 6 : 0
    return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)]
  }

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday

  // Adjust starting position based on week start day preference
  const weekStartOffset = weekStartDay === 'Monday' ? 1 : weekStartDay === 'Saturday' ? 6 : 0
  let adjustedStartDay = startingDayOfWeek - weekStartOffset
  if (adjustedStartDay < 0) adjustedStartDay += 7

  // Create array of day numbers
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: adjustedStartDay }, (_, i) => i)

  // Group events by date (simple date grouping - no duplication)
  const eventsByDate: Record<string, Event[]> = {}
  events.forEach(event => {
    const dateKey = event.date // Start date only
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

    // Get events that start on this date
    const eventsStartingOnDate = eventsByDate[dateKey] || []

    // Also get multi-day events that span this date
    const multiDayEventsThatSpanDate = events.filter(event => {
      if (!event.end_date) return false
      // Event starts before or on this date AND ends on or after this date
      return event.date < dateKey && event.end_date >= dateKey
    })

    // Combine and remove duplicates by ID
    const allEvents = [...eventsStartingOnDate, ...multiDayEventsThatSpanDate]
    const uniqueEventsMap = new Map(allEvents.map(e => [e.id, e]))
    return Array.from(uniqueEventsMap.values())
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
  const weekStartDate = formatDate(weekDays[0], dateFormat)
  const weekEndDate = formatDate(weekDays[6], dateFormat)
  const weekTitle = `${weekStartDate} - ${weekEndDate}`

  // Get day display text
  const dayTitle = formatDate(currentDate, dateFormat)
  const dayOfWeekName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()]

  return (
    <>
    <SectionCard className="h-full flex flex-col" {...swipeHandlers}>
      {/* ── Mobile Header ── */}
      <div className="md:hidden px-3 pt-3 pb-1 flex flex-col gap-2">
        {/* Row 1: ← title → */}
        <div className="flex items-center gap-1">
          <GlassButton onClick={previousMonth} size="sm" className="flex-shrink-0">
            ←
          </GlassButton>
          <div className="flex-1 text-center min-w-0">
            {sectionTitle && (
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide truncate">{sectionTitle}</p>
            )}
            <h2 className="text-base font-bold text-white drop-shadow-lg leading-tight">
              {view === 'day'
                ? `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDate.getDay()]}, ${monthNames[month].slice(0,3)} ${dayOfMonth}`
                : `${monthNames[month]} ${year}`}
            </h2>
          </div>
          <GlassButton onClick={nextMonth} size="sm" className="flex-shrink-0">
            →
          </GlassButton>
        </div>
        {/* Row 2: toggle | today | ml-auto: sync + add */}
        <div className="flex items-center gap-1.5">
          <PillToggle
            items={[
              { value: 'day',   label: 'Day' },
              { value: 'month', label: 'Month' },
            ]}
            value={view === 'week' ? 'day' : view}
            onChange={setView}
            size="sm"
          />
          <GlassButton onClick={goToToday} size="sm">
            Today
          </GlassButton>
          <div className="flex items-center gap-1 ml-auto">
            {isGoogleConnected && (
              <GlassButton onClick={async () => { if (onSyncGoogleCalendar) await onSyncGoogleCalendar() }} disabled={isSyncingGoogle} size="sm" title="Sync">
                <span className={isSyncingGoogle ? 'animate-spin' : ''}>🔄</span>
              </GlassButton>
            )}
            <GlassButton onClick={onAddEventClick} size="sm" className="font-bold">
              +
            </GlassButton>
          </div>
        </div>
        {/* Row 3: avatar filter strip — flex-wrap so it never overflows */}
        <AvatarFilterGroup
          members={familyMembers}
          visibleMembers={visibleMembers}
          onToggle={onToggleMember}
          showUnassigned={showUnassigned}
          onToggleUnassigned={onToggleUnassigned}
        />
      </div>

      {/* ── Desktop Header ── */}
      <div className="hidden md:flex flex-col px-6 pt-6 gap-3 mb-4">
        {/* Title + avatars row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {sectionTitle && (
              <p className="text-2xl font-bold text-white drop-shadow-lg">{sectionTitle}</p>
            )}
            <h2 className="text-4xl font-bold text-white drop-shadow-lg">
              {view === 'day' ? `${dayOfWeekName}, ${dayTitle}` : view === 'week' ? weekTitle : `${monthNames[month]} ${year}`}
            </h2>
          </div>
          <AvatarFilterGroup
            members={familyMembers}
            visibleMembers={visibleMembers}
            onToggle={onToggleMember}
            showUnassigned={showUnassigned}
            onToggleUnassigned={onToggleUnassigned}
          />
        </div>
        {/* Controls row: left | center (← Today →) | right spacer */}
        <div className="flex items-center">
          {/* Left: Add + Sync + view toggle */}
          <div className="flex items-center gap-3 flex-1">
            <GlassButton onClick={onAddEventClick} size="lg" className="backdrop-blur-lg shadow-lg hover:shadow-xl hover:scale-105">
              <span className="text-xl">+</span> Add Event
            </GlassButton>
            {isGoogleConnected && (
              <GlassButton onClick={async () => { if (onSyncGoogleCalendar) await onSyncGoogleCalendar() }} disabled={isSyncingGoogle} size="lg" title="Sync Google Calendar" className="backdrop-blur-lg shadow-lg hover:shadow-xl hover:scale-105">
                <span className={isSyncingGoogle ? 'animate-spin' : ''}>🔄</span>
              </GlassButton>
            )}
            <PillToggle
              items={[
                { value: 'day',   label: 'Day' },
                { value: 'week',  label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={view}
              onChange={setView}
              size="lg"
            />
          </div>
          {/* Center: ← Today → navigation */}
          <div className="flex gap-1.5">
            <GlassButton onClick={previousMonth} size="lg" className="backdrop-blur-lg shadow-lg hover:shadow-xl hover:scale-105">←</GlassButton>
            <GlassButton onClick={goToToday} size="lg" className="backdrop-blur-lg shadow-md hover:shadow-lg hover:scale-105">Today</GlassButton>
            <GlassButton onClick={nextMonth} size="lg" className="backdrop-blur-lg shadow-lg hover:shadow-xl hover:scale-105">→</GlassButton>
          </div>
          {/* Right spacer to balance */}
          <div className="flex-1" />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-2 md:px-6 pb-4 md:pb-6">
      {/* Week View */}
      {view === 'week' && (
        <div className="flex-1 overflow-auto rounded-xl">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0 border-l-2 border-white/30 bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden shadow-xl">
            {/* Day headers */}
            <div className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 border-b-2 border-r-2 border-white/30 shadow-lg"></div>
            {weekDays.map((date, idx) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
              const mealCount = mealPlansCount[dateStr] || 0
              const weekWeather = getWeatherForDate(dateStr)
              const weekSpecialDays = getSpecialDaysForDate(dateStr)

              return (
                <div
                  key={idx}
                  className="sticky top-0 bg-white/20 backdrop-blur-xl z-10 text-center font-semibold text-white py-3 border-b-2 border-r-2 border-white/30 shadow-lg relative"
                >
                  <div className="text-sm">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
                  <div className={`text-lg ${isTodayDate(date) ? 'text-yellow-300 font-bold drop-shadow-lg' : ''}`}>
                    {formatDate(date, dateFormat)}
                    {weekSpecialDays.length > 0 && (
                      <span className="ml-1 text-base" title={weekSpecialDays.map(s => s.title).join(', ')}>{weekSpecialDays[0].emoji}</span>
                    )}
                  </div>
                  {weekWeather && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setWeatherPopup(p => p?.date === dateStr ? null : { date: dateStr, rect })
                      }}
                      className="flex items-center justify-center gap-2 text-[10px] text-white/60 hover:text-white/90 transition-colors mt-0.5 mx-auto bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-2 py-0.5"
                    >
                      <span>{weatherEmoji(weekWeather.weathercode)}</span>
                      <span>{Math.round(weekWeather.tempMax)}°/{Math.round(weekWeather.tempMin)}°</span>
                      {weekWeather.wind > 0 && <span className="text-white/40">💨 {Math.round(weekWeather.wind)}</span>}
                      {weekWeather.precipitation > 0.1 && <span>💧 {weekWeather.precipitation.toFixed(1)}&quot;</span>}
                      {weekWeather.snowfall > 0.1 && <span>❄️ {weekWeather.snowfall.toFixed(1)}&quot;</span>}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onMealIconClick(dateStr)
                    }}
                    className={`absolute top-1 right-1 text-white text-xs px-1.5 py-0.5 rounded-full font-bold transition-all hover:scale-110 shadow-lg ${
                      mealCount > 0
                        ? 'bg-orange-500/80 hover:bg-orange-500'
                        : 'bg-white/20 hover:bg-white/30 border border-white/40'
                    }`}
                    title={mealCount > 0 ? `${mealCount} meal${mealCount > 1 ? 's' : ''} planned - click to edit` : 'Plan meals for this day'}
                  >
                    {mealCount > 0 ? `🍽️${mealCount}` : '🍽️'}
                  </button>
                </div>
              )
            })}

            {/* All-day events row (events without time) - Sticky at top */}
            <div className="col-span-8 sticky top-[68px] bg-white/10 backdrop-blur-xl border-b border-white/20 z-[9] shadow-lg">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-0">
                <div className="text-right pr-2 py-2 text-xs font-medium text-white/90 border-r-2 border-white/30 bg-white/10">
                  All Day
                </div>
                {weekDays.map((date, dayIdx) => {
                  const dayEvents = getEventsForDate(date)
                  const allDayEvents = dayEvents.filter(event => !event.start_time || isMultiDayEvent(event))

                  return (
                    <div key={dayIdx} className="border-r-2 border-gray-300/50 p-1.5 min-h-[40px] min-w-0 overflow-hidden bg-transparent">
                      <div className="space-y-1 w-full">
                        {allDayEvents.map(event => {
                          const members = event.event_family_members.map(efm => efm.family_members)
                          const eventColor = eventColorMode === 'custom' ? (event.custom_color || '#9CA3AF') : getEventColor(members)
                          const glassyColor = getGlassyEventColor(eventColor)
                          const pastelStyle = colorTheme === 'pastel' ? (eventColorMode !== 'custom' && members.length > 1 ? getPastelMultiEventStyle(members.map(m => m.color)) : getPastelEventStyle(eventColor)) : null
                          const multiDayRange = isMultiDayEvent(event) ? formatMultiDayRange(event) : null

                          return (
                            <div
                              key={event.id}
                              onClick={() => handleEventInteraction(event)}
                              className={`text-xs px-2 py-1.5 cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden ${colorTheme === 'pastel' ? 'rounded border' : 'rounded-xl border-2 border-white/20'}`}
                              style={pastelStyle ?? {
                                background: glassyColor,
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                                color: 'white',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                              }}
                              title={`${event.title}${multiDayRange ? `\n${multiDayRange}` : ''}\n${members.map(m => m.name).join(', ')}${event.isExternal ? (event.isPending ? '\n(Syncing…)' : '\n(Google Calendar)') : ''}`}
                            >
                              {multiDayRange && (
                                <div className="text-[9px] opacity-90 truncate">{multiDayRange}</div>
                              )}
                              <div className="font-medium flex items-center gap-0.5 min-w-0">
                                {event.isExternal && <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[7px] font-bold flex-shrink-0" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}} title="Google Calendar">G</span>}
                                {linkedTaskEventIds?.has(event.id) && <span className="text-[9px] flex-shrink-0" title="Has linked task">📋</span>}
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

                    // Calculate positions for all timed events in this day (single-day only)
                    const timedEvents = dayEvents.filter(e => e.start_time && !isMultiDayEvent(e))
                    const eventPositions = calculateEventPositions(timedEvents)

                    // Get events for this hour
                    const hourEvents = dayEvents.filter(event => {
                      if (!event.start_time || isMultiDayEvent(event)) return false
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
                          const eventColor = eventColorMode === 'custom' ? (event.custom_color || '#9CA3AF') : getEventColor(members)
                          const glassyColor = getGlassyEventColor(eventColor)
                          const pastelStyle = colorTheme === 'pastel' ? (eventColorMode !== 'custom' && members.length > 1 ? getPastelMultiEventStyle(members.map(m => m.color)) : getPastelEventStyle(eventColor)) : null

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
                              draggable={!event.isExternal}
                              onDragStart={event.isExternal ? undefined : (e) => {
                                setDraggedEventId(event.id)
                                const rect = e.currentTarget.getBoundingClientRect()
                                dragOffsetY.current = e.clientY - rect.top
                                e.stopPropagation()
                              }}
                              onDragEnd={() => setDraggedEventId(null)}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEventInteraction(event)
                              }}
                              className={`absolute px-2 py-1.5 text-xs ${event.isExternal ? 'cursor-pointer' : 'cursor-move'} hover:scale-[1.08] transition-all duration-200 overflow-hidden ${event.isPending ? 'opacity-60' : ''} ${colorTheme === 'pastel' ? 'rounded border' : 'rounded-xl text-white border-2 border-white/20'}`}
                              style={{
                                ...(pastelStyle ?? {
                                  background: glassyColor,
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                  color: 'white',
                                }),
                                top: `${topOffset}%`,
                                height: eventHeight,
                                left: `${position.left}%`,
                                width: `${position.width}%`,
                                zIndex: position.column + 1
                              }}
                              title={`${event.title}${timeRange ? ` at ${timeRange}` : ''}\n${members.map(m => m.name).join(', ')}${event.isExternal ? (event.isPending ? '\n(Syncing…)' : '\n(Google Calendar)') : ''}`}
                            >
                              <div className="font-medium flex items-center gap-1 min-w-0">
                                {event.baseEventId && <span className="text-[10px] flex-shrink-0" title="Recurring or multi-day event">↻</span>}
                                {event.isExternal && (event.isPending
                                  ? <span className="text-[10px] flex-shrink-0" title="Syncing with Google Calendar">⏳</span>
                                  : <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[7px] font-bold flex-shrink-0" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}} title="Google Calendar">G</span>
                                )}
                                {linkedTaskEventIds?.has(event.id) && <span className="text-[10px] flex-shrink-0" title="Has linked task">📋</span>}
                                <span className="truncate">{event.title}</span>
                              </div>
                              {timeRange && (
                                <div className="text-[10px] opacity-75 mt-0.5">{timeRange}</div>
                              )}
                              {members.length > 0 && (
                                <div className="text-[10px] opacity-90 truncate">
                                  {members.map(m => m.name).join(', ')}
                                </div>
                              )}
                              {event.description && calculateEventDuration(event.start_time, event.end_time) >= 60 && (
                                <div className="text-[10px] opacity-75 mt-0.5 truncate">{event.description}</div>
                              )}
                              {event.checklist && event.checklist.length > 0 && calculateEventDuration(event.start_time, event.end_time) >= 30 && (
                                <div className="text-[10px] opacity-75 mt-0.5">{event.checklist.filter(c => c.checked).length}/{event.checklist.length} ✓</div>
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
              {(() => {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                const mealCount = mealPlansCount[dateStr] ?? 0
                const dayWeather = getWeatherForDate(dateStr)
                const daySpecialDaysList = getSpecialDaysForDate(dateStr)
                return (
                  <>
                    <div className="relative flex items-center justify-center px-2">
                      <div className="text-center">
                        <div className="text-sm">{dayOfWeekName}</div>
                        <div className={`text-lg ${isTodayDate(currentDate) ? 'text-yellow-300 font-bold drop-shadow-lg' : ''}`}>
                          {dayOfMonth}
                          {daySpecialDaysList.length > 0 && (
                            <span className="ml-1 text-base" title={daySpecialDaysList.map(s => s.title).join(', ')}>{daySpecialDaysList[0].emoji}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onMealIconClick(dateStr)}
                        className={`absolute right-2 px-2 py-1 rounded-lg text-lg transition-all duration-200 hover:scale-110 ${
                          mealCount > 0
                            ? 'bg-orange-500/80 hover:bg-orange-500 border border-orange-400/60'
                            : 'bg-white/20 hover:bg-white/30 border border-white/40'
                        }`}
                        title={mealCount > 0 ? `${mealCount} meals assigned - click to modify` : 'Click to add meals'}
                      >
                        🍽️{mealCount > 0 ? mealCount : ''}
                      </button>
                    </div>
                    {dayWeather && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setWeatherPopup(p => p?.date === dateStr ? null : { date: dateStr, rect })
                        }}
                        className="flex items-center justify-center gap-2.5 text-[11px] text-white/60 hover:text-white/90 transition-colors mt-1 mx-auto bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-3 py-0.5"
                        title="Click for hourly forecast"
                      >
                        <span>{weatherEmoji(dayWeather.weathercode)}</span>
                        <span>{Math.round(dayWeather.tempMax)}°/{Math.round(dayWeather.tempMin)}°</span>
                        {dayWeather.wind > 0 && <span className="text-white/40">💨 {Math.round(dayWeather.wind)}</span>}
                        {dayWeather.precipitation > 0.1 && <span>💧 {dayWeather.precipitation.toFixed(1)}&quot;</span>}
                        {dayWeather.snowfall > 0.1 && <span>❄️ {dayWeather.snowfall.toFixed(1)}&quot;</span>}
                      </button>
                    )}
                  </>
                )
              })()}
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
                      .filter(event => !event.start_time || isMultiDayEvent(event))
                      .map(event => {
                        const members = event.event_family_members.map(efm => efm.family_members)
                        const eventColor = eventColorMode === 'custom' ? (event.custom_color || '#9CA3AF') : getEventColor(members)
                        const glassyColor = getGlassyEventColor(eventColor)
                        const pastelStyle = colorTheme === 'pastel' ? (eventColorMode !== 'custom' && members.length > 1 ? getPastelMultiEventStyle(members.map(m => m.color)) : getPastelEventStyle(eventColor)) : null
                        const multiDayRange = isMultiDayEvent(event) ? formatMultiDayRange(event) : null

                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEventInteraction(event)}
                            className={`text-sm px-3 py-2 cursor-pointer hover:scale-105 transition-all duration-200 ${colorTheme === 'pastel' ? 'rounded border' : 'rounded-xl border-2 border-white/20'}`}
                            style={pastelStyle ?? {
                              background: glassyColor,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(255, 255, 255, 0.3) inset',
                              color: 'white',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                            }}
                            title={`${event.title}${multiDayRange ? `\n${multiDayRange}` : ''}\n${members.map(m => m.name).join(', ')}${event.isExternal ? (event.isPending ? '\n(Syncing…)' : '\n(Google Calendar)') : ''}`}
                          >
                            {multiDayRange && (
                              <div className="text-[10px] opacity-90 mb-1">{multiDayRange}</div>
                            )}
                            <div className="font-semibold flex items-center gap-0.5 min-w-0">
                              {event.isExternal && (event.isPending
                                ? <span className="text-[10px] flex-shrink-0" title="Syncing with Google Calendar">⏳</span>
                                : <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[7px] font-bold flex-shrink-0" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}} title="Google Calendar">G</span>
                              )}
                              {linkedTaskEventIds?.has(event.id) && <span className="text-[10px] flex-shrink-0" title="Has linked task">📋</span>}
                              <span className="truncate">{event.title}</span>
                            </div>
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
              const timedEvents = allDayEvents.filter(e => e.start_time && !isMultiDayEvent(e))
              const eventPositions = calculateEventPositions(timedEvents)

              return Array.from({ length: 24 }, (_, hour) => {
                const timeLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
                const isCurrentDay = isTodayDate(currentDate)

              // Get events for this hour
                const hourEvents = allDayEvents.filter(event => {
                  if (!event.start_time || isMultiDayEvent(event)) return false
                  const [eventHour] = event.start_time.split(':').map(Number)
                  return eventHour === hour
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
                      const eventColor = eventColorMode === 'custom' ? (event.custom_color || '#9CA3AF') : getEventColor(members)
                      const glassyColor = getGlassyEventColor(eventColor)
                      const pastelStyle = colorTheme === 'pastel' ? (eventColorMode !== 'custom' && members.length > 1 ? getPastelMultiEventStyle(members.map(m => m.color)) : getPastelEventStyle(eventColor)) : null

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
                          draggable={!event.isExternal}
                          onDragStart={event.isExternal ? undefined : (e) => {
                            setDraggedEventId(event.id)
                            const rect = e.currentTarget.getBoundingClientRect()
                            dragOffsetY.current = e.clientY - rect.top
                            e.stopPropagation()
                          }}
                          onDragEnd={() => setDraggedEventId(null)}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventInteraction(event)
                          }}
                          className={`absolute px-2 py-1.5 text-xs ${event.isExternal ? 'cursor-default' : 'cursor-move'} hover:scale-[1.08] transition-all duration-200 overflow-hidden ${event.isPending ? 'opacity-60' : ''} ${colorTheme === 'pastel' ? 'rounded border' : 'rounded-xl text-white border-2 border-white/20'}`}
                          style={{
                            ...(pastelStyle ?? {
                              background: glassyColor,
                              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25), 0 2px 10px rgba(255, 255, 255, 0.3) inset',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              color: 'white',
                            }),
                            top: `${topOffset}%`,
                            height: eventHeight,
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            zIndex: position.column + 1
                          }}
                          title={`${event.title}${timeRange ? ` at ${timeRange}` : ''}\n${members.map(m => m.name).join(', ')}${event.isExternal ? (event.isPending ? '\n(Syncing…)' : '\n(Google Calendar)') : ''}`}
                        >
                          <div className="font-semibold flex items-center gap-1 min-w-0">
                            {event.baseEventId && <span className="text-sm flex-shrink-0" title="Recurring or multi-day event">↻</span>}
                            {event.isExternal && (event.isPending
                              ? <span className="text-[10px] flex-shrink-0" title="Syncing with Google Calendar">⏳</span>
                              : <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[7px] font-bold flex-shrink-0" style={{background:'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)',color:'white'}} title="Google Calendar">G</span>
                            )}
                            {linkedTaskEventIds?.has(event.id) && <span className="text-xs flex-shrink-0" title="Has linked task">📋</span>}
                            <span className="truncate">{event.title}</span>
                          </div>
                          {timeRange && (
                            <div className="text-xs opacity-75 mt-0.5">{timeRange}</div>
                          )}
                          {members.length > 0 && (
                            <div className="text-xs opacity-90 mt-1">
                              {members.map(m => m.name).join(', ')}
                            </div>
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
        <div className="grid grid-cols-7 gap-0.5 md:gap-3 flex-1 min-h-0 overflow-y-auto content-start">
        {/* Day headers */}
        {getOrderedDayNames().map(day => (
          <div key={day} className="text-center font-semibold text-white/90 py-1.5 md:py-3 text-[10px] md:text-sm">
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.slice(0, 1)}</span>
          </div>
        ))}

        {/* Blank spaces before first day */}
        {blanks.map(i => (
          <div key={`blank-${i}`} className="bg-white/5 rounded md:rounded-xl min-h-10 md:min-h-24 border border-white/20" />
        ))}

        {/* Calendar days */}
        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const isTodayDate = isToday(day)
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const mealCount = mealPlansCount[dateStr] || 0
          const weatherDay = getWeatherForDate(dateStr)
          const daySpecialDays = getSpecialDaysForDate(dateStr)
          const hasSpecialDayEvent = dayEvents.some(e => (e as any).is_special_day)

          return (
            <div
              key={day}
              onClick={() => { setCurrentDate(new Date(year, month, day)); setView('day') }}
              className={`border rounded md:rounded-xl p-1 md:p-3 min-h-10 md:min-h-24 transition-all duration-200 shadow-lg hover:shadow-xl relative cursor-pointer ${
                isTodayDate
                  ? 'bg-white/20 backdrop-blur-lg border-yellow-300/50 shadow-yellow-500/20'
                  : 'bg-white/10 backdrop-blur-lg border-white/20 hover:border-white/40'
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5 md:mb-2">
                {/* Date number + special day */}
                <div className={`text-[10px] md:text-sm font-bold shrink-0 ${
                  isTodayDate ? 'text-yellow-300 drop-shadow-lg' : 'text-white/90'
                }`}>
                  {day}
                  {(daySpecialDays.length > 0 || hasSpecialDayEvent) && (
                    <span className="ml-0.5 text-[10px]" title={daySpecialDays.map(s => s.title).join(', ')}>
                      {daySpecialDays[0]?.emoji ?? '⭐'}
                    </span>
                  )}
                </div>
                {/* Weather — desktop only, centered in middle */}
                {weatherDay && (
                  <div className="flex-1 hidden md:flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setWeatherPopup(p => p?.date === dateStr ? null : { date: dateStr, rect })
                      }}
                      className="inline-flex items-center gap-1.5 text-[9px] text-white/60 hover:text-white/90 transition-colors bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 rounded-full px-1.5 py-0.5"
                      title="Click for hourly forecast"
                    >
                      <span>{weatherEmoji(weatherDay.weathercode)}</span>
                      <span>{Math.round(weatherDay.tempMax)}°/{Math.round(weatherDay.tempMin)}°</span>
                      {weatherDay.wind > 0 && <span className="text-white/40">💨 {Math.round(weatherDay.wind)}</span>}
                      {weatherDay.precipitation > 0.1 && <span>💧 {weatherDay.precipitation.toFixed(1)}&quot;</span>}
                      {weatherDay.snowfall > 0.1 && <span>❄️ {weatherDay.snowfall.toFixed(1)}&quot;</span>}
                    </button>
                  </div>
                )}
                {!weatherDay && <div className="flex-1 hidden md:block" />}
                {/* Meal icon — only show on larger screens where there's room */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMealIconClick(dateStr)
                  }}
                  className={`hidden md:inline-flex text-white text-xs px-1.5 py-0.5 rounded-full font-bold transition-all hover:scale-110 shadow-lg shrink-0 ${
                    mealCount > 0
                      ? 'bg-orange-500/80 hover:bg-orange-500'
                      : 'bg-white/20 hover:bg-white/30 border border-white/40'
                  }`}
                  title={mealCount > 0 ? `${mealCount} meal${mealCount > 1 ? 's' : ''} planned - click to edit` : 'Plan meals for this day'}
                >
                  {mealCount > 0 ? `🍽️${mealCount}` : '🍽️'}
                </button>
              </div>
              <div className="space-y-0.5 md:space-y-1.5">
                {dayEvents.map(event => {
                  const members = event.event_family_members.map(efm => efm.family_members)
                  const eventColor = eventColorMode === 'custom' ? (event.custom_color || '#9CA3AF') : getEventColor(members)
                  const glassyColor = getGlassyEventColor(eventColor)
                  const pastelStyle = colorTheme === 'pastel' ? (eventColorMode !== 'custom' && members.length > 1 ? getPastelMultiEventStyle(members.map(m => m.color)) : getPastelEventStyle(eventColor)) : null
                  const timeRange = formatTimeRange(event.start_time, event.end_time)
                  const multiDayRange = isMultiDayEvent(event) ? formatMultiDayRange(event) : null

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventInteraction(event)}
                      className={`text-[9px] md:text-xs p-0.5 md:p-1.5 cursor-pointer hover:scale-105 transition-all duration-200 ${colorTheme === 'pastel' ? 'rounded border' : 'rounded md:rounded-xl border md:border-2 border-white/20'}`}
                      style={pastelStyle ?? {
                        background: glassyColor,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(255, 255, 255, 0.3) inset',
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                      }}
                      title={`${event.title}${multiDayRange ? `\n${multiDayRange}` : timeRange ? ` at ${timeRange}` : ''}${event.isExternal ? (event.isPending ? '\n(Syncing…)' : '\n(Google Calendar)') : ''}`}
                    >
                      {/* On mobile just show a color dot indicator — full title on md+ */}
                      <div className="font-medium flex items-center gap-0.5 min-w-0 overflow-hidden">
                        <span className="truncate hidden md:inline">{event.title}</span>
                        {/* Mobile: colored dot with truncated title */}
                        <span className="truncate md:hidden leading-tight">{event.title}</span>
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
    </SectionCard>

    {/* Weather popup */}
    {weatherPopup && weatherData && (
      <WeatherPopup
        date={weatherPopup.date}
        hourly={weatherData.hourly}
        units={weatherUnits}
        anchorRect={weatherPopup.rect}
        onClose={() => setWeatherPopup(null)}
        location={weatherLocation}
      />
    )}
    </>
  )
}
