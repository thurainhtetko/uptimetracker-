import type { DailyUptime, Incident, IncidentStatus, Monitor, MonitorStatus, StatusPayload } from '../types'
import { TIME_ZONE, TIME_ZONE_LABEL } from '../utils/format'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const ENDPOINT = 'https://api.uptimerobot.com/v2/getMonitors'
const DAY = 86_400
const DAILY_RANGE_DAYS = 90
const REQUEST_TIMEOUT_MS = 15_000

interface RawReason {
  code?: string
  detail?: string
}

interface RawLogEntry {
  type: number
  datetime: number
  duration?: number
  reason?: RawReason
}

interface RawResponseTime {
  datetime: number
  value: number
}

interface RawMonitor {
  id: number
  friendly_name: string
  url: string
  status: number
  interval: number
  create_datetime: number
  custom_uptime_ratio?: string
  custom_uptime_ranges?: string
  all_time_uptime_ratio?: string
  average_response_time?: string
  response_times?: RawResponseTime[]
  logs?: RawLogEntry[]
}

interface RawResponse {
  stat: 'ok' | 'fail'
  monitors?: RawMonitor[]
  error?: { message?: string }
}

interface DailyRange {
  start: number
  end: number
}

const SPECIAL_REASON_LABELS: Record<string, string> = {
  '333333': 'Connection timeout',
}

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  408: 'Request Timeout',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function partMap(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const map: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return map
}

function isoDate(timestamp: number): string {
  const parts = partMap(isoDateFormatter, new Date(timestamp * 1000))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function parseRatioList(value: string | undefined): number[] {
  if (!value) return []
  return value.split('-').map((part) => Number.parseFloat(part))
}

function ratioAt(values: number[], index: number): number | null {
  const value = values[index]
  return value != null && Number.isFinite(value) ? round2(value) : null
}

function statusFromCode(code: number): MonitorStatus {
  switch (code) {
    case 1:
      return 'not_checked'
    case 2:
      return 'up'
    case 8:
      return 'seems_down'
    case 9:
      return 'down'
    case 0:
    default:
      return 'paused'
  }
}

function reasonLabel(reason: RawReason | undefined): string {
  const code = reason?.code?.trim() ?? ''
  const detail = reason?.detail?.trim() ?? ''

  if (/^\d{3}$/.test(code)) {
    const status = Number(code)
    if (status >= 100 && status <= 599) {
      const text = HTTP_STATUS_TEXT[status]
      if (text) return `${code} ${text}`
      return detail ? `${code} ${detail}` : `HTTP ${code}`
    }
  }

  if (SPECIAL_REASON_LABELS[code]) return SPECIAL_REASON_LABELS[code]

  return 'Unexpected error'
}

function buildDailyRanges(now: number): DailyRange[] {
  const ranges: DailyRange[] = []
  for (let offset = DAILY_RANGE_DAYS - 1; offset >= 0; offset--) {
    const end = now - offset * DAY
    ranges.push({ start: end - DAY, end })
  }
  return ranges
}

function averageResponseMs(raw: RawMonitor): number | null {
  const direct = raw.average_response_time ? Number.parseFloat(raw.average_response_time) : Number.NaN
  if (Number.isFinite(direct) && direct >= 0) return Math.round(direct)

  const values = (raw.response_times ?? [])
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value) && value >= 0)

  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function makeIncident(
  raw: RawMonitor,
  status: IncidentStatus,
  startedAt: number,
  durationSec: number | null,
  reason: string | null,
): Incident {
  return {
    id: `${raw.id}-${startedAt}-${status}`,
    monitorId: raw.id,
    monitorName: raw.friendly_name,
    status,
    startedAt,
    durationSec: durationSec != null && Number.isFinite(durationSec) ? Math.max(0, Math.round(durationSec)) : null,
    reason,
  }
}

