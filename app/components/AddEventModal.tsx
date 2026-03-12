'use client'

import { useState, useEffect } from 'react'

// ── Linked-task helpers (mirrors AddTaskModal) ─────────────────────────────

type CurrencyReward = {
  currency_type: 'stars' | 'muscles' | 'heart' | 'game_points' | 'trophy'
  amount: number
  enabled: boolean
}

const CURRENCY_META: Record<string, { icon: string; label: string }> = {
  stars:       { icon: '⭐', label: 'Stars'       },
  muscles:     { icon: '💪', label: 'Muscles'     },
  heart:       { icon: '❤️',  label: 'Hearts'      },
  game_points: { icon: '🎮', label: 'Game Points' },
  trophy:      { icon: '🏆', label: 'Trophies'    },
}

const DEFAULT_LINKED_REWARDS: CurrencyReward[] = [
  { currency_type: 'stars',       amount: 1, enabled: true  },
  { currency_type: 'muscles',     amount: 1, enabled: false },
  { currency_type: 'heart',       amount: 1, enabled: false },
  { currency_type: 'game_points', amount: 1, enabled: false },
  { currency_type: 'trophy',      amount: 1, enabled: false },
]

const PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: '#9CA3AF', label: 'Gray'   },
  { hex: '#EF4444', label: 'Red'    },
  { hex: '#F97316', label: 'Orange' },
  { hex: '#EAB308', label: 'Yellow' },
  { hex: '#22C55E', label: 'Green'  },
  { hex: '#14B8A6', label: 'Teal'   },
  { hex: '#3B82F6', label: 'Blue'   },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink'   },
]

type FamilyMember = {
  id: number
  name: string
  color: string
  role: string | null
}

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
  event_family_members: {
    family_members: {
      id: number
      name: string
      color: string
    }
  }[]
  baseEventId?: number
  custom_color?: string | null
}

type AddEventModalProps = {
  isOpen: boolean
  onClose: () => void
  familyMembers: FamilyMember[]
  onAddEvent: (title: string, date: string, endDate: string, startTime: string, endTime: string, description: string, memberIds: number[], isRecurring: boolean, recurrencePattern: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[], customColor?: string, createLinkedTask?: boolean, linkedTaskRewards?: { currency_type: string; amount: number }[]) => void
  onUpdateEvent?: (id: number, title: string, date: string, endDate: string, startTime: string, endTime: string, description: string, memberIds: number[], isRecurring: boolean, recurrencePattern: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[], updateScope?: 'single' | 'all' | 'future', instanceDate?: string, customColor?: string) => void
  onDeleteEvent?: (id: number, deleteScope?: 'single' | 'all' | 'future', instanceDate?: string) => void
  editingEvent?: Event | null
  instanceDate?: string // The specific date of the instance being edited (for recurring events)
  initialDate?: string
  initialStartTime?: string
  onShowToast?: (message: string, tone: 'success' | 'error') => void
  eventColorMode?: string
}

