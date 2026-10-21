import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SERIES_COLORS } from '../api/uptimerobot'
import type { Monitor } from '../types'
import { tooltipStyle } from '../utils/chart'
import { formatHourLabel, formatMs } from '../utils/format'

interface ResponseTimeChartProps {
  monitors: Monitor[]
}

interface Row {
  t: number
  [key: string]: number | undefined
}

export function ResponseTimeChart({ monitors }: ResponseTimeChartProps) {
  const series = monitors.filter((m) => m.responseTimes.length > 0)

  const timestamps = [...new Set(series.flatMap((m) => m.responseTimes.map((p) => p.t)))].sort(
    (a, b) => a - b,
  )

  const data: Row[] = timestamps.map((t) => {
    const row: Row = { t }
    for (const m of series) {
      const point = m.responseTimes.find((p) => p.t === t)
      if (point) row[m.id] = point.ms
    }
    return row
  })

  if (data.length === 0) {
    return <p className="empty-state">No response-time data in the last 24 hours.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          {series.map((m, i) => (
            <linearGradient key={m.id} id={`rt-${m.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="rgba(110,118,129,0.15)" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={formatHourLabel}
          stroke="rgba(110,118,129,0.4)"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          minTickGap={48}
        />
        <YAxis
          tickFormatter={(v: number) => formatMs(v)}
          stroke="rgba(110,118,129,0.4)"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(t) => formatHourLabel(Number(t))}
          formatter={(value) => [formatMs(Number(value)), 'Response']}
        />
        {series.map((m, i) => (
          <Area
            key={m.id}
            type="monotone"
            dataKey={m.id}
            name={m.name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            fill={`url(#rt-${m.id})`}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
