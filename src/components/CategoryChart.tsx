import type { CategoryItem } from '../types'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_DESCRIPTIONS } from '../types'
import { fmtTokens, fmtCost } from '../utils/format'

interface Props { data: CategoryItem[] }

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
                  <span>{item.requests ?? item.sessions} requests</span>
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
              {item.sessions > 0 && (
                <div className="flex gap-3 mt-0.5 text-xs text-gray-600">
                  <span>{fmtTokens(Math.round(item.tokens / item.sessions), true)} / session</span>
                  <span>{fmtCost(item.cost_usd / item.sessions)} / session</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
