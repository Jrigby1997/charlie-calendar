'use client'

import { useEffect, useRef } from 'react'

interface HourlyEntry {
  time: string
  temp: number
  weathercode: number
  wind: number
  precipitationProbability: number
}

interface WeatherPopupProps {
  date: string // YYYY-MM-DD
  hourly: HourlyEntry[]
  units: string
  anchorRect: DOMRect
  onClose: () => void
  location?: string
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

function formatHour(timeStr: string) {
  const date = new Date(timeStr)
  const h = date.getHours()
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

export default function WeatherPopup({ date, hourly, units, anchorRect, onClose, location }: WeatherPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Filter to this day's hours, every 3 hours
  const dayHourly = hourly.filter(h => h.time.startsWith(date)).filter((_, i) => i % 3 === 0)

  const unitLabel = units === 'celsius' ? '°C' : '°F'

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Position: below anchor if room, otherwise above
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600
  const popupHeight = 280
  const showBelow = anchorRect.bottom + popupHeight < viewportHeight

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(8, Math.min(anchorRect.left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 280)),
    top: showBelow ? anchorRect.bottom + 4 : anchorRect.top - popupHeight - 4,
    width: 260,
    zIndex: 60,
  }

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div
      ref={popupRef}
      style={style}
      className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-white text-sm font-semibold">{displayDate}</p>
          {location && <p className="text-white/50 text-xs">📍 {location}</p>}
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none">✕</button>
      </div>

      {dayHourly.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-4">No hourly data</p>
      ) : (
        <div className="space-y-1">
          {dayHourly.map((h) => (
            <div key={h.time} className="flex items-center gap-2 px-1 py-0.5">
              <span className="text-white/50 text-xs w-10 shrink-0">{formatHour(h.time)}</span>
              <span className="text-base">{weatherEmoji(h.weathercode)}</span>
              <span className="text-white text-sm font-medium w-12">{Math.round(h.temp)}{unitLabel}</span>
              <span className="text-white/50 text-xs">💨{Math.round(h.wind)}</span>
              {h.precipitationProbability > 0 && (
                <span className="text-blue-300 text-xs ml-auto">{h.precipitationProbability}%💧</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
