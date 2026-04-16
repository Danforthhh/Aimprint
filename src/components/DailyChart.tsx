import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { DayUsage } from '../types'

interface Props { data: DayUsage[] }

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function DailyChart({ data }: Props) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Daily token usage</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={d => d.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtTokens}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value: number, name: string) => [fmtTokens(value), name]}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#9ca3af' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
          <Bar dataKey="input"         name="Input"         stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
          <Bar dataKey="output"        name="Output"        stackId="a" fill="#22c55e" />
          <Bar dataKey="cache_read"    name="Cache read"    stackId="a" fill="#f59e0b" />
          <Bar dataKey="cache_creation" name="Cache write"  stackId="a" fill="#a855f7" radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
