'use client'

import { useState } from 'react'

type FamilyMember = {
  id: number
  name: string
  color: string
  avatar_url?: string | null
}

type ExternalEventDetailProps = {
  isOpen: boolean
  onClose: () => void
  event: {
    title: string
    date: string
    end_date: string | null
    start_time: string | null
    end_time: string | null
    description: string | null
    is_all_day?: boolean
  } | null
  calendarName: string
  googleEmail: string | null
  assignedMembers: FamilyMember[]
  /** Google-side identifiers. When provided, Edit + Delete buttons are shown. */
  externalEventId?: string | null
  externalCalendarId?: string | null
  integrationId?: number | null
  onEdit?: (
    externalEventId: string,
    calendarId: string,
    integrationId: number
  ) => void
  onDelete?: (
    externalEventId: string,
    calendarId: string,
    integrationId: number
  ) => Promise<void>
}

function formatDisplayDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`
}

// Small Google-branded G badge (reused from CalendarView)
function GoogleBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #4285F4 25%, #EA4335 50%, #FBBC04 75%, #34A853 100%)', color: 'white' }}
      title="Google Calendar"
    >
      G
    </span>
  )
}

export default function ExternalEventDetailModal({
  isOpen,
  onClose,
  event,
  calendarName,
  googleEmail,
  assignedMembers,
  externalEventId,
  externalCalendarId,
  integrationId,
  onEdit,
  onDelete,
}: ExternalEventDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!isOpen || !event) return null

  const canWrite = !!(externalEventId && externalCalendarId && integrationId != null && (onEdit || onDelete))

  async function handleDelete() {
    if (!externalEventId || !externalCalendarId || integrationId == null || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(externalEventId, externalCalendarId, integrationId)
      onClose()
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  function handleEditClick() {
    if (!externalEventId || !externalCalendarId || integrationId == null || !onEdit) return
    onEdit(externalEventId, externalCalendarId, integrationId)
    onClose()
  }

  const hasTimeRange = event.start_time && event.end_time
  const isMultiDay = event.end_date && event.end_date !== event.date

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <GoogleBadge />
              <h3 className="text-xl font-bold text-white leading-snug break-words">{event.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none flex-shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Date / Time */}
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📅</span>
            <div>
              <div className="text-white font-medium">
                {formatDisplayDate(event.date)}
                {isMultiDay && event.end_date && (
                  <span className="text-white/70"> → {formatDisplayDate(event.end_date)}</span>
                )}
              </div>
              {event.start_time && (
                <div className="text-white/70 text-sm mt-0.5">
                  {hasTimeRange
                    ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
                    : formatTime(event.start_time)}
                </div>
              )}
              {!event.start_time && (
                <div className="text-white/50 text-sm mt-0.5">All day</div>
              )}
            </div>
          </div>

          {/* Calendar source */}
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">🗓️</span>
            <div>
              <div className="text-white font-medium">{calendarName}</div>
              {googleEmail && (
                <div className="text-white/50 text-xs mt-0.5">{googleEmail}</div>
              )}
            </div>
          </div>

          {/* Assigned family members */}
          {assignedMembers.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">👤</span>
              <div className="flex flex-wrap gap-2">
                {assignedMembers.map(member => (
                  <span
                    key={member.id}
                    className="px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: member.color + 'aa' }}
                  >
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📝</span>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {event.description}
              </p>
            </div>
          )}

          {/* Delete confirmation inline */}
          {confirmDelete && (
            <div className="pt-2 border-t border-red-500/20 bg-red-500/10 rounded-xl p-3 space-y-2">
              <p className="text-red-200 text-sm text-center font-medium">Delete this event from Google Calendar?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-6 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200 border border-white/20 hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500/30 backdrop-blur-lg hover:bg-red-500/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-red-300/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Managed-via note */}
          {!confirmDelete && (
            <div className="pt-2 border-t border-white/10">
              <p className="text-white/30 text-xs text-center">
                Managed via Google Calendar{canWrite ? ' · edits sync back automatically' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 px-6 py-4">
          {canWrite && !confirmDelete ? (
            <div className="flex gap-3">
              {onDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="bg-red-500/30 backdrop-blur-lg hover:bg-red-500/40 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-red-300/30"
                >
                  Delete
                </button>
              )}
              {onEdit && (
                <button
                  onClick={handleEditClick}
                  className="flex-1 bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
                >
                  Edit Event
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-200 border border-white/20 hover:scale-105"
              >
                Cancel
              </button>
            </div>
          ) : !confirmDelete ? (
            <button
              onClick={onClose}
              className="w-full bg-white/20 backdrop-blur-lg hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/30"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
