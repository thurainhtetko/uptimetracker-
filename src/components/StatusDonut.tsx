import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Monitor, MonitorStatus } from '../types'
import { tooltipStyle } from '../utils/chart'

interface StatusDonutProps {
  monitors: Monitor[]
}

const STATUS_COLORS: Record<MonitorStatus, string> = {
  up: '#3fb950',
  down: '#f85149',
  paused: '#6e7681',
  starting: '#d29922',
}

const STATUS_NAMES: Record<MonitorStatus, string> = {
  up: 'Up',
  down: 'Down',
  paused: 'Paused',
  starting: 'Degraded',
}

export function StatusDonut({ monitors }: StatusDonutProps) {
  const counts = monitors.reduce(
    (acc, m) => {
      acc[m.status] += 1
      return acc
    },
    { up: 0, down: 0, paused: 0, starting: 0 } as Record<MonitorStatus, number>,
  )

  const data = (Object.keys(counts) as MonitorStatus[])
    .filter((status) => counts[status] > 0)
    .map((status) => ({ name: STATUS_NAMES[status], value: counts[status], status }))

  if (data.length === 0) {
    return <p className="empty-state">No monitors yet.</p>
  }

  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [String(value), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="donut-legend">
        {data.map((entry) => (
          <li key={entry.status}>
            <i style={{ background: STATUS_COLORS[entry.status] }} />
            {entry.name}
            <strong>{entry.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
