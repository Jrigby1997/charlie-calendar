'use client'

import { useState, useEffect } from 'react'

type EditGoogleEventModalProps = {
  isOpen: boolean
  onClose: () => void
  /** The external event being edited. */
  event: {
    title: string
    date: string
    end_date: string | null
    start_time: string | null
    end_time: string | null
    description: string | null
  } | null
  /** Google-side identifiers needed to call the update API. */
  externalEventId: string | null
  externalCalendarId: string | null
  integrationId: number | null
  calendarName: string
  googleEmail: string | null
  /** Called when the user clicks Save; page.tsx owns the actual API call. */
  onSave: (
    externalEventId: string,
    calendarId: string,
    integrationId: number,
    fields: {
      title: string
      date: string
      endDate: string
      startTime: string
      endTime: string
      description: string
    }
  ) => Promise<void>
  onShowToast: (message: string, tone: 'success' | 'error') => void
}

function generateTimeOptions() {
  const opts = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const ampm = h < 12 ? 'AM' : 'PM'
      const displayH = h % 12 || 12
      opts.push({ value: `${hh}:${mm}`, label: `${displayH}:${mm} ${ampm}` })
    }
  }
  return opts
}

const TIME_OPTIONS = generateTimeOptions()

export default function EditGoogleEventModal({
  isOpen,
  onClose,
  event,
  externalEventId,
  externalCalendarId,
  integrationId,
  calendarName,
  googleEmail,
  onSave,
  onShowToast,
}: EditGoogleEventModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Populate form when an event is passed in
  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setDate(event.date)
    setEndDate(event.end_date || event.date)
    setStartTime(event.start_time || '')
    setEndTime(event.end_time || '')
    setDescription(event.description || '')
  }, [event])

  if (!isOpen || !event) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      onShowToast('Event title is required', 'error')
      return
    }
    if (!date) {
      onShowToast('Date is required', 'error')
      return
    }
    if (endDate && endDate < date) {
      onShowToast('End date cannot be before start date', 'error')
      return
    }
    if (startTime && endTime && endDate === date && endTime <= startTime) {
      onShowToast('End time must be after start time', 'error')
      return
    }
    if (!externalEventId || !externalCalendarId || integrationId == null) {
      onShowToast('Missing Google Calendar identifiers — please close and try again', 'error')
      return
    }

    setIsSaving(true)
    try {
      await onSave(externalEventId, externalCalendarId, integrationId, {
        title: title.trim(),
        date,
        endDate: endDate || date,
        startTime,
        endTime,
        description,
      })
      onClose()
    } catch {
      // onSave is expected to show its own toast on error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/20 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Google Event</h2>
            <p className="text-white/50 text-xs mt-1">
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-[7px] font-bold mr-1 align-middle" style={{ background: 'linear-gradient(135deg,#4285F4 25%,#EA4335 50%,#FBBC04 75%,#34A853 100%)', color: 'white' }}>G</span>
              {calendarName}{googleEmail && ` · ${googleEmail}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none flex-shrink-0 transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
              required
            />
          </div>

          {/* Start Date / End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value) }}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Start Time / End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                Start Time
              </label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
              >
                <option value="">All day</option>
                {TIME_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
                End Time
              </label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
              >
                <option value="">—</option>
                {TIME_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Note */}
          <p className="text-white/30 text-xs">
            ⚠️ Phase 1: title, date, time, and description only. For recurrence or attendee changes, edit directly in Google Calendar.
          </p>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-xl text-blue-200 text-sm font-medium transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? '⏳ Saving…' : '✓ Save to Google'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
