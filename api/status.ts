export type MonitorStatus = 'up' | 'seems_down' | 'down' | 'paused' | 'not_checked'
export type IncidentStatus = 'resolved' | 'ongoing' | 'maintenance'

export interface DailyUptime {
  date: string
  uptime_pct: number | null
}

export interface Incident {
  id: string
  monitorId: number
  monitorName: string
  status: IncidentStatus
  startedAt: number
  durationSec: number | null
  reason: string | null
}

export interface Monitor {
  id: number
  name: string
  url: string
  status: MonitorStatus
  uptime: { d7: number | null; d30: number | null; d90: number | null }
  allTimeUptime: number | null
  avgResponseMs: number | null
  intervalSec: number
  createdAt: number
  dailyUptimes: DailyUptime[]
  incidents: Incident[]
}

export interface StatusPayload {
  updatedAt: number
  timeZone: string
  timeZoneLabel: string
  monitors: Monitor[]
}

export const TIME_ZONE = 'Asia/Yangon'
export const TIME_ZONE_LABEL = 'MMT'

const DAY = 86_400
const DAILY_RANGE_DAYS = 90
const CACHE_TTL_MS = 45_000
const DEFAULT_ENDPOINT = 'https://api.uptimerobot.com/v2/getMonitors'

const PRODUCTION_ORIGIN = 'https://uptimetracker.thurain.website'
const ALLOWED_ORIGINS = new Set([PRODUCTION_ORIGIN])

export class StatusError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 502) {
    super(message)
    this.name = 'StatusError'
    this.statusCode = statusCode
  }
}

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

interface CacheEntry {
  at: number
  data: StatusPayload
}

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

let cache: CacheEntry | null = null
let inFlight: Promise<StatusPayload> | null = null

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

function normalizeMonitor(raw: RawMonitor, now: number, ranges: DailyRange[]): Monitor {
  const ratioValues = parseRatioList(raw.custom_uptime_ratio)
  const rangeValues = parseRatioList(raw.custom_uptime_ranges)

  const dailyUptimes = ranges.map((range, index) => {
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

async function requestStatus(apiKey: string, monitorIds: number[]): Promise<StatusPayload> {
  const now = Math.floor(Date.now() / 1000)
  const ranges = buildDailyRanges(now)
  const endpoint = process.env.UPTIMEROBOT_API_ENDPOINT || DEFAULT_ENDPOINT

  const params = new URLSearchParams({
    api_key: apiKey,
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

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache',
      },
      body: params,
    })
  } catch {
    throw new StatusError('Could not reach the UptimeRobot API.')
  }

  if (response.status === 429) {
    throw new StatusError('UptimeRobot rate limit reached. Please try again shortly.', 429)
  }

  if (!response.ok) {
    throw new StatusError(`UptimeRobot returned HTTP ${response.status}.`)
  }

  let payload: RawResponse
  try {
    payload = (await response.json()) as RawResponse
  } catch {
    throw new StatusError('UptimeRobot returned an invalid response.')
  }

  if (payload.stat !== 'ok' || !payload.monitors) {
    throw new StatusError(payload.error?.message || 'UptimeRobot request failed.')
  }

  const monitors = payload.monitors
    .map((raw) => normalizeMonitor(raw, now, ranges))
    .filter((monitor) => monitorIds.length === 0 || monitorIds.includes(monitor.id))

  return {
    updatedAt: now,
    timeZone: TIME_ZONE,
    timeZoneLabel: TIME_ZONE_LABEL,
    monitors,
  }
}

export async function getStatusData(options: { apiKey?: string; monitorIds?: number[] } = {}): Promise<StatusPayload> {
  const apiKey = options.apiKey ?? process.env.UPTIMEROBOT_API_KEY
  if (!apiKey) {
    throw new StatusError('Server is not configured: UPTIMEROBOT_API_KEY is missing.', 500)
  }

  const monitorIds = options.monitorIds ?? parseMonitorIds(process.env.UPTIMEROBOT_MONITOR_IDS)

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data
  }

  if (inFlight) return inFlight

  inFlight = requestStatus(apiKey, monitorIds)
    .then((data) => {
      cache = { at: Date.now(), data }
      return data
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveOrigin(origin: string | undefined): string {
  if (!origin) return PRODUCTION_ORIGIN
  if (ALLOWED_ORIGINS.has(origin)) return origin
  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return origin
  return PRODUCTION_ORIGIN
}

function sendJson(
  res: ApiResponse,
  statusCode: number,
  body: unknown,
  cacheControl: string,
  headOnly = false,
): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
  res.end(headOnly ? undefined : JSON.stringify(body))
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const origin = firstHeader(req.headers.origin)
  res.setHeader('Access-Control-Allow-Origin', resolveOrigin(origin))
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    sendJson(res, 405, { error: { message: 'Method not allowed.' } }, 'no-store')
    return
  }

  const headOnly = req.method === 'HEAD'

  try {
    const data = await getStatusData()
    sendJson(res, 200, data, 'public, s-maxage=45, stale-while-revalidate=30', headOnly)
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 502
    const message = error instanceof Error ? error.message : 'Failed to load status.'
    sendJson(res, statusCode, { error: { message } }, 'no-store', headOnly)
  }
}
