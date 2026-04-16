import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { SubagentItem } from '../types'
import { fmtTokens } from '../utils/format'

interface Props { data: SubagentItem[] }

export default function SubagentChart({ data }: Props) {
  const direct   = data.find(d => d.is_sidechain === 0)
  const sidechain = data.find(d => d.is_sidechain === 1)
  const total    = (direct?.tokens ?? 0) + (sidechain?.tokens ?? 0)
  const sidePct  = total > 0 ? Math.round(((sidechain?.tokens ?? 0) / total) * 100) : 0

  const chartData = [
    { name: 'Direct', value: direct?.tokens ?? 0, color: '#3b82f6' },
    { name: 'Sub-agents', value: sidechain?.tokens ?? 0, color: '#a855f7' },
  ]

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Direct vs sub-agents</h3>
      <p className="text-xs text-gray-600 mb-4">
        {sidePct}% of tokens from sub-agent delegation
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
            {chartData.map(entry => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => fmtTokens(v)}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#9ca3af' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {chartData.map(d => (
          <div key={d.name} className="text-center">
            <p className="text-lg font-bold" style={{ color: d.color }}>{fmtTokens(d.value)}</p>
            <p className="text-xs text-gray-500">{d.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
