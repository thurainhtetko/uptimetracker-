import type { Monitor } from '../types'
import { formatDayLabel, formatUptime } from '../utils/format'

interface UptimeBarsProps {
  monitors: Monitor[]
}

function barClass(uptime: number | null): string {
  if (uptime == null) return 'bar bar--nodata'
  if (uptime >= 99.9) return 'bar bar--ok'
  if (uptime >= 97) return 'bar bar--warn'
  if (uptime >= 50) return 'bar bar--bad'
  return 'bar bar--down'
}

export function UptimeBars({ monitors }: UptimeBarsProps) {
  if (monitors.length === 0) {
    return <p className="empty-state">No monitors to display.</p>
  }

  return (
    <div className="uptime-bars">
      {monitors.map((m) => (
        <div key={m.id} className="uptime-bars__row">
          <div className="uptime-bars__meta">
            <span className="uptime-bars__name">{m.name}</span>
            <span className="uptime-bars__pct">{formatUptime(m.uptime.d90)}</span>
          </div>
          <div className="uptime-bars__track" role="img" aria-label={`90-day uptime for ${m.name}`}>
            {m.dailyUptimes.map((day) => (
              <span
                key={day.date}
                className={barClass(day.uptime)}
                title={`${formatDayLabel(day.date)}: ${day.uptime == null ? 'no data' : formatUptime(day.uptime)}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="uptime-bars__legend">
        <span><i className="bar bar--ok" /> 100–99.9%</span>
        <span><i className="bar bar--warn" /> 99.9–97%</span>
        <span><i className="bar bar--bad" /> 97–50%</span>
        <span><i className="bar bar--down" /> &lt;50%</span>
        <span><i className="bar bar--nodata" /> No data</span>
      </div>
    </div>
  )
}
