import type { Monitor } from '../types'
import { formatInterval, formatMs, formatUptime } from '../utils/format'
import { StatusBadge } from './Header'

interface MonitorListProps {
  monitors: Monitor[]
}

export function MonitorList({ monitors }: MonitorListProps) {
  if (monitors.length === 0) {
    return <p className="empty-state">No monitors configured.</p>
  }

  return (
    <div className="monitor-list">
      {monitors.map((m) => (
        <article key={m.id} className="monitor-card">
          <div className="monitor-card__head">
            <div>
              <h3 className="monitor-card__name">
                <a href={m.url} target="_blank" rel="noreferrer">
                  {m.name}
                </a>
              </h3>
              <p className="monitor-card__url">{m.url}</p>
            </div>
            <StatusBadge status={m.status} />
          </div>
          <dl className="monitor-card__stats">
            <div>
              <dt>Uptime 7d</dt>
              <dd className={uptimeTone(m.uptime.d7)}>{formatUptime(m.uptime.d7)}</dd>
            </div>
            <div>
              <dt>Uptime 30d</dt>
              <dd className={uptimeTone(m.uptime.d30)}>{formatUptime(m.uptime.d30)}</dd>
            </div>
            <div>
              <dt>Uptime 90d</dt>
              <dd className={uptimeTone(m.uptime.d90)}>{formatUptime(m.uptime.d90)}</dd>
            </div>
            <div>
              <dt>Avg response</dt>
              <dd>{formatMs(m.avgResponseMs)}</dd>
            </div>
            <div>
              <dt>Interval</dt>
              <dd>{formatInterval(m.intervalSec)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}

function uptimeTone(ratio: number): string {
  if (ratio >= 99.9) return 'tone-ok'
  if (ratio >= 97) return 'tone-warn'
  return 'tone-bad'
}
