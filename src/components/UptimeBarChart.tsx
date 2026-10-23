import { useState } from 'react'
import type { DailyUptime, Monitor } from '../types'
import { formatDayLabel, formatUptime } from '../utils/format'

interface UptimeBarChartProps {
  monitor: Monitor | null
}

function barTone(value: number | null): string {
  if (value == null) return 'bar--nodata'
  if (value >= 99.9) return 'bar--ok'
  if (value >= 97) return 'bar--warn'
  if (value >= 50) return 'bar--bad'
  return 'bar--down'
}

function barLabel(day: DailyUptime): string {
  return `${formatDayLabel(day.date)}: ${day.uptime_pct == null ? 'No data' : formatUptime(day.uptime_pct)}`
}

export function UptimeBarChart({ monitor }: UptimeBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (!monitor) {
    return <p className="empty-state">Select a monitor to view its 90-day uptime.</p>
  }

  const days = monitor.dailyUptimes
  if (days.length === 0) {
    return <p className="empty-state">No uptime history available yet.</p>
  }

  const active = activeIndex != null ? days[activeIndex] : null

  return (
    <div className="uptime">
      <div className="uptime__head">
        <div>
          <h3 className="uptime__name">{monitor.name}</h3>
          <p className="uptime__summary">90-day uptime · {formatUptime(monitor.uptime.d90)}</p>
        </div>
        <p className="uptime__readout" role="status" aria-live="polite">
          {active ? barLabel(active) : 'Hover or focus a bar for details'}
        </p>
      </div>

      <div className="uptime__scroll">
        <div
          className="uptime__track"
          role="group"
          aria-label={`Daily uptime for ${monitor.name}, last 90 days`}
        >
          {days.map((day, index) => (
            <span
              key={day.date}
              role="img"
              tabIndex={0}
              className={`bar ${barTone(day.uptime_pct)}`}
              aria-label={barLabel(day)}
              title={barLabel(day)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          ))}
        </div>
      </div>

      <ul className="uptime__legend">
        <li>
          <span className="swatch bar--ok" aria-hidden="true" /> 100–99.9%
        </li>
        <li>
          <span className="swatch bar--warn" aria-hidden="true" /> 99.9–97%
        </li>
        <li>
          <span className="swatch bar--bad" aria-hidden="true" /> 97–50%
        </li>
        <li>
          <span className="swatch bar--down" aria-hidden="true" /> &lt;50%
        </li>
        <li>
          <span className="swatch bar--nodata" aria-hidden="true" /> No data
        </li>
      </ul>
    </div>
  )
}
