/**
 * Shared rotation helpers for date-based ("every N days") rotating tasks and
 * family roles. The holder is computed purely from the calendar — no cron or
 * stored index needed — so it self-advances by wall-clock date.
 */

/** Parse a date-only ('YYYY-MM-DD') or full timestamp string to local midnight. */
function toLocalMidnight(s: string): Date {
  const d = s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Index into the (order-sorted) rotation roster for a date-based rotation.
 * @param anchorISO  first day of rotation — usually `last_rotated_date ?? created_at`
 * @param intervalDays  days between rotations (defaults to 1 if missing/invalid)
 * @param rosterLength  number of members in the roster
 * @param today  the day to evaluate (defaults to now)
 */
export function dateRotationIndex(
  anchorISO: string | null | undefined,
  intervalDays: number | null | undefined,
  rosterLength: number,
  today: Date = new Date()
): number {
  if (rosterLength <= 0) return 0
  const interval = Math.max(1, intervalDays || 1)
  const anchor = anchorISO ? toLocalMidnight(anchorISO) : toLocalMidnight(today.toISOString())
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((t.getTime() - anchor.getTime()) / 86_400_000)
  if (diffDays < 0) return 0
  return Math.floor(diffDays / interval) % rosterLength
}