export default function AddEventModal({ isOpen, onClose, familyMembers, onAddEvent, onUpdateEvent, onDeleteEvent, editingEvent, instanceDate, initialDate, initialStartTime, onShowToast, eventColorMode }: AddEventModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([])
  const [showUpdateOptions, setShowUpdateOptions] = useState(false)
  const [showDeleteOptions, setShowDeleteOptions] = useState(false)
  const [customColor, setCustomColor] = useState('#9CA3AF')

  // Linked-task state
  const [createLinkedTask, setCreateLinkedTask] = useState(false)
  const [linkedTaskRewards, setLinkedTaskRewards] = useState<CurrencyReward[]>(DEFAULT_LINKED_REWARDS)

  // Generate time options in 15-minute increments
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourStr = String(hour).padStart(2, '0')
        const minuteStr = String(minute).padStart(2, '0')
        const timeValue = `${hourStr}:${minuteStr}`
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        const period = hour < 12 ? 'AM' : 'PM'
        const displayTime = `${displayHour}:${minuteStr} ${period}`
        options.push({ value: timeValue, label: displayTime })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Populate form when editing or opening with initial values
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title)
      setDate(editingEvent.date)
      setEndDate(editingEvent.end_date || '')
      setStartTime(editingEvent.start_time || '')
      setEndTime(editingEvent.end_time || '')
      setDescription(editingEvent.description || '')
      setSelectedMemberIds(editingEvent.event_family_members.map(efm => efm.family_members.id))
      setIsRecurring(editingEvent.is_recurring || false)
      setRecurrencePattern(editingEvent.recurrence_pattern || 'weekly')
      setRecurrenceInterval(editingEvent.recurrence_interval || 1)
      setRecurrenceEndDate(editingEvent.recurrence_end_date || '')
      setRecurrenceDays(editingEvent.recurrence_days ? JSON.parse(editingEvent.recurrence_days) : [])
      setCustomColor(editingEvent.custom_color || '#9CA3AF')
      // Linked task not shown when editing
      setCreateLinkedTask(false)
      setLinkedTaskRewards(DEFAULT_LINKED_REWARDS)
    } else if (isOpen && !editingEvent) {
      // Only clear form when opening modal without an event to edit
      setTitle('')
      setDate(initialDate || '')
      setEndDate(initialDate || '') // Default end date to same as start date
      setStartTime(initialStartTime || '')
      // Auto-calculate end time if start time is provided
      if (initialStartTime) {
        const [hours, minutes] = initialStartTime.split(':').map(Number)
        const startDate = new Date()
        startDate.setHours(hours, minutes, 0)
        startDate.setMinutes(startDate.getMinutes() + 60)
        const endHours = String(startDate.getHours()).padStart(2, '0')
        const endMinutes = String(startDate.getMinutes()).padStart(2, '0')
        setEndTime(`${endHours}:${endMinutes}`)
      } else {
        setEndTime('')
      }
      setDescription('')
      setSelectedMemberIds([])
      setIsRecurring(false)
      setRecurrencePattern('weekly')
      setRecurrenceInterval(1)
      setRecurrenceEndDate('')
      setRecurrenceDays([])
      setCustomColor('#9CA3AF')
      setCreateLinkedTask(false)
      setLinkedTaskRewards(DEFAULT_LINKED_REWARDS)
    }
  }, [editingEvent, initialDate, initialStartTime, isOpen])

  // Auto-calculate end time (30 minutes after start time)
  function handleStartTimeChange(newStartTime: string) {
    setStartTime(newStartTime)
    if (newStartTime && !endTime) {
      // Parse the time and add 30 minutes
      const [hours, minutes] = newStartTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0)
      startDate.setMinutes(startDate.getMinutes() + 60)
      const endHours = String(startDate.getHours()).padStart(2, '0')
      const endMinutes = String(startDate.getMinutes()).padStart(2, '0')
      setEndTime(`${endHours}:${endMinutes}`)
    }
  }

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation: end date before start date
    if (endDate && endDate < date) {
      onShowToast?.('End date cannot be before start date', 'error')
      return
    }

    // Validation: end time before start time (on same day)
    if (startTime && endTime && !endDate) {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      if (endMinutes <= startMinutes) {
        onShowToast?.('End time must be after start time', 'error')
        return
      }
    }

    if (editingEvent && onUpdateEvent) {
      // If editing a recurring event instance, show options
      if (editingEvent.is_recurring && instanceDate) {
        setShowUpdateOptions(true)
      } else {
        onUpdateEvent(editingEvent.id, title, date, endDate, startTime, endTime, description, selectedMemberIds, isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, recurrenceDays, undefined, undefined, customColor)
        onClose()
      }
    } else {
      onAddEvent(title, date, endDate, startTime, endTime, description, selectedMemberIds, isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, recurrenceDays, customColor, createLinkedTask, linkedTaskRewards.filter(r => r.enabled).map(({ currency_type, amount }) => ({ currency_type, amount })))
      onClose()
    }
  }

  function handleUpdateWithScope(scope: 'single' | 'all' | 'future') {
    if (editingEvent && onUpdateEvent) {
      onUpdateEvent(editingEvent.id, title, date, endDate, startTime, endTime, description, selectedMemberIds, isRecurring, recurrencePattern, recurrenceInterval, recurrenceEndDate, recurrenceDays, scope, instanceDate, customColor)
    }
    setShowUpdateOptions(false)
    onClose()
  }

  function handleDelete() {
    if (editingEvent && onDeleteEvent) {
      // If this is a recurring event, show options
      if (editingEvent.is_recurring) {
        setShowDeleteOptions(true)
      } else if (confirm('Are you sure you want to delete this event?')) {
        onDeleteEvent(editingEvent.id)
        onClose()
      }
    }
  }

  function handleDeleteWithScope(scope: 'single' | 'all' | 'future') {
    if (editingEvent && onDeleteEvent) {
      onDeleteEvent(editingEvent.id, scope, instanceDate)
    }
    setShowDeleteOptions(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <div className="sticky top-0 bg-white/10 backdrop-blur-2xl border-b border-white/20 px-6 py-4 flex justify-between items-center rounded-t-3xl">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold transition-colors hover:scale-110 transition-transform duration-200"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="Birthday party, Doctor appointment, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Family Members
            </label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    if (selectedMemberIds.includes(member.id)) {
                      setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id))
                    } else {
                      setSelectedMemberIds([...selectedMemberIds, member.id])
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    selectedMemberIds.includes(member.id)
                      ? 'text-white shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30 backdrop-blur-md'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 hover:scale-105'
                  }`}
                  style={
                    selectedMemberIds.includes(member.id)
                      ? { backgroundColor: member.color }
                      : {}
                  }
                >
                  {member.name}
                </button>
              ))}
              {familyMembers.length === 0 && (
                <p className="text-white/60 text-sm">No family members yet</p>
              )}
            </div>
          </div>

          {/* Custom Event Color */}
          {eventColorMode === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Event Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCustomColor(hex)}
                    title={label}
                    className={`w-8 h-8 rounded-full transition-all duration-150 hover:scale-110 ${
                      customColor === hex
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110 shadow-lg'
                        : 'ring-1 ring-white/20 hover:ring-white/60'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Start Date and Time - Grouped together */}
          <div className="border border-white/20 rounded-xl p-4 bg-white/5">
            <h3 className="text-sm font-semibold text-white/90 mb-4">Starts</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    // Auto-update endDate to same as start date if endDate is earlier
                    if (!endDate || e.target.value > endDate) {
                      setEndDate(e.target.value)
                    }
                  }}
                  required
                  className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Time (optional)
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                >
                  <option value="" className="bg-gray-800">Select time</option>
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* End Date and Time - Grouped together */}
          <div className="border border-white/20 rounded-xl p-4 bg-white/5">
            <h3 className="text-sm font-semibold text-white/90 mb-4">Ends</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={date}
                  required
                  className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1">
                  Time (optional)
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                >
                  <option value="" className="bg-gray-800">Select time</option>
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
              placeholder="Additional details..."
            />
          </div>

          {/* Also add as a task — only shown when creating a new event */}
          {!editingEvent && (
            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="createLinkedTask"
                  checked={createLinkedTask}
                  onChange={(e) => setCreateLinkedTask(e.target.checked)}
                  disabled={selectedMemberIds.length === 0}
                  className="w-4 h-4 text-white border-white/30 rounded focus:ring-white/50 bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                />
                <label htmlFor="createLinkedTask" className={`ml-2 text-sm font-medium ${selectedMemberIds.length === 0 ? 'text-white/40' : 'text-white/90'}`}>
                  📋 Also add as a task
                </label>
                {selectedMemberIds.length === 0 && (
                  <span className="ml-2 text-xs text-white/40">(assign a member first)</span>
                )}
              </div>

              {createLinkedTask && (
                <div className="pl-6 border-l-2 border-white/30 space-y-2">
                  <p className="text-xs text-white/50 mb-3">
                    This event will appear in both the Calendar and the Tasks view on {date || 'the event date'}. Choose what rewards to award on completion:
                  </p>
                  {linkedTaskRewards.map((reward) => {
                    const meta = CURRENCY_META[reward.currency_type]
                    return (
                      <div
                        key={reward.currency_type}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 border transition-all duration-200 ${
                          reward.enabled ? 'bg-white/10 border-white/30' : 'bg-white/3 border-white/10 opacity-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setLinkedTaskRewards((prev) =>
                              prev.map((r) =>
                                r.currency_type === reward.currency_type ? { ...r, enabled: !r.enabled } : r
                              )
                            )
                          }
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            reward.enabled ? 'bg-white/30 border-white/60' : 'bg-transparent border-white/30'
                          }`}
                        >
                          {reward.enabled && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className="text-lg flex-shrink-0">{meta.icon}</span>
                        <span className="text-sm text-white/80 font-medium flex-1">{meta.label}</span>
                        {reward.enabled && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setLinkedTaskRewards((prev) =>
                                  prev.map((r) =>
                                    r.currency_type === reward.currency_type
                                      ? { ...r, amount: Math.max(1, r.amount - 1) }
                                      : r
                                  )
                                )
                              }
                              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                            >−</button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={reward.amount}
                              onChange={(e) =>
                                setLinkedTaskRewards((prev) =>
                                  prev.map((r) =>
                                    r.currency_type === reward.currency_type
                                      ? { ...r, amount: Math.max(1, Math.min(999, Number(e.target.value))) }
                                      : r
                                  )
                                )
                              }
                              className="w-12 text-center bg-white/10 border border-white/20 rounded-lg text-white text-sm font-bold py-0.5"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setLinkedTaskRewards((prev) =>
                                  prev.map((r) =>
                                    r.currency_type === reward.currency_type
                                      ? { ...r, amount: Math.min(999, r.amount + 1) }
                                      : r
                                  )
                                )
                              }
                              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                            >+</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recurring Event Options */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-white border-white/30 rounded focus:ring-white/50 bg-white/10"
              />
              <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-white/90">
                Recurring Event
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-white/30">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Repeat Pattern
                  </label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value)}
                    className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Repeat Every
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                      className="w-20 px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                    />
                    <span className="text-sm text-white/80">
                      {recurrencePattern === 'daily' && 'day(s)'}
                      {recurrencePattern === 'weekly' && 'week(s)'}
                      {recurrencePattern === 'monthly' && 'month(s)'}
                      {recurrencePattern === 'yearly' && 'year(s)'}
                    </span>
                  </div>
                </div>

                {recurrencePattern === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Repeat On
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const dayLower = day.toLowerCase()
                            if (recurrenceDays.includes(dayLower)) {
                              setRecurrenceDays(recurrenceDays.filter(d => d !== dayLower))
                            } else {
                              setRecurrenceDays([...recurrenceDays, dayLower])
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            recurrenceDays.includes(day.toLowerCase())
                              ? 'bg-white/30 text-white shadow-md hover:shadow-lg hover:scale-105 border border-white/40'
                              : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={date}
                    className="w-full px-4 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/40"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            {editingEvent && onDeleteEvent && (
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
              {editingEvent ? 'Update Event' : 'Add Event'}
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

      {/* Update Options Dialog */}
      {showUpdateOptions && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 max-w-md border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4 drop-shadow-lg">Update Recurring Event</h3>
            <p className="text-sm text-white/80 mb-6">This is a recurring event. What would you like to update?</p>
            <div className="space-y-3">
              <button
                onClick={() => handleUpdateWithScope('single')}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-white/30"
              >
                <div className="font-semibold">Only this event</div>
                <div className="text-sm opacity-90">Update just this occurrence</div>
              </button>
              <button
                onClick={() => handleUpdateWithScope('future')}
                className="w-full px-4 py-3 bg-purple-500/30 backdrop-blur-lg hover:bg-purple-500/40 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-purple-300/30"
              >
                <div className="font-semibold">This and following events</div>
                <div className="text-sm opacity-90">Update this and all future occurrences</div>
              </button>
              <button
                onClick={() => handleUpdateWithScope('all')}
                className="w-full px-4 py-3 bg-green-500/30 backdrop-blur-lg hover:bg-green-500/40 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-green-300/30"
              >
                <div className="font-semibold">All events</div>
                <div className="text-sm opacity-90">Update all occurrences in the series</div>
              </button>
              <button
                onClick={() => setShowUpdateOptions(false)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200 border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Options Dialog */}
      {showDeleteOptions && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-10 animate-in fade-in duration-200">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 max-w-md border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4 drop-shadow-lg">Delete Recurring Event</h3>
            <p className="text-sm text-white/80 mb-6">This is a recurring event. What would you like to delete?</p>
            <div className="space-y-3">
              <button
                onClick={() => handleDeleteWithScope('single')}
                className="w-full px-4 py-3 bg-orange-500/30 backdrop-blur-lg hover:bg-orange-500/40 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-orange-300/30"
              >
                <div className="font-semibold">Only this event</div>
                <div className="text-sm opacity-90">Delete just this occurrence</div>
              </button>
              <button
                onClick={() => handleDeleteWithScope('future')}
                className="w-full px-4 py-3 bg-red-500/30 backdrop-blur-lg hover:bg-red-500/40 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-red-300/30"
              >
                <div className="font-semibold">This and following events</div>
                <div className="text-sm opacity-90">Delete this and all future occurrences</div>
              </button>
              <button
                onClick={() => handleDeleteWithScope('all')}
                className="w-full px-4 py-3 bg-red-600/30 backdrop-blur-lg hover:bg-red-600/40 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-left border border-red-400/30"
              >
                <div className="font-semibold">All events</div>
                <div className="text-sm opacity-90">Delete all occurrences in the series</div>
              </button>
              <button
                onClick={() => setShowDeleteOptions(false)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200 border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
