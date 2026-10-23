import type { Incident, Monitor, MonitorStatus, RawLogEntry, RawMonitor, RawResponse } from '../types'

// Monitor-specific API key (safe for client-side use: it can only read this one
// monitor, and UptimeRobot sends CORS headers for it). Override via env if needed.
const DEFAULT_API_KEY = 'm804358825-6377a26848c9dea31f7751e8'
const API_KEY = (import.meta.env.VITE_UPTIMEROBOT_API_KEY as string | undefined) ?? DEFAULT_API_KEY
const API_ENDPOINT = (import.meta.env.VITE_API_ENDPOINT as string | undefined) ?? 'https://api.uptimerobot.com/v2/getMonitors'

const DAY = 86400
const UPTIME_RANGE_DAYS = 90

export const SERIES_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#f778ba', '#39c5cf']

export class ApiError extends Error {
  rateLimited: boolean

  constructor(message: string, rateLimited = false) {
    super(message)
    this.name = 'ApiError'
    this.rateLimited = rateLimited
  }
}

function buildDailyRanges(now: number): string {
  const ranges: string[] = []
  for (let j = UPTIME_RANGE_DAYS - 1; j >= 0; j--) {
    const end = now - j * DAY
    ranges.push(`${end - DAY}_${end}`)
  }
  return ranges.join('-')
}

function parseRatioList(value: string | undefined): number[] {
  if (!value) return []
  return value.split('-').map((part) => Number.parseFloat(part))
}

function statusFromCode(code: number): MonitorStatus {
  switch (code) {
    case 0:
      return 'paused'
    case 1:
      return 'starting'
    case 2:
      return 'up'
    case 8:
    case 9:
      return 'down'
    default:
      return 'paused'
  }
}

function reasonText(reason: RawLogEntry['reason']): string | null {
  if (!reason) return null
  const detail = reason.detail?.trim()
  if (!detail) return reason.code
  return `${reason.code} ${detail}`
}

export function toIncidents(logs: RawLogEntry[] | undefined): Incident[] {
  if (!logs?.length) return []
  const sorted = [...logs].sort((a, b) => a.datetime - b.datetime)
  const incidents: Incident[] = []
  let open: { startedAt: number; reason: string | null } | null = null

  for (const entry of sorted) {
    if (entry.type === 1) {
      open = { startedAt: entry.datetime, reason: reasonText(entry.reason) }
    } else if ((entry.type === 2 || entry.type === 99) && open) {
      incidents.push({
        startedAt: open.startedAt,
        endedAt: entry.datetime,
        durationSec: entry.datetime - open.startedAt,
        reason: open.reason,
      })
      open = null
    }
  }

  if (open) {
    incidents.push({ startedAt: open.startedAt, endedAt: null, durationSec: null, reason: open.reason })
  }

  return incidents.sort((a, b) => b.startedAt - a.startedAt)
}

export function normalizeMonitor(raw: RawMonitor, now: number): Monitor {
  const [d7 = 0, d30 = 0, d90 = 0] = parseRatioList(raw.custom_uptime_ratio)
  const rangeRatios = parseRatioList(raw.custom_uptime_ranges)

  const dailyUptimes = rangeRatios.map((uptime, index) => {
    const end = now - (UPTIME_RANGE_DAYS - 1 - index) * DAY
    return { date: end, uptime: end <= raw.create_datetime ? null : uptime }
  })

  return {
    id: raw.id,
    name: raw.friendly_name,
    url: raw.url,
    status: statusFromCode(raw.status),
    intervalSec: raw.interval,
    createdAt: raw.create_datetime,
    uptime: { d7, d30, d90 },
    dailyUptimes,
    responseTimes: (raw.response_times ?? []).map((p) => ({ t: p.datetime, ms: p.value })),
    avgResponseMs: raw.average_response_time ? Number.parseFloat(raw.average_response_time) : null,
    incidents: toIncidents(raw.logs),
  }
}

export async function fetchMonitors(): Promise<Monitor[]> {
  const now = Math.floor(Date.now() / 1000)
  const monitorIds = ((import.meta.env.VITE_MONITOR_IDS ?? '') as string)
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean)

  const params = new URLSearchParams({
    api_key: API_KEY,
    format: 'json',
    logs: '1',
    response_times: '1',
    custom_uptime_ratios: '7-30-90',
    custom_down_durations: '1',
    custom_uptime_ranges: buildDailyRanges(now),
  })
  if (monitorIds.length) params.set('monitors', monitorIds.join('-'))

  let response: Response
  try {
    response = await fetch(API_ENDPOINT, { method: 'POST', body: params })
  } catch {
    throw new ApiError('Network error — could not reach the UptimeRobot API.')
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    throw new ApiError(
      retryAfter ? `Rate limited by UptimeRobot — retry in ${retryAfter}s.` : 'Rate limited by UptimeRobot — try again shortly.',
      true,
    )
  }

  let data: RawResponse
  try {
    data = (await response.json()) as RawResponse
  } catch {
    throw new ApiError(`UptimeRobot returned an invalid response (HTTP ${response.status}).`)
  }

  if (data.stat !== 'ok' || !data.monitors) {
    throw new ApiError(data.error?.message ?? `UptimeRobot request failed (HTTP ${response.status}).`)
  }

  const monitors = data.monitors.map((raw) => normalizeMonitor(raw, now))
  return monitorIds.length
    ? monitors.filter((m) => monitorIds.includes(String(m.id)))
    : monitors
}
