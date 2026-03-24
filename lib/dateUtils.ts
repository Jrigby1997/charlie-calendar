// Date formatting utilities

// Parses a quantity string that may contain fractions like "1/3", "1 1/2", or decimals.
// Returns NaN if the input cannot be parsed.
export function parseFraction(value: string): number {
  const s = value.trim()
  if (s === '') return NaN
  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  // Simple fraction: "1/3"
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return parseInt(frac[1]) / parseInt(frac[2])
  // Plain number or decimal
  const n = Number(s)
  return isNaN(n) ? NaN : n
}

export function formatDate(date: Date | string, format: string): string {
  const d = typeof date === 'string' ? new Date(date) : date

  
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[d.getMonth()]

  const pad = (num: number) => String(num).padStart(2, '0')

  switch (format) {
    case 'MM/DD/YYYY':
      return `${pad(month)}/${pad(day)}/${year}`
    case 'DD/MM/YYYY':
      return `${pad(day)}/${pad(month)}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${pad(month)}-${pad(day)}`
    case 'MMM DD, YYYY':
      return `${monthName} ${pad(day)}, ${year}`
    case 'DD MMM YYYY':
      return `${pad(day)} ${monthName} ${year}`
    default:
      return `${pad(month)}/${pad(day)}/${year}`
  }
}

export function getWeekStart(date: Date, startDay: string): Date {
  const d = new Date(date)
  const currentDay = d.getDay() // 0 = Sunday, 1 = Monday, etc.

  let targetDay: number
  switch (startDay) {
    case 'Monday':
      targetDay = 1
      break
    case 'Saturday':
      targetDay = 6
      break
    case 'Sunday':
    default:
      targetDay = 0
      break
  }

  // Calculate days to subtract to get to the start of the week
  let diff = currentDay - targetDay
  if (diff < 0) {
    diff += 7
  }

  d.setDate(d.getDate() - diff)
  return d
}

export function getWeekDays(startDate: Date, startDay: string): Date[] {
  const days: Date[] = []
  const start = getWeekStart(startDate, startDay)

  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    days.push(day)
  }

  return days
}
