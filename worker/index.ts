import {
  handleIngest,
  handleUsage, handleCategories, handleSidechain, handleBreakdown,
  handleSessions, handleUpdateCategory, handleFilters,
  handleCategoryTrend,
  handleCreateSyncToken, handleListSyncTokens, handleDeleteSyncToken,
  handleExportCsv, handleDeleteAccount, handleAdminUsers,
} from './routes'
import type { D1Database } from './db'

interface Env {
  DB: D1Database
  FIREBASE_PROJECT_ID: string
  ADMIN_EMAIL: string
}

const ALLOWED_ORIGINS = [
  'https://danforthhh.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

function corsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Token',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store, no-cache',
    'Content-Security-Policy': "default-src 'none'",
    'Strict-Transport-Security': 'max-age=31536000',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
  // Only reflect the origin for known-allowed origins — unlisted origins get no ACAO header,
  // which causes browsers to block cross-origin reads (correct behaviour).
  if (ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.FIREBASE_PROJECT_ID) {
      return new Response('Worker misconfigured: missing FIREBASE_PROJECT_ID', { status: 500 })
    }
    const origin = request.headers.get('Origin') ?? ''

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    try {
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

          // ── Admin ──────────────────────────────────────────────────────────
          else if (method === 'GET'    && path === '/api/admin/users')  response = await handleAdminUsers(request, env)
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
    } catch (e) {
      console.error('Unhandled Worker error:', e)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      })
    }
  },
}
