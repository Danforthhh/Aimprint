import type { Totals } from '../types'
import ComparisonBadge from './ComparisonBadge'

interface Props {
  totals: Totals
  totalsPrev: Totals
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
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
  const total = (totals.input ?? 0) + (totals.output ?? 0) + (totals.cache_read ?? 0) + (totals.cache_creation ?? 0)
  const totalPrev = (totalsPrev?.input ?? 0) + (totalsPrev?.output ?? 0) + (totalsPrev?.cache_read ?? 0) + (totalsPrev?.cache_creation ?? 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Total tokens"
        value={fmtTokens(total)}
        sub={`${fmtTokens(totals.input ?? 0)} input · ${fmtTokens(totals.output ?? 0)} output`}
        color="text-blue-400"
        badge={<ComparisonBadge current={total} previous={totalPrev / 2} />}
      />
      <Card
        label="Sessions"
        value={String(totals.sessions ?? 0)}
        sub={`${totals.requests ?? 0} API requests`}
        badge={<ComparisonBadge current={totals.sessions ?? 0} previous={(totalsPrev?.sessions ?? 0) / 2} />}
      />
      <Card
        label="~API cost"
        value={fmtCost(totals.cost_usd ?? 0)}
        sub="Subscription billing differs"
        color="text-green-400"
        badge={<ComparisonBadge current={totals.cost_usd ?? 0} previous={(totalsPrev?.cost_usd ?? 0) / 2} />}
      />
      <Card
        label="Cache efficiency"
        value={total > 0 ? `${Math.round(((totals.cache_read ?? 0) / total) * 100)}%` : '—'}
        sub="Tokens served from cache"
        color="text-amber-400"
      />
    </div>
  )
}
