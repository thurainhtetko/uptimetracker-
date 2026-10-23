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

export const STATUS_META: Record<MonitorStatus, { label: string; tone: 'up' | 'down' | 'paused' }> = {
  up: { label: 'Operational', tone: 'up' },
  seems_down: { label: 'Seems down', tone: 'down' },
  down: { label: 'Down', tone: 'down' },
  paused: { label: 'Paused', tone: 'paused' },
  not_checked: { label: 'Not checked', tone: 'paused' },
}

export const INCIDENT_META: Record<IncidentStatus, { label: string; tone: 'resolved' | 'ongoing' | 'maintenance' }> = {
  resolved: { label: 'Resolved', tone: 'resolved' },
  ongoing: { label: 'Ongoing', tone: 'ongoing' },
  maintenance: { label: 'Maintenance', tone: 'maintenance' },
}
