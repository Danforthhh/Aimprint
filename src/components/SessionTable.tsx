import { useState } from 'react'
import type { Session, Category } from '../types'
import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import { updateSessionCategory } from '../services/api'

interface Props {
  sessions: Session[]
  onCategoryChanged: (sessionId: string, category: Category) => void
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCost(usd: number): string {
  if (!usd || usd === 0) return '—'
  if (usd < 0.001) return '<$0.001'
  return `$${usd.toFixed(3)}`
}

function CategoryBadge({ category, source, sessionId, onChange }: {
  category: Category
  source: string
  sessionId: string
  onChange: (c: Category) => void
}) {
  const [open, setOpen] = useState(false)

  async function pick(c: Category) {
    setOpen(false)
    if (c === category) return
    await updateSessionCategory(sessionId, c)
    onChange(c)
  }

  const color = CATEGORY_COLORS[category] ?? '#6b7280'

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80"
        style={{ borderColor: color, color, backgroundColor: `${color}1a` }}
        title={source === 'manual' ? 'Manually assigned' : 'Auto-classified'}
      >
        {CATEGORY_LABELS[category]}
        {source === 'manual' && <span className="opacity-60">✎</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[160px]">
          {ALL_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => pick(c)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors
                ${c === category ? 'text-white font-medium' : 'text-gray-400'}`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionTable({ sessions, onCategoryChanged }: Props) {
  return (
    <div className="card overflow-hidden">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Recent sessions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Date', 'Project', 'Machine', 'Model', 'Category', 'Ticket', 'Tokens', '~Cost'].map(h => (
                <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.session_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{s.date}</td>
                <td className="py-2 pr-4 text-gray-300 max-w-[120px] truncate" title={s.project}>{s.project}</td>
                <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{s.machine}</td>
                <td className="py-2 pr-4 text-gray-400 whitespace-nowrap text-xs">{s.model?.replace('claude-', '')}</td>
                <td className="py-2 pr-4">
                  <CategoryBadge
                    category={s.category}
                    source={s.category_source}
                    sessionId={s.session_id}
                    onChange={c => onCategoryChanged(s.session_id, c)}
                  />
                </td>
                <td className="py-2 pr-4 text-xs text-blue-400">{s.ticket ?? '—'}</td>
                <td className="py-2 pr-4 font-medium text-blue-300 whitespace-nowrap">{fmtTokens(s.tokens)}</td>
                <td className="py-2 text-green-400 whitespace-nowrap">{fmtCost(s.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">No sessions found for this period</p>
        )}
      </div>
    </div>
  )
}
