// Sanity checks for worker/pricing.ts. Run: npm run check:pricing
import assert from 'node:assert/strict'
import { estimateCost, normalizeModel } from '../worker/pricing.ts'

assert.equal(normalizeModel('claude-haiku-4-5-20251001'), 'claude-haiku-4-5')
assert.equal(normalizeModel('claude-opus-5-5[1m]'), 'claude-opus-5-5')
assert.equal(estimateCost('claude-opus-5-5', 1e6, 1e6, 1e6, 1e6), 29.20)
assert.equal(estimateCost('claude-fable-5-1', 1e6, 0, 1e6, 0), 10.25)

console.log('pricing checks passed')
