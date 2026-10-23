export const TIME_ZONE = 'Asia/Yangon'
export const TIME_ZONE_LABEL = 'MMT'

const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
})

function partMap(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const map: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return map
}

export function formatTimestamp(timestampSec: number): string {
  const parts = partMap(timestampFormatter, new Date(timestampSec * 1000))
  const hour = (parts.hour ?? '00').padStart(2, '0')
  return `${parts.month} ${parts.day}, ${hour}:${parts.minute} ${parts.dayPeriod}`
}

export function formatClock(timestampMs: number): string {
  const parts = partMap(clockFormatter, new Date(timestampMs))
  const hour = (parts.hour ?? '00').padStart(2, '0')
  return `${hour}:${parts.minute}:${parts.second}`
}

export function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const parts = partMap(dayFormatter, date)
  return `${parts.month} ${parts.day}`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'

  const total = Math.floor(seconds)
  if (total < 60) return `${total}s`

  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatUptime(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

export function formatResponse(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatUpdated(nowMs: number, lastUpdatedMs: number | null): string {
  if (lastUpdatedMs == null) return 'Not updated yet'

  const seconds = Math.max(0, Math.floor((nowMs - lastUpdatedMs) / 1000))
  if (seconds < 10) return 'Updated just now'
  if (seconds < 60) return `Updated ${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  return `Updated ${minutes}m ago`
}
