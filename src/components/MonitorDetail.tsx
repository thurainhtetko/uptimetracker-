import type { Monitor } from '../types'
import { STATUS_META } from '../types'
import { formatDuration, formatResponse, formatUptime } from '../utils/format'

interface MonitorDetailProps {
  monitor: Monitor | null
}

function uptimeTone(value: number | null): string {
  if (value == null) return ''
  if (value >= 99.9) return 'tone-ok'
  if (value >= 97) return 'tone-warn'
  return 'tone-bad'
}

export function MonitorDetail({ monitor }: MonitorDetailProps) {
  if (!monitor) {
    return <p className="empty-state">Select a monitor to see its details.</p>
  }

  const meta = STATUS_META[monitor.status]

  return (
    <div className="detail">
      <div className="detail__head">
        <div>
          <h3 className="detail__name">
            <a href={monitor.url} target="_blank" rel="noreferrer">
              {monitor.name}
            </a>
          </h3>
          <p className="detail__url">{monitor.url}</p>
        </div>
        <span className={`badge badge--${meta.tone}`}>
          <span className="badge__dot" aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      <dl className="detail__stats">
        <div>
          <dt>Uptime 7d</dt>
          <dd className={uptimeTone(monitor.uptime.d7)}>{formatUptime(monitor.uptime.d7)}</dd>
        </div>
        <div>
          <dt>Uptime 30d</dt>
          <dd className={uptimeTone(monitor.uptime.d30)}>{formatUptime(monitor.uptime.d30)}</dd>
        </div>
        <div>
          <dt>Uptime 90d</dt>
          <dd className={uptimeTone(monitor.uptime.d90)}>{formatUptime(monitor.uptime.d90)}</dd>
        </div>
        <div>
          <dt>Avg response</dt>
          <dd>{formatResponse(monitor.avgResponseMs)}</dd>
        </div>
        <div>
          <dt>Interval</dt>
          <dd>{formatDuration(monitor.intervalSec)}</dd>
        </div>
        <div>
          <dt>All-time</dt>
          <dd>{formatUptime(monitor.allTimeUptime)}</dd>
        </div>
      </dl>
    </div>
  )
}