function buildIncidents(raw: RawMonitor, now: number): Incident[] {
  const logs = [...(raw.logs ?? [])].sort((a, b) => a.datetime - b.datetime)
  const incidents: Incident[] = []
  let openDown: RawLogEntry | null = null
  let latestDown: RawLogEntry | null = null
  let lastClosedAt = 0

  const closeDown = (at: number): void => {
    if (!openDown) return
    const elapsed = Math.max(0, at - openDown.datetime)
    const duration = openDown.duration != null && openDown.duration > 0 ? openDown.duration : elapsed
    incidents.push(makeIncident(raw, 'resolved', openDown.datetime, duration, reasonLabel(openDown.reason)))
    openDown = null
    lastClosedAt = at
  }

  for (const log of logs) {
    if (log.type === 1) {
      latestDown = log
      if (!openDown) openDown = log
    } else if (log.type === 2) {
      closeDown(log.datetime)
    } else if (log.type === 99) {
      closeDown(log.datetime)
      incidents.push(makeIncident(raw, 'maintenance', log.datetime, log.duration ?? null, 'Scheduled maintenance'))
    }
  }

  if (openDown) {
    incidents.push(makeIncident(raw, 'ongoing', openDown.datetime, null, reasonLabel(openDown.reason)))
  }

  const status = statusFromCode(raw.status)
  const hasOngoing = incidents.some((incident) => incident.status === 'ongoing')
  if ((status === 'down' || status === 'seems_down') && !hasOngoing) {
    const startedAt = latestDown && latestDown.datetime > lastClosedAt ? latestDown.datetime : now
    const reason = latestDown ? reasonLabel(latestDown.reason) : 'No response from monitor'
    incidents.push(makeIncident(raw, 'ongoing', startedAt, null, reason))
  }

  return incidents.sort((a, b) => b.startedAt - a.startedAt)
}

function normalizeMonitor(raw: RawMonitor, now: number, ranges: DailyRange[], monitorIds: number[]): Monitor | null {
  if (monitorIds.length > 0 && !monitorIds.includes(raw.id)) return null

  const ratioValues = parseRatioList(raw.custom_uptime_ratio)
  const rangeValues = parseRatioList(raw.custom_uptime_ranges)

  const dailyUptimes: DailyUptime[] = ranges.map((range, index) => {
    const date = isoDate(range.end)
    if (range.end <= raw.create_datetime) return { date, uptime_pct: null }
    return { date, uptime_pct: ratioAt(rangeValues, index) }
  })

  return {
    id: raw.id,
    name: raw.friendly_name || raw.url,
    url: raw.url,
    status: statusFromCode(raw.status),
    uptime: {
      d7: ratioAt(ratioValues, 0),
      d30: ratioAt(ratioValues, 1),
      d90: ratioAt(ratioValues, 2),
    },
    allTimeUptime: ratioAt(parseRatioList(raw.all_time_uptime_ratio), 0),
    avgResponseMs: averageResponseMs(raw),
    intervalSec: raw.interval,
    createdAt: raw.create_datetime,
    dailyUptimes,
    incidents: buildIncidents(raw, now),
  }
}

function parseMonitorIds(value: string | undefined): number[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isFinite(id))
}

function requireApiKey(): string {
  const key = (import.meta.env.VITE_UPTIMEROBOT_API_KEY ?? '').trim()
  if (!key) {
    throw new ApiError('UptimeRobot API key is not configured. Set VITE_UPTIMEROBOT_API_KEY and rebuild.', 500)
  }
  return key
}

export async function fetchStatus(): Promise<StatusPayload> {
  const key = requireApiKey()
  const monitorIds = parseMonitorIds(import.meta.env.VITE_UPTIMEROBOT_MONITOR_IDS)
  const now = Math.floor(Date.now() / 1000)
  const ranges = buildDailyRanges(now)

  const params = new URLSearchParams({
    api_key: key,
    format: 'json',
    logs: '1',
    log_types: '1-2-99',
    logs_limit: '50',
    response_times: '1',
    response_times_limit: '30',
    custom_uptime_ratios: '7-30-90',
    custom_uptime_ranges: ranges.map((range) => `${range.start}_${range.end}`).join('-'),
    all_time_uptime_ratio: '1',
  })
  if (monitorIds.length > 0) params.set('monitors', monitorIds.join('-'))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
      cache: 'no-store',
      signal: controller.signal,
    })

    if (response.status === 429) {
      throw new ApiError('UptimeRobot rate limit reached. Please try again shortly.', 429)
    }

    let payload: RawResponse | null = null
    try {
      payload = (await response.json()) as RawResponse
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw new ApiError(payload?.error?.message ?? `UptimeRobot returned HTTP ${response.status}.`, response.status)
    }

    if (!payload || payload.stat !== 'ok' || !Array.isArray(payload.monitors)) {
      throw new ApiError(payload?.error?.message ?? 'UptimeRobot request failed.')
    }

    const monitors = payload.monitors
      .map((raw) => normalizeMonitor(raw, now, ranges, monitorIds))
      .filter((monitor): monitor is Monitor => monitor !== null)

    return {
      updatedAt: now,
      timeZone: TIME_ZONE,
      timeZoneLabel: TIME_ZONE_LABEL,
      monitors,
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The UptimeRobot request timed out.')
    }
    throw new ApiError('Could not reach the UptimeRobot API.')
  } finally {
    clearTimeout(timer)
  }
}
