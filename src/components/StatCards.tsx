import type { Monitor } from '../types'
import { formatClock, formatResponse, formatUpdated, formatUptime, TIME_ZONE_LABEL } from '../utils/format'

interface StatCardsProps {
  monitors: Monitor[]
  lastUpdated: number | null
  now: number
}

function weightedUptime30(monitors: Monitor[], nowMs: number): number | null {
  const nowSec = Math.floor(nowMs / 1000)
  let weighted = 0
  let weight = 0

  for (const monitor of monitors) {
    if (monitor.uptime.d30 == null) continue
    const monitoredSec = Math.max(1, Math.min(30 * 86_400, nowSec - monitor.createdAt))
    weighted += monitor.uptime.d30 * monitoredSec
    weight += monitoredSec
  }

  return weight > 0 ? weighted / weight : null
}

function averageResponse(monitors: Monitor[]): number | null {
  const values = monitors
    .map((monitor) => monitor.avgResponseMs)
    .filter((value): value is number => value != null && Number.isFinite(value))

  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function StatCards({ monitors, lastUpdated, now }: StatCardsProps) {
  const uptime30 = weightedUptime30(monitors, now)
  const response = averageResponse(monitors)

  return (
    <div className="stat-grid">
      <article className="stat-card">
        <span className="stat-card__label">Uptime (30d avg)</span>
        <span className={`stat-card__value stat-card__value--${uptimeTone(uptime30)}`}>
          {formatUptime(uptime30)}
        </span>
        <span className="stat-card__detail">Across all monitors, weighted avg</span>
      </article>

      <article className="stat-card">
        <span className="stat-card__label">Avg response</span>
        <span className={`stat-card__value stat-card__value--${responseTone(response)}`}>
          {formatResponse(response)}
        </span>
        <span className="stat-card__detail">Latest checks</span>
      </article>

      <article className="stat-card">
        <span className="stat-card__label">Last updated</span>
        <span className="stat-card__value">
          {lastUpdated == null ? '—' : `${formatClock(lastUpdated)} ${TIME_ZONE_LABEL}`}
        </span>
        <span className="stat-card__detail">{formatUpdated(now, lastUpdated)}</span>
      </article>
    </div>
  )
}

function uptimeTone(value: number | null): 'success' | 'warn' | 'danger' | 'muted' {
  if (value == null) return 'muted'
  if (value >= 99.9) return 'success'
  if (value >= 99) return 'warn'
  return 'danger'
}

function responseTone(value: number | null): 'success' | 'warn' | 'danger' | 'muted' {
  if (value == null) return 'muted'
  if (value < 500) return 'success'
  if (value < 1500) return 'warn'
  return 'danger'
}
