import { verifyFirebaseToken } from './auth'
import {
  upsertUser, lookupSyncToken, createSyncToken, listSyncTokens, deleteSyncToken,
  insertTokenRecords, upsertSessionMeta, updateSessionCategory,
  queryDailyUsage, queryTotals, queryCategories, querySubagent,
  queryByDimension, querySessions, queryDistinct, queryTickets,
  type D1Database, type TokenRecord, type SessionMeta,
} from './db'

interface Env {
  DB: D1Database
  FIREBASE_PROJECT_ID: string
}

type Handler = (req: Request, env: Env, params?: Record<string, string>) => Promise<Response>

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
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
  const records = body.records ?? []
  const sessions = body.sessions ?? []

  const { inserted, skipped } = await insertTokenRecords(env.DB, userId, records)
  await upsertSessionMeta(env.DB, userId, sessions)

  return json({ inserted, skipped })
}

// ─── GET /api/usage ───────────────────────────────────────────────────────────

export const handleUsage: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days   = parseInt(url.searchParams.get('days') ?? '30')
  const project  = url.searchParams.get('project') ?? 'all'
  const model    = url.searchParams.get('model') ?? 'all'
  const machine  = url.searchParams.get('machine') ?? 'all'
  const category = url.searchParams.get('category') ?? 'all'
  const ticket   = url.searchParams.get('ticket') ?? 'all'

  const f = { userId: user.uid, days, project, model, machine, category, ticket }
  const [daily, totals] = await Promise.all([queryDailyUsage(env.DB, f), queryTotals(env.DB, f)])

  // Previous period for comparison: fetch totals for double window
  const prevF = { ...f, days: days * 2 }
  const totalsPrev = await queryTotals(env.DB, prevF)

  return json({ daily, totals, totalsPrev })
}

// ─── GET /api/categories ──────────────────────────────────────────────────────

export const handleCategories: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') ?? '30')
  const f = { userId: user.uid, days }
  const categories = await queryCategories(env.DB, f)
  return json({ categories })
}

// ─── GET /api/sidechain ───────────────────────────────────────────────────────

export const handleSidechain: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') ?? '30')
  const f = { userId: user.uid, days }
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
  const days = parseInt(url.searchParams.get('days') ?? '30')
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
  const days     = parseInt(url.searchParams.get('days') ?? '30')
  const project  = url.searchParams.get('project') ?? 'all'
  const model    = url.searchParams.get('model') ?? 'all'
  const machine  = url.searchParams.get('machine') ?? 'all'
  const category = url.searchParams.get('category') ?? 'all'
  const ticket   = url.searchParams.get('ticket') ?? 'all'
  const limit    = parseInt(url.searchParams.get('limit') ?? '50')
  const offset   = parseInt(url.searchParams.get('offset') ?? '0')

  const f = { userId: user.uid, days, project, model, machine, category, ticket }
  const sessions = await querySessions(env.DB, f, limit, offset)
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

// ─── GET /api/export/csv ──────────────────────────────────────────────────────

export const handleExportCsv: Handler = async (req, env) => {
  const user = await requireFirebaseAuth(req, env)
  if (user instanceof Response) return user

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') ?? '30')
  const f = { userId: user.uid, days }

  const sessions = await querySessions(env.DB, f, 1000, 0)

  const headers = ['session_id', 'date', 'machine', 'project', 'model', 'category', 'ticket', 'tokens', 'cost_usd']
  const rows = (sessions as Record<string, unknown>[]).map(s =>
    headers.map(h => JSON.stringify(s[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="aimprint-export.csv"',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
