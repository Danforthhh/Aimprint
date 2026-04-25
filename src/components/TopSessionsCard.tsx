import type { Session } from '../types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import { fmtTokens, fmtCost } from '../utils/format'

interface Props {
  sessions: Session[]
}

export default function TopSessionsCard({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Top sessions by cost</h3>
        <p className="text-sm text-gray-600 text-center py-6">No session data for this period</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Top sessions by cost</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['#', 'Date', 'Project', 'Category', 'Tokens', '~Cost'].map(h => (
                <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const color = CATEGORY_COLORS[s.category] ?? '#6b7280'
              return (
                <tr key={s.session_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 text-xs text-gray-600 font-mono">{i + 1}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">{s.date}</td>
                  <td className="py-2 pr-4 text-xs text-gray-300 max-w-[140px] truncate" title={s.project}>
                    {s.project}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-300 whitespace-nowrap font-medium">
                    {fmtTokens(s.tokens, true)}
                  </td>
                  <td className="py-2 text-xs text-gray-400 whitespace-nowrap">
                    {fmtCost(s.cost_usd)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
