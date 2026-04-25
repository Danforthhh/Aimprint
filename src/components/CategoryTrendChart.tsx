import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import type { CategoryTrendPoint } from '../types'
import { fmtTokens } from '../utils/format'

interface RawPoint {
  week: string
  category: string
  tokens: number
  cost_usd: number
}

interface Props {
  data: RawPoint[]
}

export default function CategoryTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Token usage by work type (weekly)
        </h3>
        <p className="text-sm text-gray-600 text-center py-6">No data for this period</p>
      </div>
    )
  }

  // Pivot raw rows into recharts-friendly shape: { week, code_writing: N, planning: N, ... }
  const map = new Map<string, CategoryTrendPoint>()
  for (const row of data) {
    if (!map.has(row.week)) map.set(row.week, { week: row.week })
    map.get(row.week)![row.category] = row.tokens
  }
  const chartData = Array.from(map.values())

  // Only render bars for categories that actually appear — keeps legend clean
  const presentCategories = ALL_CATEGORIES.filter(cat =>
    data.some(r => r.category === cat)
  )

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Token usage by work type (weekly)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={w => String(w).slice(5)}  // "2025-W17" → "W17"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={n => fmtTokens(Number(n))}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value: unknown, name: string) => [
              fmtTokens(Number(value), true),
              CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS] ?? name,
            ]}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#9ca3af' }}
          />
          <Legend
            formatter={name => CATEGORY_LABELS[name as keyof typeof CATEGORY_LABELS] ?? name}
            wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
          />
          {presentCategories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              fill={CATEGORY_COLORS[cat]}
              radius={i === presentCategories.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
