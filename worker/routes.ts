import { verifyFirebaseToken } from './auth'
import {
  upsertUser, lookupSyncToken, createSyncToken, listSyncTokens, deleteSyncToken,
  insertTokenRecords, upsertSessionMeta, updateSessionCategory,
  queryDailyUsage, queryTotals, queryRequestCategories, querySubagent,
  queryDailyAgentCalls, queryAgentCalls, queryByDimension, querySessions, queryDistinct, queryTickets,
  deleteUserAccount,
  type D1Database, type TokenRecord, type SessionMeta,
} from './db'

interface Env {
  DB: D1Database
  FIREBASE_PROJECT_ID: string
}

type Handler = (req: Request, env: Env, params?: Record<string, string>) => Promise<Response>

// days=0 means "all time"; positive values are clamped to 1–3650
function clampDays(raw: string): number {
  const n = parseInt(raw)
  if (isNaN(n) || n <= 0) return 0
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

  const body = await req.json() as { records?: TokenRecord[]; sessions?: SessionMeta[] }
  const rawRecords = body.records ?? []
  const rawSessions = (body.sessions ?? []).slice(0, 1000)  // defensive cap

  // Sanitize records — drop anything with invalid counts or IDs
  const records = rawRecords
    .filter(r =>
      typeof r.request_id === 'string' && r.request_id.length > 0 && r.request_id.length <= 128 &&
      typeof r.session_id === 'string' && r.session_id.length > 0 &&
      typeof r.input_tokens  === 'number' && r.input_tokens  >= 0 &&
      typeof r.output_tokens === 'number' && r.output_tokens >= 0 &&
      typeof r.cache_read    === 'number' && r.cache_read    >= 0 &&
      typeof r.cache_creation === 'number' && r.cache_creation >= 0
    )
    .map(r => ({
      ...r,
      // Clamp request_category to valid set; unknown/missing values stored as '' (inherits session category)
      request_category: (typeof r.request_category === 'string' && VALID_CATEGORIES.has(r.request_category))
        ? r.request_category
        : '',
    }))

  // Sanitize sessions — clamp to valid categories
  const sessions = rawSessions.map(s => ({
    ...s,
    category: VALID_CATEGORIES.has(s.category) ? s.category : 'other',
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

  const f = { userId: user.uid, days, project, model, machine, category, ticket }
  const [daily, totals, agentCalls, dailyAgentCalls] = await Promise.all([
    queryDailyUsage(env.DB, f),
    queryTotals(env.DB, f),
    queryAgentCalls(env.DB, f),
    queryDailyAgentCalls(env.DB, f),
  ])

  // Previous period for comparison: fetch totals for double window
  const prevF = { ...f, days: days === 0 ? 0 : days * 2 }
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
  const f = { userId: user.uid, days, project, model, machine, ticket }
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
  const f = { userId: user.uid, days, project, model, machine, ticket }
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
  const f = { userId: user.uid, days }

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

  const f = { userId: user.uid, days, project, model, machine, category, ticket }
  const sessions = await querySessions(env.DB, f, limit, offset, sort)
  return json({ sessions })
}

// ─── PATCH /api/sessions/:id/category ────────────────────────────────────────

export const handleUpdateCategory: Handler = async (req, env, params) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const sessionId = params?.id
  if (!sessionId) return err('Missing session id')

  const body = await req.json() as { category?: string }
  if (!body.category) return err('Missing category')
  if (!VALID_CATEGORIES.has(body.category)) return err('Invalid category')

  await updateSessionCategory(env.DB, user.uid, sessionId, body.category)
  return json({ ok: true })
}

// ─── GET /api/filters ─────────────────────────────────────────────────────────

export const handleFilters: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const [projects, models, machines, tickets] = await Promise.all([
    queryDistinct(env.DB, user.uid, 'project'),
    queryDistinct(env.DB, user.uid, 'model'),
    queryDistinct(env.DB, user.uid, 'machine'),
    queryTickets(env.DB, user.uid),
  ])
  return json({ projects, models, machines, tickets })
}

// ─── Sync token management ────────────────────────────────────────────────────

export const handleCreateSyncToken: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const body = await req.json() as { label?: string }
  const label = body.label ?? 'default'
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  await createSyncToken(env.DB, user.uid, token, label)
  return json({ token, label })
}

export const handleListSyncTokens: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const tokens = await listSyncTokens(env.DB, user.uid)
  // Mask token values in list (show only first 8 chars)
  return json({ tokens: tokens.map(t => ({ ...t, token: t.token.slice(0, 8) + '...' })) })
}

export const handleDeleteSyncToken: Handler = async (req, env, params) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const tokenPrefix = params?.prefix
  if (!tokenPrefix) return err('Missing token prefix')

  const tokens = await listSyncTokens(env.DB, user.uid)
  const match = tokens.find(t => t.token.startsWith(tokenPrefix))
  if (!match) return err('Token not found', 404)

  await deleteSyncToken(env.DB, user.uid, match.token)
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

// ─── GET /api/export/csv ──────────────────────────────────────────────────────

export const handleExportCsv: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days = clampDays(url.searchParams.get('days') ?? '30')
  const f = { userId: user.uid, days }

  const sessions = await querySessions(env.DB, f, 10000, 0)

  const headers = ['session_id', 'date', 'machine', 'project', 'model', 'category', 'ticket', 'tokens', 'cost_usd']
  const rows = (sessions as Record<string, unknown>[]).map(s =>
    headers.map(h => JSON.stringify(s[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="aimprint-export.csv"',
    },
  })
}
