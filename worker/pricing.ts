// Estimated API cost per 1M tokens (USD)
// Updated: 2026-09. Subscription billing differs — these are "API equivalent" estimates.

interface ModelPricing {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
}

export const PRICING: Record<string, ModelPricing> = {
  // Cache read on fable-5-1 (0.025x input) and opus-5-5 (0.05x input) is intentionally below the usual 0.1x.
  'claude-fable-5-1':  { input: 10.00, output: 50.00, cacheRead: 0.25,  cacheCreation: 12.50 },
  'claude-fable-5':    { input: 10.00, output: 50.00, cacheRead: 1.00,  cacheCreation: 12.50 },
  'claude-opus-5-5':   { input:  4.00, output: 20.00, cacheRead: 0.20,  cacheCreation:  5.00 },
  'claude-opus-5':     { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-8':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-7':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-6':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-opus-4-5':   { input:  5.00, output: 25.00, cacheRead: 0.50,  cacheCreation:  6.25 },
  'claude-sonnet-5':   { input:  2.00, output: 10.00, cacheRead: 0.20,  cacheCreation:  2.50 },
  'claude-sonnet-4-6': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-sonnet-4-5': { input:  3.00, output: 15.00, cacheRead: 0.30,  cacheCreation:  3.75 },
  'claude-haiku-4-5':  { input:  1.00, output:  5.00, cacheRead: 0.10,  cacheCreation:  1.25 },
}

const DEFAULT_PRICING: ModelPricing = { input: 3.00, output: 15.00, cacheRead: 0.30, cacheCreation: 3.75 }

/** Strips a trailing `[1m]` context suffix and `-YYYYMMDD` date suffix: 'claude-haiku-4-5-20251001' → 'claude-haiku-4-5'. */
export function normalizeModel(model: string): string {
  return model.trim().replace(/\[1m\]$/i, '').trim().replace(/-\d{8}$/, '')
}

export function estimateCost(
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheCreation: number,
): number {
  const id = normalizeModel(model)
  const p = PRICING[id] ?? DEFAULT_PRICING
  if (!(id in PRICING) && model) console.warn(`[pricing] Unknown model "${model}" — using default Sonnet rates`)
  const M = 1_000_000
  return (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheCreation * p.cacheCreation) / M
}
