const IST = 'Asia/Kolkata'

export const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function initials(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, '').split(' ').filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

// Today (or today plus n days) as YYYY-MM-DD in Indian time
export function istDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  )
}

// Formats a YYYY-MM-DD string, for example { weekday: 'short', day: 'numeric', month: 'short' }
export function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: IST,
    ...options,
  })
}

// Formats a timestamp from the API as a time like "9:30 am"
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
  })
}
// Converts a timestamp from the API into a YYYY-MM-DD string in Indian time
export function dateOf(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date(iso))
}