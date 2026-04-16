import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { CategoryItem } from '../types'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_DESCRIPTIONS } from '../types'

interface Props { data: CategoryItem[] }

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function CategoryChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.tokens, 0)
  const sorted = [...data].sort((a, b) => b.tokens - a.tokens)

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">By work type</h3>
      <div className="space-y-2 mb-4">
        {sorted.map(item => {
          const pct = total > 0 ? (item.tokens / total) * 100 : 0
          const color = CATEGORY_COLORS[item.category] ?? '#6b7280'
          return (
            <div key={item.category} className="group relative">
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-0 bottom-full mb-2 z-10 hidden group-hover:block w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-xs font-medium text-white mb-0.5">{CATEGORY_LABELS[item.category]}</p>
                <p className="text-xs text-gray-400 mb-1">{CATEGORY_DESCRIPTIONS[item.category].summary}</p>
                <p className="text-xs text-gray-500 italic">{CATEGORY_DESCRIPTIONS[item.category].examples}</p>
              </div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 cursor-help">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm text-gray-300">{CATEGORY_LABELS[item.category]}</span>
                  <span className="text-gray-600 text-xs">?</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{item.sessions} sessions</span>
                  <span className="text-gray-300 font-medium">{fmtTokens(item.tokens)}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis type="number" tickFormatter={fmtTokens} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="category" tickFormatter={c => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            formatter={(v: number) => fmtTokens(v)}
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Bar dataKey="tokens" radius={[0,3,3,0]}>
            {sorted.map(item => (
              <Cell key={item.category} fill={CATEGORY_COLORS[item.category] ?? '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
