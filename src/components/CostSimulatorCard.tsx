import { useState } from 'react'
import type { CategoryItem } from '../types'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types'

interface Props {
  totalCostUsd: number
  categories: CategoryItem[]
}

function fmtCost(usd: number): string {
  if (usd === 0) return '—'
  if (usd < 0.01) return '<$0.01'
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`
  return `$${usd.toFixed(2)}`
}

export default function CostSimulatorCard({ totalCostUsd, categories }: Props) {
  const [multiplier, setMultiplier] = useState(1)

  const simTotal = totalCostUsd * multiplier
  const sorted = [...categories].sort((a, b) => b.cost_usd - a.cost_usd)
  const maxCost = sorted[0]?.cost_usd ?? 1

  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Cost simulator</h3>
        <p className="text-xs text-gray-600">What if tokens cost more? Slide to project future spend.</p>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={multiplier}
          onChange={e => setMultiplier(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <span className="text-sm font-bold text-white w-10 text-right">{multiplier}×</span>
      </div>

      {/* Hero total */}
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${multiplier > 1 ? 'text-red-400' : 'text-green-400'}`}>
          {fmtCost(simTotal)}
        </span>
        {multiplier > 1 && (
          <span className="text-xs text-gray-500">vs {fmtCost(totalCostUsd)} actual</span>
        )}
      </div>

      {/* Per-category breakdown */}
      <div className="space-y-2">
        {sorted.map(item => {
          const simCost = item.cost_usd * multiplier
          const barPct = maxCost > 0 ? (item.cost_usd / maxCost) * 100 : 0
          const color = CATEGORY_COLORS[item.category] ?? '#6b7280'
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-400">{CATEGORY_LABELS[item.category]}</span>
                </div>
                <span className={`text-xs font-medium ${multiplier > 1 ? 'text-red-400' : 'text-gray-300'}`}>
                  {fmtCost(simCost)}
                </span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.6 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
