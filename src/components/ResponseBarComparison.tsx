import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LabelProps } from 'recharts'
import type { Monitor } from '../types'
import { tooltipStyle } from '../utils/chart'
import { formatMs } from '../utils/format'

interface ResponseBarComparisonProps {
  monitors: Monitor[]
}

function barColor(ms: number): string {
  if (ms < 300) return '#3fb950'
  if (ms < 1000) return '#d29922'
  return '#f85149'
}

export function ResponseBarComparison({ monitors }: ResponseBarComparisonProps) {
  const data = monitors
    .filter((m) => m.avgResponseMs != null)
    .map((m) => ({ name: m.name, ms: m.avgResponseMs as number }))
    .sort((a, b) => a.ms - b.ms)

  if (data.length === 0) {
    return <p className="empty-state">No response-time averages available.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          stroke="rgba(255,255,255,0.18)"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          tickFormatter={(name: string) => (name.length > 22 ? `${name.slice(0, 21)}…` : name)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          formatter={(value) => [formatMs(Number(value)), 'Avg response']}
        />
        <Bar dataKey="ms" radius={[0, 4, 4, 0]} isAnimationActive={false} label={renderBarLabel}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={barColor(entry.ms)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function renderBarLabel(props: LabelProps) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const width = Number(props.width ?? 0)
  const value = Number(props.value ?? 0)
  return (
    <text x={x + width + 8} y={y + 14} fill="#8b949e" fontSize={11}>
      {formatMs(value)}
    </text>
  )
}
