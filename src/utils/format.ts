/**
 * Format a token count for display.
 * @param precise  true → more decimal places (summaries, tables)
 *                 false (default) → compact (chart axes, tooltips)
 */
export function fmtTokens(n: number, precise = false): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(precise ? 2 : 1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(precise ? 1 : 0)}k`
  return String(n)
}

export function fmtCost(usd: number): string {
  if (!usd || usd === 0) return '—'
  if (usd < 0.001) return '<$0.001'
  return `$${usd.toFixed(3)}`
}
