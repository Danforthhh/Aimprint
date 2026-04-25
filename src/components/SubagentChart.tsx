import type { SubagentItem } from '../types'
import { fmtTokens } from '../utils/format'

interface Props { data: SubagentItem[] }

export default function SubagentChart({ data }: Props) {
  const direct    = data.find(d => d.is_sidechain === 0)
  const sidechain = data.find(d => d.is_sidechain === 1)
  const total     = (direct?.tokens ?? 0) + (sidechain?.tokens ?? 0)
  const sidePct   = total > 0 ? Math.round(((sidechain?.tokens ?? 0) / total) * 100) : 0
  const buggy     = (sidechain?.tokens ?? 0) === 0

  const items = [
    { name: 'Direct',     value: direct?.tokens    ?? 0, sessions: direct?.sessions    ?? 0, color: '#3b82f6' },
    { name: 'Sub-agents', value: sidechain?.tokens ?? 0, sessions: sidechain?.sessions ?? 0, color: '#a855f7' },
  ]

  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Direct vs sub-agents</h3>
        <p className="text-xs text-gray-600">{sidePct}% of tokens from sub-agent delegation</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(d => (
          <div key={d.name} className="bg-gray-800 rounded-lg p-3">
            <p className="text-lg font-bold" style={{ color: d.color }}>{fmtTokens(d.value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{d.name}</p>
            <p className="text-xs text-gray-600">{d.sessions} session{d.sessions !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
      {buggy && (
        <p className="text-xs text-amber-600">
          ⚠ Sub-agents shows 0 — Claude Code does not currently write <code className="text-amber-500">isSidechain: true</code> in session logs. This breakdown will be accurate once the bug is fixed upstream.
        </p>
      )}
    </div>
  )
}
