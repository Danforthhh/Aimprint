// Generic horizontal bar chart for Project / Model / Machine / Ticket breakdowns
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DimItem } from '../types'
import { fmtTokens } from '../utils/format'

interface Props {
  title: string
  data: DimItem[]
  color?: string
  subtitle?: string
  emptyState?: React.ReactNode
}

const PALETTE = ['#3b82f6','#22c55e','#f97316','#a855f7','#14b8a6','#eab308','#ef4444','#6b7280']

export default function DimChart({ title, data, color, subtitle, emptyState }: Props) {
  const sorted = [...data].sort((a, b) => b.tokens - a.tokens).slice(0, 12)

  if (sorted.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center h-40 gap-2 text-center px-6">
        {emptyState ?? <p className="text-sm text-gray-600">No data</p>}
      </div>
    )
  }

  const height = Math.max(120, sorted.length * 32)

  return (
    <div className="card">
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        {subtitle && <span className="text-xs text-gray-600">{subtitle}</span>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tickFormatter={n => fmtTokens(n)}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            formatter={(v: number, _name: string, props: { payload?: DimItem }) => [
              `${fmtTokens(v)} tokens · ${props.payload?.sessions ?? 0} sessions`,
              'Usage',
            ]}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#9ca3af' }}
          />
          <Bar dataKey="tokens" radius={[0, 3, 3, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
