import { verifyFirebaseToken } from './auth'
import { estimateCost } from './pricing'
import {
  upsertUser, lookupSyncToken, createSyncToken, listSyncTokens, deleteSyncToken,
  insertTokenRecords, upsertSessionMeta, updateSessionCategory,
  queryDailyUsage, queryTotals, queryRequestCategories, querySubagent,
  queryDailyAgentCalls, queryAgentCalls, queryByDimension, querySessions, queryDistinct, queryTickets,
  queryCategoryTrend, listAllUsers,
  deleteUserAccount,
  type D1Database, type TokenRecord, type SessionMeta, type UsageFilters,
} from './db'

interface Env {
  DB: D1Database
  FIREBASE_PROJECT_ID: string
  ADMIN_EMAIL: string
}

type Handler = (req: Request, env: Env, params?: Record<string, string>) => Promise<Response>

// days=0 means "all time"; positive values are clamped to 1–3650; invalid/negative → default
function clampDays(raw: string, def = 30): number {
  const n = parseInt(raw)
  if (isNaN(n) || n < 0) return def
  if (n === 0) return 0
  return Math.min(n, 3650)
}

function clampLimit(raw: string, def = 50): number {
  const n = parseInt(raw)
  if (isNaN(n) || n <= 0) return def
  return Math.min(n, 500)
}

const VALID_CATEGORIES = new Set([
  'code_writing', 'code_process', 'quality', 'deep_analysis',
  'refinement', 'planning', 'document_writing', 'random', 'other',
])

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status)
}

// If the requester is the admin and a ?viewAs=<userId> param is present, return that
// userId instead of the requester's own uid. Non-admins always get their own uid.
function resolveUserId(
  user: { uid: string; email: string },
  url: URL,
  adminEmail: string,
): string {
  if (user.email === adminEmail) {
    const viewAs = url.searchParams.get('viewAs')
    if (viewAs && viewAs.length > 0) return viewAs
  }
  return user.uid
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function requireFirebaseAuth(req: Request, env: Env): Promise<{ uid: string; email: string } | Response> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return err('Unauthorized', 401)

  const user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID)
  if (!user) return err('Invalid token', 401)

  await upsertUser(env.DB, user.uid, user.email)
  return user
}

async function requireSyncToken(req: Request, env: Env): Promise<string | Response> {
  const token = req.headers.get('X-Sync-Token') ?? ''
  if (!token) return err('Missing X-Sync-Token', 401)

  const userId = await lookupSyncToken(env.DB, token)
  if (!userId) return err('Invalid sync token', 401)
  return userId
}

// ─── POST /ingest ─────────────────────────────────────────────────────────────

export const handleIngest: Handler = async (req, env) => {
  const userIdOrErr = await requireSyncToken(req, env)
  if (userIdOrErr instanceof Response) return userIdOrErr
  const userId = userIdOrErr

  let body: { records?: TokenRecord[]; sessions?: SessionMeta[] }
  try {
    body = await req.json() as { records?: TokenRecord[]; sessions?: SessionMeta[] }
  } catch {
    return err('Invalid JSON body', 400)
  }
  const rawRecords = (body.records ?? []).slice(0, 1000)
  const rawSessions = (body.sessions ?? []).slice(0, 1000)

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const ISO_TS_RE   = /^\d{4}-\d{2}-\d{2}T[\d:.Z+\-]+$/

  // Sanitize records — drop anything with invalid counts, IDs, or date formats
  const records = rawRecords
    .filter(r =>
      typeof r.request_id === 'string' && r.request_id.length > 0 && r.request_id.length <= 128 &&
      typeof r.session_id === 'string' && r.session_id.length > 0 && r.session_id.length <= 256 &&
      typeof r.date       === 'string' && ISO_DATE_RE.test(r.date) &&
      typeof r.timestamp  === 'string' && ISO_TS_RE.test(r.timestamp) &&
      typeof r.input_tokens  === 'number' && r.input_tokens  >= 0 &&
      typeof r.output_tokens === 'number' && r.output_tokens >= 0 &&
      typeof r.cache_read    === 'number' && r.cache_read    >= 0 &&
      typeof r.cache_creation === 'number' && r.cache_creation >= 0
    )
    .map(r => ({
      request_id:       r.request_id,
      session_id:       r.session_id,
      timestamp:        r.timestamp,
      date:             r.date,
      machine:          typeof r.machine    === 'string' ? r.machine.slice(0, 128)   : '',
      project:          typeof r.project    === 'string' ? r.project.slice(0, 256)   : '',
      cwd:              typeof r.cwd        === 'string' ? r.cwd.slice(0, 512)        : undefined,
      model:            typeof r.model      === 'string' ? r.model.slice(0, 128)     : '',
      entrypoint:       typeof r.entrypoint === 'string' ? r.entrypoint.slice(0, 256): undefined,
      git_branch:       typeof r.git_branch === 'string' ? r.git_branch.slice(0, 256): undefined,
      ticket:           typeof r.ticket     === 'string' ? r.ticket.slice(0, 64)     : undefined,
      input_tokens:     r.input_tokens,
      output_tokens:    r.output_tokens,
      cache_read:       r.cache_read,
      cache_creation:   r.cache_creation,
      // recompute server-side — never trust client-supplied cost
      cost_usd:         estimateCost(typeof r.model === 'string' ? r.model : '', r.input_tokens, r.output_tokens, r.cache_read, r.cache_creation),
      is_sidechain:     r.is_sidechain ? 1 : 0,
      // Clamp request_category to valid set; unknown/missing values stored as '' (inherits session category)
      request_category: (typeof r.request_category === 'string' && VALID_CATEGORIES.has(r.request_category))
        ? r.request_category
        : '',
    }))

  // Sanitize sessions — clamp to valid categories, bound free-text fields
  const sessions = rawSessions.map(s => ({
    ...s,
    category: VALID_CATEGORIES.has(s.category) ? s.category : 'other',
    first_message: typeof s.first_message === 'string' ? s.first_message.slice(0, 500) : undefined,
    tool_summary: (() => {
      if (typeof s.tool_summary !== 'string') return undefined
      try { JSON.parse(s.tool_summary); return s.tool_summary.slice(0, 1000) } catch { return undefined }
    })(),
  }))

  const { inserted, skipped } = await insertTokenRecords(env.DB, userId, records)
  await upsertSessionMeta(env.DB, userId, sessions)

  return json({ inserted, skipped })
}

