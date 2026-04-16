import {
  handleIngest,
  handleUsage, handleCategories, handleSidechain, handleBreakdown,
  handleSessions, handleUpdateCategory, handleFilters,
  handleCreateSyncToken, handleListSyncTokens, handleDeleteSyncToken,
  handleExportCsv,
} from './routes'

interface Env {
  DB: {
    prepare(query: string): { bind(...v: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> } }
    batch(stmts: unknown[]): Promise<{ meta: Record<string, unknown> }[]>
    exec(q: string): Promise<unknown>
  }
  FIREBASE_PROJECT_ID: string
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Token',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // ── Ingest (sync agent) ────────────────────────────────────────────────
    if (method === 'POST' && path === '/ingest') return handleIngest(request, env)

    // ── Dashboard API ──────────────────────────────────────────────────────
    if (method === 'GET'  && path === '/api/usage')       return handleUsage(request, env)
    if (method === 'GET'  && path === '/api/categories')  return handleCategories(request, env)
    if (method === 'GET'  && path === '/api/sidechain')   return handleSidechain(request, env)
    if (method === 'GET'  && path === '/api/filters')     return handleFilters(request, env)
    if (method === 'GET'  && path === '/api/export/csv')  return handleExportCsv(request, env)

    // /api/breakdown/:dim
    const breakdownMatch = path.match(/^\/api\/breakdown\/(project|model|machine|ticket)$/)
    if (method === 'GET' && breakdownMatch) {
      return handleBreakdown(request, env, { dim: breakdownMatch[1] })
    }

    // /api/sessions
    if (method === 'GET' && path === '/api/sessions') return handleSessions(request, env)

    // /api/sessions/:id/category  (PATCH)
    const sessionCatMatch = path.match(/^\/api\/sessions\/([^/]+)\/category$/)
    if (method === 'PATCH' && sessionCatMatch) {
      return handleUpdateCategory(request, env, { id: sessionCatMatch[1] })
    }

    // ── Sync token management ──────────────────────────────────────────────
    if (method === 'POST'   && path === '/api/sync-tokens') return handleCreateSyncToken(request, env)
    if (method === 'GET'    && path === '/api/sync-tokens') return handleListSyncTokens(request, env)
    const deleteTokenMatch = path.match(/^\/api\/sync-tokens\/([^/]+)$/)
    if (method === 'DELETE' && deleteTokenMatch) {
      return handleDeleteSyncToken(request, env, { prefix: deleteTokenMatch[1] })
    }

    return new Response('Not found', { status: 404 })
  },
}
