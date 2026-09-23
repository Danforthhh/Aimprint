// Generates worker/reprice.sql: recomputes usage_rollup.cost_usd from the current PRICING table.
// Usage: npx tsx scripts/reprice.ts [model ...]   (default: every model in PRICING)
// Only usage_rollup is repriced — raw token_usage.cost_usd is no longer read by any dashboard query.
import { writeFileSync } from 'node:fs'
import { PRICING } from '../worker/pricing.ts'

const models = process.argv.slice(2)
const ids = models.length > 0 ? models : Object.keys(PRICING)

const sql = ids.map(id => {
  const p = PRICING[id]
  if (!p || !/^[\w.-]+$/.test(id)) throw new Error(`Unknown model "${id}" — must be a key of PRICING`)
  // Stored model ids are raw from the logs; also match the date-suffixed and [1m] forms normalizeModel strips.
  // D1 caps GLOB patterns at 50 bytes, so the date suffix is matched on substr() rather than one long pattern.
  // ponytail: a combined "-YYYYMMDD[1m]" form is not matched; add it if it ever shows up in the data.
  const dated = `(substr(model, 1, ${id.length + 1}) = '${id}-' AND substr(model, ${id.length + 2}) GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')`
  return `UPDATE usage_rollup SET cost_usd = (input_tokens*${p.input} + output_tokens*${p.output} + cache_read*${p.cacheRead} + cache_creation*${p.cacheCreation}) / 1000000.0 ` +
    `WHERE model = '${id}' OR model = '${id}[1m]' OR ${dated};`
})

writeFileSync('worker/reprice.sql', sql.join('\n') + '\n')
console.log(sql.join('\n'))
console.log('\nWrote worker/reprice.sql. Apply with:')
console.log('  npx wrangler d1 execute aimprint-db --remote --config worker/wrangler.toml --file worker/reprice.sql')
