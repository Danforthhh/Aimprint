// Estimated API cost per 1M tokens (USD)
// Updated: 2025. Subscription billing differs — these are "API equivalent" estimates.

interface ModelPricing {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
}

const PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6':   { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheCreation: 18.75 },
  'claude-opus-4-5':   { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheCreation: 18.75 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-sonnet-4-5': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-haiku-4-5':  { input:  0.80, output:  4.00, cacheRead: 0.08,  cacheCreation:  1.00 },
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
  const M = 1_000_000
  return (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheCreation * p.cacheCreation) / M
}