// ─── GET /api/usage ───────────────────────────────────────────────────────────

export const handleUsage: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days   = clampDays(url.searchParams.get('days') ?? '30')
  const project  = url.searchParams.get('project') ?? 'all'
  const model    = url.searchParams.get('model') ?? 'all'
  const machine  = url.searchParams.get('machine') ?? 'all'
  const category = url.searchParams.get('category') ?? 'all'
  const ticket   = url.searchParams.get('ticket') ?? 'all'

  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days, project, model, machine, category, ticket }
  const [daily, totals, agentCalls, dailyAgentCalls] = await Promise.all([
    queryDailyUsage(env.DB, f),
    queryTotals(env.DB, f),
    queryAgentCalls(env.DB, f),
    queryDailyAgentCalls(env.DB, f),
  ])

  // Previous period: the equivalent window immediately before the current one.
  // e.g. days=7 → prev covers [now-14d, now-7d), not [now-14d, now).
  const prevF: UsageFilters = days === 0 ? { ...f, days: 0 } : {
    ...f,
    days: days * 2,
    until: new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10),
  }
  const totalsPrev = await queryTotals(env.DB, prevF)

  return json({ daily, totals, totalsPrev, agent_calls: agentCalls.agent_calls, sessions_with_agents: agentCalls.sessions_with_agents, daily_agent_calls: dailyAgentCalls })
}

// ─── GET /api/categories ──────────────────────────────────────────────────────

export const handleCategories: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days    = clampDays(url.searchParams.get('days') ?? '30')
  const project = url.searchParams.get('project') ?? 'all'
  const model   = url.searchParams.get('model')   ?? 'all'
  const machine = url.searchParams.get('machine') ?? 'all'
  const ticket  = url.searchParams.get('ticket')  ?? 'all'
  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days, project, model, machine, ticket }
  const categories = await queryRequestCategories(env.DB, f)
  return json({ categories })
}

// ─── GET /api/sidechain ───────────────────────────────────────────────────────

export const handleSidechain: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days    = clampDays(url.searchParams.get('days') ?? '30')
  const project = url.searchParams.get('project') ?? 'all'
  const model   = url.searchParams.get('model')   ?? 'all'
  const machine = url.searchParams.get('machine') ?? 'all'
  const ticket  = url.searchParams.get('ticket')  ?? 'all'
  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days, project, model, machine, ticket }
  const data = await querySubagent(env.DB, f)
  return json({ data })
}

// ─── GET /api/breakdown/:dim ──────────────────────────────────────────────────

export const handleBreakdown: Handler = async (req, env, params) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const dim = params?.dim as 'project' | 'model' | 'machine' | 'ticket'
  if (!['project', 'model', 'machine', 'ticket'].includes(dim)) return err('Invalid dimension')

  const url = new URL(req.url)
  const days = clampDays(url.searchParams.get('days') ?? '30')
  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days }

  if (dim === 'ticket') {
    const data = await queryByDimension(env.DB, f, 'ticket')
    return json({ data })
  }
  const data = await queryByDimension(env.DB, f, dim)
  return json({ data })
}

// ─── GET /api/sessions ────────────────────────────────────────────────────────

export const handleSessions: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days     = clampDays(url.searchParams.get('days') ?? '30')
  const project  = url.searchParams.get('project') ?? 'all'
  const model    = url.searchParams.get('model') ?? 'all'
  const machine  = url.searchParams.get('machine') ?? 'all'
  const category = url.searchParams.get('category') ?? 'all'
  const ticket   = url.searchParams.get('ticket') ?? 'all'
  const limit    = clampLimit(url.searchParams.get('limit') ?? '50')
  const offset   = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0') || 0)
  const sortRaw  = url.searchParams.get('sort') ?? 'recent'
  const sort     = sortRaw === 'cost_desc' ? 'cost_desc' : 'recent'

  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days, project, model, machine, category, ticket }
  const sessions = await querySessions(env.DB, f, limit, offset, sort)
  return json({ sessions })
}

