import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SERIES_COLORS } from '../api/uptimerobot'
import type { Monitor } from '../types'
import { tooltipStyle } from '../utils/chart'
import { formatDayLabel } from '../utils/format'

interface UptimeTrendChartProps {
  monitors: Monitor[]
}

interface Row {
  date: number
  [key: string]: number | null | undefined
}

export function UptimeTrendChart({ monitors }: UptimeTrendChartProps) {
  const series = monitors.filter((m) => m.dailyUptimes.some((d) => d.uptime != null))

  const timestamps = [
    ...new Set(series.flatMap((m) => m.dailyUptimes.filter((d) => d.uptime != null).map((d) => d.date))),
  ].sort((a, b) => a - b)

  const data: Row[] = timestamps.map((date) => {
    const row: Row = { date }
    for (const m of series) {
      const day = m.dailyUptimes.find((d) => d.date === date)
      row[m.id] = day?.uptime ?? null
    }
    return row
  })

  if (data.length === 0) {
    return <p className="empty-state">No uptime history yet — data appears after the first checks.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(110,118,129,0.15)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayLabel}
          stroke="rgba(110,118,129,0.4)"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={[90, 100]}
          tickFormatter={(v: number) => `${v}%`}
          stroke="rgba(110,118,129,0.4)"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          width={56}
          ticks={[90, 92, 94, 96, 98, 99, 100]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(d) => formatDayLabel(Number(d))}
          formatter={(value) => [`${Number(value).toFixed(3)}%`, 'Uptime']}
        />
        {series.map((m, i) => (
          <Line
            key={m.id}
            type="monotone"
            dataKey={m.id}
            name={m.name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
