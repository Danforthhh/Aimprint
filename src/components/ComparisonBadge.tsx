interface Props {
  current: number
  previous: number
  unit?: string
}

export default function ComparisonBadge({ current, previous, unit = '' }: Props) {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const up  = pct >= 0
  const abs = Math.abs(pct)
  if (abs < 0.5) return <span className="text-xs text-gray-500">no change</span>

  return (
    <span className={`text-xs font-medium ${up ? 'text-red-400' : 'text-green-400'}`}>
      {up ? '▲' : '▼'} {abs.toFixed(0)}%{unit ? ` ${unit}` : ''} vs prev period
    </span>
  )
}
