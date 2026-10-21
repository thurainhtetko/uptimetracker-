import type { Monitor } from '../types'
import { formatMs, formatUptime } from '../utils/format'

interface StatCardsProps {
  monitors: Monitor[]
}

export function StatCards({ monitors }: StatCardsProps) {
  const total = monitors.length
  const up = monitors.filter((m) => m.status === 'up').length
  const down = monitors.filter((m) => m.status === 'down').length
  const degraded = monitors.filter((m) => m.status === 'starting').length
  const paused = monitors.filter((m) => m.status === 'paused').length

  const withUptime = monitors.filter((m) => Number.isFinite(m.uptime.d30))
  const avgUptime30 =
    withUptime.length > 0
      ? withUptime.reduce((sum, m) => sum + m.uptime.d30, 0) / withUptime.length
      : null

  const withResponse = monitors.filter((m) => m.avgResponseMs != null)
  const avgResponse =
    withResponse.length > 0
      ? withResponse.reduce((sum, m) => sum + (m.avgResponseMs ?? 0), 0) / withResponse.length
      : null

  const overall =
    down > 0 ? 'down' : degraded > 0 ? 'degraded' : up === total && total > 0 ? 'up' : 'unknown'

  const overallLabel =
    overall === 'down'
      ? `${down} service${down === 1 ? '' : 's'} down`
      : overall === 'degraded'
        ? 'Degraded performance'
        : overall === 'up'
          ? 'All systems operational'
          : 'No data'

  const cards = [
    {
      label: 'Overall status',
      value: overallLabel,
      tone: overall === 'down' ? 'danger' : overall === 'up' ? 'success' : overall === 'degraded' ? 'warn' : 'muted',
      detail: paused > 0 ? `${paused} paused` : undefined,
    },
    {
      label: 'Uptime (30d avg)',
      value: formatUptime(avgUptime30),
      tone: (avgUptime30 ?? 100) >= 99.9 ? 'success' : (avgUptime30 ?? 0) >= 99 ? 'warn' : 'danger',
      detail: 'Across all monitors',
    },
    {
      label: 'Avg response',
      value: formatMs(avgResponse),
      tone: (avgResponse ?? 0) < 500 ? 'success' : (avgResponse ?? 0) < 1500 ? 'warn' : 'danger',
      detail: 'Latest checks',
    },
  ]

  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <span className="stat-card__label">{card.label}</span>
          <span className={`stat-card__value stat-card__value--${card.tone}`}>{card.value}</span>
          {card.detail && <span className="stat-card__detail">{card.detail}</span>}
        </div>
      ))}
    </div>
  )
}
