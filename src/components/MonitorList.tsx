import type { Monitor } from '../types'
import { STATUS_META } from '../types'
import { formatUptime } from '../utils/format'

interface MonitorListProps {
  monitors: Monitor[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export function MonitorList({ monitors, selectedId, onSelect }: MonitorListProps) {
  if (monitors.length === 0) {
    return <p className="empty-state">No monitors configured.</p>
  }

  return (
    <ul className="monitor-list" role="list">
      {monitors.map((monitor) => {
        const meta = STATUS_META[monitor.status]
        const selected = monitor.id === selectedId

        return (
          <li
            key={monitor.id}
            className={`monitor-card${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(monitor.id)}
          >
            <div className="monitor-card__main">
              <span className={`status-dot status-dot--${meta.tone}`} aria-hidden="true" />
              <a
                className="monitor-card__name"
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                {monitor.name}
              </a>
              <span className={`badge badge--${meta.tone}`}>{meta.label}</span>
            </div>
            <div className="monitor-card__side">
              <span className="monitor-card__uptime">
                <span className="monitor-card__uptime-label">All-time</span>
                <strong>{formatUptime(monitor.allTimeUptime ?? monitor.uptime.d90)}</strong>
              </span>
              <button
                type="button"
                className="btn btn--small"
                aria-pressed={selected}
                aria-label={selected ? `${monitor.name} details selected` : `View details for ${monitor.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(monitor.id)
                }}
              >
                {selected ? 'Selected' : 'View details'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
