export type MonitorStatus = 'up' | 'down' | 'paused' | 'starting'

export interface Incident {
  startedAt: number
  endedAt: number | null
  durationSec: number | null
  reason: string | null
}

export interface DailyUptime {
  date: number
  uptime: number | null
}

export interface ResponsePoint {
  t: number
  ms: number
}

export interface Monitor {
  id: number
  name: string
  url: string
  status: MonitorStatus
  intervalSec: number
  createdAt: number
  uptime: { d7: number; d30: number; d90: number }
  dailyUptimes: DailyUptime[]
  responseTimes: ResponsePoint[]
  avgResponseMs: number | null
  incidents: Incident[]
}

export interface RawLogEntry {
  type: number
  datetime: number
  duration?: number
  reason?: { code: string; detail: string }
}

export interface RawMonitor {
  id: number
  friendly_name: string
  url: string
  type: number
  status: number
  interval: number
  timeout: number
  create_datetime: number
  custom_uptime_ratio?: string
  custom_down_durations?: string
  custom_uptime_ranges?: string
  average_response_time?: string
  response_times?: { datetime: number; value: number }[]
  logs?: RawLogEntry[]
}

export interface RawResponse {
  stat: 'ok' | 'fail'
  pagination?: { offset: number; limit: number; total: number }
  monitors?: RawMonitor[]
  error?: { type: string; parameter_name?: string; message: string }
}
