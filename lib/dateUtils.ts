// Date formatting utilities

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
