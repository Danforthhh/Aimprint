export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: boolean
  meta: Record<string, unknown>
}

export interface D1ExecResult {
  count: number
  duration: number
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(db: D1Database, userId: string, email: string): Promise<void> {
  await db.prepare(
    'INSERT OR IGNORE INTO users (user_id, email, created_at) VALUES (?, ?, ?)'
  ).bind(userId, email, new Date().toISOString()).run()
}

// ─── Sync tokens ──────────────────────────────────────────────────────────────

export async function lookupSyncToken(db: D1Database, token: string): Promise<string | null> {
  const row = await db.prepare('SELECT user_id FROM sync_tokens WHERE token = ?')
    .bind(token).first<{ user_id: string }>()
  return row?.user_id ?? null
}

export async function createSyncToken(db: D1Database, userId: string, token: string, label: string): Promise<void> {
  await db.prepare(
    'INSERT INTO sync_tokens (token, user_id, label, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, label, new Date().toISOString()).run()
}

export async function listSyncTokens(db: D1Database, userId: string) {
  const result = await db.prepare(
    'SELECT token, label, created_at FROM sync_tokens WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all<{ token: string; label: string; created_at: string }>()
  return result.results
}

export async function deleteSyncToken(db: D1Database, userId: string, token: string): Promise<void> {
  await db.prepare('DELETE FROM sync_tokens WHERE token = ? AND user_id = ?').bind(token, userId).run()
}

// ─── Token usage ──────────────────────────────────────────────────────────────

export interface TokenRecord {
  request_id: string
  session_id: string
  timestamp: string
  date: string
  machine: string
  project: string
  cwd?: string
  model: string
  entrypoint?: string
  git_branch?: string
  ticket?: string
  input_tokens: number
  output_tokens: number
  cache_read: number
  cache_creation: number
  is_sidechain: number
  cost_usd: number
  request_category?: string  // '' = inherit session category at query time
}

export async function insertTokenRecords(
  db: D1Database,
  userId: string,
  records: TokenRecord[],
): Promise<{ inserted: number; skipped: number }> {
  if (records.length === 0) return { inserted: 0, skipped: 0 }

  const stmts = records.map(r =>
    db.prepare(
      `INSERT OR IGNORE INTO token_usage
        (request_id, user_id, session_id, timestamp, date, machine, project, cwd,
         model, entrypoint, git_branch, ticket,
         input_tokens, output_tokens, cache_read, cache_creation, is_sidechain, cost_usd,
         request_category)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      r.request_id, userId, r.session_id, r.timestamp, r.date,
      r.machine, r.project, r.cwd ?? null, r.model, r.entrypoint ?? null,
      r.git_branch ?? null, r.ticket ?? null,
      r.input_tokens, r.output_tokens, r.cache_read, r.cache_creation,
      r.is_sidechain, r.cost_usd,
      r.request_category ?? '',
    )
  )

  const results = await db.batch(stmts)
  const inserted = results.filter(r => r.meta['changes'] as number > 0).length
  return { inserted, skipped: records.length - inserted }
}

// ─── Session meta ─────────────────────────────────────────────────────────────

export interface SessionMeta {
  session_id: string
  category: string
  category_source: string
  first_message?: string
  tool_summary?: string
}

export async function upsertSessionMeta(
  db: D1Database,
  userId: string,
  sessions: SessionMeta[],
): Promise<void> {
  if (sessions.length === 0) return
  const stmts = sessions.map(s =>
    db.prepare(
      `INSERT OR REPLACE INTO session_meta
        (session_id, user_id, category, category_source, first_message, tool_summary, updated_at)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(
      s.session_id, userId, s.category, s.category_source,
      s.first_message ?? null, s.tool_summary ?? null,
      new Date().toISOString(),
    )
  )
  await db.batch(stmts)
}

export async function updateSessionCategory(
  db: D1Database,
  userId: string,
  sessionId: string,
  category: string,
): Promise<void> {
  await db.prepare(
    `UPDATE session_meta SET category = ?, category_source = 'manual', updated_at = ?
     WHERE session_id = ? AND user_id = ?`
  ).bind(category, new Date().toISOString(), sessionId, userId).run()
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface UsageFilters {
  userId: string
  days?: number
  project?: string
  model?: string
  machine?: string
  category?: string
  ticket?: string
}

function buildWhere(f: UsageFilters): { clause: string; bindings: unknown[] } {
  const conditions: string[] = ['tu.user_id = ?']
  const bindings: unknown[] = [f.userId]

  if (f.days && f.days > 0) {
    const since = new Date(Date.now() - f.days * 86400_000).toISOString().slice(0, 10)
    conditions.push('tu.date >= ?')
    bindings.push(since)
  }
  if (f.project && f.project !== 'all') { conditions.push('tu.project = ?'); bindings.push(f.project) }
  if (f.model   && f.model   !== 'all') { conditions.push('tu.model = ?');   bindings.push(f.model) }
  if (f.machine && f.machine !== 'all') { conditions.push('tu.machine = ?'); bindings.push(f.machine) }
  if (f.ticket  && f.ticket  !== 'all') { conditions.push('tu.ticket = ?');  bindings.push(f.ticket) }
  if (f.category && f.category !== 'all') {
    // Note: category filter uses session-level classification (sm.category), not per-request
    // (tu.request_category). This is intentional for /api/usage and /api/sessions — filtering
    // by session type. The category chart itself uses queryRequestCategories for accuracy.
    conditions.push('sm.category = ?')
    bindings.push(f.category)
  }

  return { clause: conditions.join(' AND '), bindings }
}

export async function queryDailyUsage(db: D1Database, f: UsageFilters) {
  const { clause, bindings } = buildWhere(f)
  const join = 'LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id'
  const result = await db.prepare(
    `SELECT tu.date,
            SUM(tu.input_tokens)   AS input,
            SUM(tu.output_tokens)  AS output,
            SUM(tu.cache_read)     AS cache_read,
            SUM(tu.cache_creation) AS cache_creation,
            SUM(tu.cost_usd)       AS cost_usd
     FROM token_usage tu ${join}
     WHERE ${clause}
     GROUP BY tu.date
     ORDER BY tu.date ASC`
  ).bind(...bindings).all()
  return result.results
}

export async function queryTotals(db: D1Database, f: UsageFilters) {
  const { clause, bindings } = buildWhere(f)
  const join = 'LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id'
  const row = await db.prepare(
    `SELECT SUM(tu.input_tokens)   AS input,
            SUM(tu.output_tokens)  AS output,
            SUM(tu.cache_read)     AS cache_read,
            SUM(tu.cache_creation) AS cache_creation,
            SUM(tu.cost_usd)       AS cost_usd,
            COUNT(DISTINCT tu.request_id) AS requests,
            COUNT(DISTINCT tu.session_id) AS sessions
     FROM token_usage tu ${join}
     WHERE ${clause}`
  ).bind(...bindings).first()
  return row
}

/**
 * Per-request category breakdown.
 * Hybrid resolution: when request_category is '' (weak signal), falls back
 * to the session's category from session_meta, then to 'other'.
 * This preserves contextual categories (refinement, deep_analysis, planning)
 * while giving accurate per-request attribution for strong signals.
 */
export async function queryRequestCategories(db: D1Database, f: UsageFilters) {
  const { clause, bindings } = buildWhere(f)
  const result = await db.prepare(
    `SELECT COALESCE(NULLIF(tu.request_category, ''), sm.category, 'other') AS category,
            COUNT(*) AS requests,
            COUNT(DISTINCT tu.session_id) AS sessions,
            SUM(tu.input_tokens + tu.output_tokens + tu.cache_read + tu.cache_creation) AS tokens,
            SUM(tu.cost_usd) AS cost_usd
     FROM token_usage tu
     LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id
     WHERE ${clause}
     GROUP BY COALESCE(NULLIF(tu.request_category, ''), sm.category, 'other')
     ORDER BY tokens DESC`
  ).bind(...bindings).all()
  return result.results
}

export async function querySubagent(db: D1Database, f: UsageFilters) {
  const { clause, bindings } = buildWhere(f)
  const result = await db.prepare(
    `SELECT tu.is_sidechain,
            COUNT(DISTINCT tu.session_id)  AS sessions,
            SUM(tu.input_tokens + tu.output_tokens + tu.cache_read + tu.cache_creation) AS tokens,
            SUM(tu.cost_usd) AS cost_usd
     FROM token_usage tu
     LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id
     WHERE ${clause}
     GROUP BY tu.is_sidechain`
  ).bind(...bindings).all()
  return result.results
}

const DIM_COLUMNS: Record<string, string> = {
  project: 'tu.project',
  model:   'tu.model',
  machine: 'tu.machine',
  ticket:  'tu.ticket',
}

export async function queryByDimension(db: D1Database, f: UsageFilters, dim: 'project' | 'model' | 'machine' | 'ticket') {
  const col = DIM_COLUMNS[dim]
  if (!col) return []
  const { clause, bindings } = buildWhere(f)
  const result = await db.prepare(
    `SELECT ${col} AS label,
            COUNT(DISTINCT tu.session_id) AS sessions,
            SUM(tu.input_tokens + tu.output_tokens + tu.cache_read + tu.cache_creation) AS tokens,
            SUM(tu.cost_usd) AS cost_usd
     FROM token_usage tu
     LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id
     WHERE ${clause} AND ${col} IS NOT NULL AND ${col} != ''
     GROUP BY ${col}
     ORDER BY tokens DESC
     LIMIT 50`
  ).bind(...bindings).all()
  return result.results
}

export async function querySessions(
  db: D1Database,
  f: UsageFilters,
  limit = 50,
  offset = 0,
) {
  const { clause, bindings } = buildWhere(f)
  const result = await db.prepare(
    `SELECT tu.session_id,
            tu.machine,
            tu.project,
            tu.model,
            tu.git_branch,
            tu.ticket,
            tu.date,
            COALESCE(sm.category, 'other')        AS category,
            COALESCE(sm.category_source, 'auto')  AS category_source,
            SUM(tu.input_tokens + tu.output_tokens + tu.cache_read + tu.cache_creation) AS tokens,
            SUM(tu.cost_usd) AS cost_usd
     FROM token_usage tu
     LEFT JOIN session_meta sm ON tu.session_id = sm.session_id AND tu.user_id = sm.user_id
     WHERE ${clause}
     GROUP BY tu.session_id
     ORDER BY MAX(tu.timestamp) DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, limit, offset).all()
  return result.results
}

export async function queryAgentCalls(
  db: D1Database,
  f: UsageFilters,
): Promise<{ agent_calls: number; sessions_with_agents: number }> {
  const conditions: string[] = ['tu.user_id = ?']
  const bindings: unknown[] = [f.userId]

  if (f.days && f.days > 0) {
    const since = new Date(Date.now() - f.days * 86400_000).toISOString().slice(0, 10)
    conditions.push('tu.date >= ?')
    bindings.push(since)
  }
  if (f.project && f.project !== 'all') { conditions.push('tu.project = ?'); bindings.push(f.project) }
  if (f.model   && f.model   !== 'all') { conditions.push('tu.model = ?');   bindings.push(f.model) }
  if (f.machine && f.machine !== 'all') { conditions.push('tu.machine = ?'); bindings.push(f.machine) }

  const where = conditions.join(' AND ')
  const row = await db.prepare(
    `SELECT COALESCE(SUM(CAST(json_extract(sm.tool_summary, '$.agent') AS INTEGER)), 0) AS agent_calls,
            COUNT(CASE WHEN CAST(json_extract(sm.tool_summary, '$.agent') AS INTEGER) > 0 THEN 1 END) AS sessions_with_agents
     FROM (
       SELECT DISTINCT tu.session_id, sm.tool_summary
       FROM token_usage tu
       LEFT JOIN session_meta sm ON sm.session_id = tu.session_id AND sm.user_id = tu.user_id
       WHERE ${where}
     )`
  ).bind(...bindings).first<{ agent_calls: number; sessions_with_agents: number }>()

  return { agent_calls: row?.agent_calls ?? 0, sessions_with_agents: row?.sessions_with_agents ?? 0 }
}

export async function queryDistinct(db: D1Database, userId: string, col: 'project' | 'model' | 'machine') {
  const result = await db.prepare(
    `SELECT DISTINCT ${col} AS val FROM token_usage WHERE user_id = ? AND ${col} IS NOT NULL AND ${col} != '' ORDER BY ${col}`
  ).bind(userId).all<{ val: string }>()
  return result.results.map(r => r.val)
}

export async function queryTickets(db: D1Database, userId: string) {
  const result = await db.prepare(
    `SELECT DISTINCT ticket AS val FROM token_usage WHERE user_id = ? AND ticket IS NOT NULL ORDER BY ticket`
  ).bind(userId).all<{ val: string }>()
  return result.results.map(r => r.val)
}

// ─── Account deletion ─────────────────────────────────────────────────────────

/**
 * Permanently deletes all data for a user: token_usage, session_meta, sync_tokens, and the
 * users row. Runs as a D1 batch so all deletes are applied atomically.
 */
export async function deleteUserAccount(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM token_usage  WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM session_meta WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM sync_tokens  WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users        WHERE user_id = ?').bind(userId),
  ])
}
