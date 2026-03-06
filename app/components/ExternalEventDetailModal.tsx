'use client'

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
}: ExternalEventDetailProps) {
  if (!isOpen || !event) return null

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

          {/* Read-only notice */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-white/40 text-xs text-center">
              This event is synced from Google Calendar and is read-only.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-lg border border-white/30 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
