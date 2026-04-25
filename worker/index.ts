import {
  handleIngest,
  handleUsage, handleCategories, handleSidechain, handleBreakdown,
  handleSessions, handleUpdateCategory, handleFilters,
  handleCategoryTrend,
  handleCreateSyncToken, handleListSyncTokens, handleDeleteSyncToken,
  handleExportCsv, handleDeleteAccount,
} from './routes'
import type { D1Database } from './db'

interface Env {
  DB: D1Database
  FIREBASE_PROJECT_ID: string
}

const ALLOWED_ORIGINS = [
  'https://danforthhh.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

function corsHeaders(origin: string): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Token',
    'Vary': 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    let response: Response

    // ── Ingest (sync agent) ────────────────────────────────────────────────
    if (method === 'POST' && path === '/ingest') {
      response = await handleIngest(request, env)
    }

    // ── Dashboard API ──────────────────────────────────────────────────────
    else if (method === 'GET'  && path === '/api/usage')            response = await handleUsage(request, env)
    else if (method === 'GET'  && path === '/api/categories')       response = await handleCategories(request, env)
    else if (method === 'GET'  && path === '/api/category-trend')   response = await handleCategoryTrend(request, env)
    else if (method === 'GET'  && path === '/api/sidechain')        response = await handleSidechain(request, env)
    else if (method === 'GET'  && path === '/api/filters')     response = await handleFilters(request, env)
    else if (method === 'GET'  && path === '/api/export/csv')  response = await handleExportCsv(request, env)

    // /api/breakdown/:dim
    else {
      const breakdownMatch = path.match(/^\/api\/breakdown\/(project|model|machine|ticket)$/)
      if (method === 'GET' && breakdownMatch) {
        response = await handleBreakdown(request, env, { dim: breakdownMatch[1] })
      }

      // /api/sessions
      else if (method === 'GET' && path === '/api/sessions') {
        response = await handleSessions(request, env)
      }

      // /api/sessions/:id/category  (PATCH)
      else {
        const sessionCatMatch = path.match(/^\/api\/sessions\/([^/]+)\/category$/)
        if (method === 'PATCH' && sessionCatMatch) {
          response = await handleUpdateCategory(request, env, { id: sessionCatMatch[1] })
        }

        // ── Sync token management ──────────────────────────────────────────
        else if (method === 'POST'   && path === '/api/sync-tokens') response = await handleCreateSyncToken(request, env)
        else if (method === 'GET'    && path === '/api/sync-tokens') response = await handleListSyncTokens(request, env)
        // ── Account management ─────────────────────────────────────────────
        else if (method === 'DELETE' && path === '/api/account')     response = await handleDeleteAccount(request, env)
        else {
          const deleteTokenMatch = path.match(/^\/api\/sync-tokens\/([^/]+)$/)
          if (method === 'DELETE' && deleteTokenMatch) {
            response = await handleDeleteSyncToken(request, env, { prefix: deleteTokenMatch[1] })
          } else {
            response = new Response('Not found', { status: 404 })
          }
        }
      }
    }

    // Attach CORS headers to every response
    const cors = corsHeaders(origin)
    const newHeaders = new Headers(response.headers)
    for (const [k, v] of Object.entries(cors)) newHeaders.set(k, v)
    return new Response(response.body, { status: response.status, headers: newHeaders })
  },
}
