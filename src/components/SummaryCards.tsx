import type { Totals } from '../types'
import ComparisonBadge from './ComparisonBadge'
import { fmtTokens } from '../utils/format'

interface Props {
  totals: Totals
  totalsPrev: Totals
}

function fmtCost(usd: number): string {
  if (usd === 0) return '—'
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

interface CardProps {
  label: string
  value: string
  sub?: string
  color?: string
  badge?: React.ReactNode
}

function Card({ label, value, sub, color = 'text-white', badge }: CardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      {badge}
    </div>
  )
}

export default function SummaryCards({ totals, totalsPrev }: Props) {
  // "Active" tokens = tokens requiring real computation (excludes cache reads, which are
  // served cheaply and would otherwise dwarf the number, making it appear static)
  const active     = (totals.input ?? 0) + (totals.output ?? 0) + (totals.cache_creation ?? 0)
  const cacheRead  = totals.cache_read ?? 0
  const grandTotal = active + cacheRead

  const activePrev    = (totalsPrev?.input ?? 0) + (totalsPrev?.output ?? 0) + (totalsPrev?.cache_creation ?? 0)
  const prevActive    = Math.max(0, activePrev - active)
  const prevSessions  = Math.max(0, (totalsPrev?.sessions ?? 0) - (totals.sessions ?? 0))
  const prevCost      = Math.max(0, (totalsPrev?.cost_usd ?? 0) - (totals.cost_usd ?? 0))

  const cacheEfficiency = grandTotal > 0 ? Math.round((cacheRead / grandTotal) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Active tokens"
        value={fmtTokens(active, true)}
        sub={`${fmtTokens(totals.input ?? 0, true)} input · ${fmtTokens(totals.output ?? 0, true)} output · ${fmtTokens(totals.cache_creation ?? 0, true)} cache write`}
        color="text-blue-400"
        badge={<ComparisonBadge current={active} previous={prevActive} />}
      />
      <Card
        label="Sessions"
        value={String(totals.sessions ?? 0)}
        sub={`${totals.requests ?? 0} API requests`}
        badge={<ComparisonBadge current={totals.sessions ?? 0} previous={prevSessions} />}
      />
      <Card
        label="~API cost"
        value={fmtCost(totals.cost_usd ?? 0)}
        sub="Subscription billing differs"
        color="text-green-400"
        badge={<ComparisonBadge current={totals.cost_usd ?? 0} previous={prevCost} />}
      />
      <Card
        label="Cache efficiency"
        value={cacheEfficiency > 0 ? `${cacheEfficiency}%` : '—'}
        sub={`${fmtTokens(cacheRead, true)} tokens served from cache`}
        color="text-amber-400"
      />
    </div>
  )
}
