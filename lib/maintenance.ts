/**
 * Maintenance status math — pure helpers shared by the Maintenance view, the
 * homescreen card, and the morning digest. Tracks by miles, time, or uses.
 */

export type TrackType = 'miles' | 'time' | 'uses'

export interface MaintenanceItemLike {
  track_type: TrackType
  interval_value: number
  interval_unit?: string | null
  last_service_date?: string | null
  last_service_odometer?: number | null
  uses_since_service?: number | null
}

export type MaintenanceState = 'ok' | 'soon' | 'overdue' | 'unknown'

export interface MaintenanceStatus {
  state: MaintenanceState
  /** miles / days / uses remaining (negative = amount overdue); null when unknown */
  remaining: number | null
  /** 0..1 fraction of the interval elapsed (for a progress bar) */
  progress: number
  /** short human status, e.g. "2,300 mi left", "in 12 days", "Overdue by 3 uses" */
  label: string
  /** the interval, e.g. "every 5,000 mi", "every 3 months", "every 10 uses" */
  detail: string
}

function unitToDays(unit?: string | null): number {
  return unit === 'months' ? 30 : unit === 'weeks' ? 7 : 1
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function toLocalMidnight(s: string): Date {
  const d = s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

function plural(n: number, word: string): string {
  return `${fmt(Math.abs(n))} ${word}${Math.abs(n) === 1 ? '' : 's'}`
}

/**
 * @param assetOdometer current odometer of the item's asset (for miles items)
 */
export function computeMaintenanceStatus(
  item: MaintenanceItemLike,
  assetOdometer: number | null | undefined,
  today: Date = new Date()
): MaintenanceStatus {
  const interval = Math.max(0, item.interval_value || 0)

  if (item.track_type === 'miles') {
    const detail = `every ${fmt(interval)} mi`
    if (assetOdometer == null || item.last_service_odometer == null) {
      return { state: 'unknown', remaining: null, progress: 0, label: 'Set current mileage', detail }
    }
    const elapsed = assetOdometer - item.last_service_odometer
    const remaining = interval - elapsed
    const progress = interval > 0 ? Math.min(1, Math.max(0, elapsed / interval)) : 1
    const soonThreshold = Math.max(interval * 0.1, 0)
    const state: MaintenanceState = remaining <= 0 ? 'overdue' : remaining <= soonThreshold ? 'soon' : 'ok'
    const label = remaining <= 0 ? `Overdue by ${plural(remaining, 'mi')}` : `${fmt(remaining)} mi left`
    return { state, remaining, progress, label, detail }
  }

  if (item.track_type === 'uses') {
    const detail = `every ${fmt(interval)} use${interval === 1 ? '' : 's'}`
    const used = item.uses_since_service ?? 0
    const remaining = interval - used
    const progress = interval > 0 ? Math.min(1, Math.max(0, used / interval)) : 1
    const state: MaintenanceState = remaining <= 0 ? 'overdue' : remaining <= 1 ? 'soon' : 'ok'
    const label = remaining <= 0 ? `Overdue by ${plural(remaining, 'use')}` : `${plural(remaining, 'use')} left`
    return { state, remaining, progress, label, detail }
  }

  // time
  const unit = item.interval_unit || 'days'
  const detail = `every ${fmt(interval)} ${unit === 'days' ? 'day' : unit.slice(0, -1)}${interval === 1 ? '' : 's'}`
  if (!item.last_service_date) {
    return { state: 'unknown', remaining: null, progress: 0, label: 'Set last service date', detail }
  }
  const t = new Date(today); t.setHours(0, 0, 0, 0)
  const anchor = toLocalMidnight(item.last_service_date)
  const intervalDays = interval * unitToDays(unit)
  const elapsedDays = Math.floor((t.getTime() - anchor.getTime()) / 86_400_000)
  const remaining = Math.round(intervalDays - elapsedDays)
  const progress = intervalDays > 0 ? Math.min(1, Math.max(0, elapsedDays / intervalDays)) : 1
  const state: MaintenanceState = remaining <= 0 ? 'overdue' : remaining <= 7 ? 'soon' : 'ok'
  const label =
    remaining <= 0 ? `Overdue by ${plural(remaining, 'day')}`
    : remaining === 0 ? 'Due today'
    : `${plural(remaining, 'day')} left`
  return { state, remaining, progress, label, detail }
}
