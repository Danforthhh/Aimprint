// Estimated API cost per 1M tokens (USD)
// Updated: 2026-06. Subscription billing differs — these are "API equivalent" estimates.

interface ModelPricing {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
}

const PRICING: Record<string, ModelPricing> = {
  'claude-fable-5':    { input: 10.00, output: 50.00, cacheRead: 1.00,  cacheCreation: 12.50 },
  'claude-opus-4-8':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-7':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-6':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-5':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-sonnet-4-5': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-haiku-4-5':  { input:  1.00, output:  5.00, cacheRead: 0.10,  cacheCreation:  1.25 },
}

const DEFAULT_PRICING: ModelPricing = { input: 3.00, output: 15.00, cacheRead: 0.30, cacheCreation: 3.75 }

export function estimateCost(
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheCreation: number,
): number {
  const p = PRICING[model] ?? DEFAULT_PRICING
  if (!(model in PRICING) && model) console.warn(`[pricing] Unknown model "${model}" — using default Sonnet rates`)
  const M = 1_000_000
  return (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheCreation * p.cacheCreation) / M
}