// ─── PATCH /api/sessions/:id/category ────────────────────────────────────────

export const handleUpdateCategory: Handler = async (req, env, params) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  // Admin mode is read-only — block writes when impersonating another user
  const url = new URL(req.url)
  if (resolveUserId(user, url, env.ADMIN_EMAIL) !== user.uid) {
    return err('Read-only in admin view', 403)
  }

  const sessionId = params?.id
  if (!sessionId || sessionId.length > 128) return err('Invalid session id')

  let body: { category?: string }
  try {
    body = await req.json() as { category?: string }
  } catch {
    return err('Invalid JSON body', 400)
  }
  if (!body.category) return err('Missing category')
  if (!VALID_CATEGORIES.has(body.category)) return err('Invalid category')

  await updateSessionCategory(env.DB, user.uid, sessionId, body.category)
  return json({ ok: true })
}

// ─── GET /api/filters ─────────────────────────────────────────────────────────

export const handleFilters: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const effectiveUserId = resolveUserId(user, new URL(req.url), env.ADMIN_EMAIL)
  const [projects, models, machines, tickets] = await Promise.all([
    queryDistinct(env.DB, effectiveUserId, 'project'),
    queryDistinct(env.DB, effectiveUserId, 'model'),
    queryDistinct(env.DB, effectiveUserId, 'machine'),
    queryTickets(env.DB, effectiveUserId),
  ])
  return json({ projects, models, machines, tickets })
}

// ─── Sync token management ────────────────────────────────────────────────────

export const handleCreateSyncToken: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const existing = await listSyncTokens(env.DB, user.uid)
  if (existing.length >= 20) return err('Maximum 20 sync tokens per account', 429)

  const body = await req.json() as { label?: string }
  const raw = typeof body.label === 'string' ? body.label.trim() : ''
  if (!raw) return err('Label is required', 400)
  const label = raw.slice(0, 64)
  if (!/^[\x20-\x7E]+$/.test(label) || /[<>&"']/.test(label)) {
    return err('Label must contain only printable ASCII characters (no < > & " \')', 400)
  }
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  await createSyncToken(env.DB, user.uid, token, label)
  return json({ token, label })
}

export const handleListSyncTokens: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const tokens = await listSyncTokens(env.DB, user.uid)
  return json({ tokens: tokens.map(t => ({ ...t, token: t.token + '...' })) })
}

export const handleDeleteSyncToken: Handler = async (req, env, params) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const id = params?.prefix
  if (!id || id.length < 8 || id.length > 64) return err('Invalid token identifier')

  await deleteSyncToken(env.DB, user.uid, id)
  return json({ ok: true })
}

// ─── DELETE /api/account ──────────────────────────────────────────────────────

/**
 * Permanently deletes all data for the authenticated user from D1.
 * The client (SettingsModal) is responsible for then calling Firebase deleteUser()
 * to remove the Auth identity. Two-step ensures D1 data is always cleaned up
 * even if the Firebase call fails on the client side.
 */
export const handleDeleteAccount: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  await deleteUserAccount(env.DB, user.uid)
  return json({ ok: true })
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export const handleAdminUsers: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user
  if (user.email !== env.ADMIN_EMAIL) return err('Forbidden', 403)
  const users = await listAllUsers(env.DB)
  return json({ users })
}

// ─── GET /api/category-trend ─────────────────────────────────────────────────

export const handleCategoryTrend: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days    = clampDays(url.searchParams.get('days') ?? '30')
  const project = url.searchParams.get('project') ?? 'all'
  const model   = url.searchParams.get('model')   ?? 'all'
  const machine = url.searchParams.get('machine') ?? 'all'
  const ticket  = url.searchParams.get('ticket')  ?? 'all'
  // Deliberately NOT filtering by category — the trend shows all categories
  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days, project, model, machine, ticket }
  const data = await queryCategoryTrend(env.DB, f)
  return json({ data })
}

// ─── GET /api/export/csv ──────────────────────────────────────────────────────

export const handleExportCsv: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const rawDays = clampDays(url.searchParams.get('days') ?? '30')
  if (rawDays === 0) return err('days parameter is required and must be > 0 for CSV export', 400)
  const f = { userId: resolveUserId(user, url, env.ADMIN_EMAIL), days: rawDays }

  const CAP = 2000
  const sessions = await querySessions(env.DB, f, CAP, 0)
  const truncated = sessions.length >= CAP

  const headers = ['session_id', 'date', 'machine', 'project', 'model', 'category', 'ticket', 'tokens', 'cost_usd']
  const rows = (sessions as Record<string, unknown>[]).map(s =>
    headers.map(h => JSON.stringify(s[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="aimprint-export.csv"',
      'Cache-Control': 'no-store',
      ...(truncated ? { 'X-Truncated': 'true', 'X-Row-Cap': String(CAP) } : {}),
    },
  })
}
