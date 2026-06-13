import { getIdToken } from 'firebase/auth'
import { auth } from './firebase'
import type {
  DayUsage, Totals, CategoryItem, DimItem, SubagentItem,
  Session, FiltersData, FilterState,
} from '../types'


const WORKER = import.meta.env['VITE_WORKER_URL'] ?? ''
if (!WORKER && import.meta.env.PROD) {
  throw new Error('VITE_WORKER_URL is not set — all API calls will fail')
}

async function getToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return getIdToken(user)
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${WORKER}${path}`, {
    ...options,
    headers: {
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

function qs(f: FilterState, viewAs?: string): string {
  const p = new URLSearchParams({
    days:     String(f.days),
    project:  f.project,
    model:    f.model,
    machine:  f.machine,
    category: f.category,
    ticket:   f.ticket,
  })
  if (viewAs) p.set('viewAs', viewAs)
  return `?${p}`
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export async function fetchUsage(f: FilterState, viewAs?: string): Promise<{
  daily: DayUsage[]
  totals: Totals
  totalsPrev: Totals
  agent_calls: number
  sessions_with_agents: number
  daily_agent_calls: { date: string; agent_calls: number }[]
}> {
  return apiFetch(`/api/usage${qs(f, viewAs)}`)
}

export async function fetchCategories(f: FilterState, viewAs?: string): Promise<{ categories: CategoryItem[] }> {
  return apiFetch(`/api/categories${qs(f, viewAs)}`)
}

export async function fetchCategoryTrend(
  f: FilterState,
  viewAs?: string,
): Promise<{ data: Array<{ week: string; category: string; tokens: number; cost_usd: number }> }> {
  return apiFetch(`/api/category-trend${qs(f, viewAs)}`)
}

export async function fetchSidechain(f: FilterState, viewAs?: string): Promise<{ data: SubagentItem[] }> {
  return apiFetch(`/api/sidechain${qs(f, viewAs)}`)
}

export async function fetchBreakdown(dim: string, days: number, viewAs?: string): Promise<{ data: DimItem[] }> {
  const p = new URLSearchParams({ days: String(days) })
  if (viewAs) p.set('viewAs', viewAs)
  return apiFetch(`/api/breakdown/${dim}?${p}`)
}

export async function fetchSessions(
  f: FilterState,
  limit = 50,
  offset = 0,
  sort: 'recent' | 'cost_desc' = 'recent',
  viewAs?: string,
): Promise<{ sessions: Session[] }> {
  const p = new URLSearchParams({
    days: String(f.days), project: f.project, model: f.model,
    machine: f.machine, category: f.category, ticket: f.ticket,
    limit: String(limit), offset: String(offset), sort,
  })
  if (viewAs) p.set('viewAs', viewAs)
  return apiFetch(`/api/sessions?${p}`)
}

export async function fetchFilters(viewAs?: string): Promise<FiltersData> {
  const p = viewAs ? `?viewAs=${encodeURIComponent(viewAs)}` : ''
  return apiFetch(`/api/filters${p}`)
}

export async function fetchAdminUsers(): Promise<{ users: { user_id: string; email: string; created_at: string }[] }> {
  return apiFetch('/api/admin/users')
}

export async function updateSessionCategory(sessionId: string, category: string): Promise<void> {
  await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/category`, {
    method: 'PATCH',
    body: JSON.stringify({ category }),
  })
}

export async function createSyncToken(label: string): Promise<{ token: string; label: string }> {
  return apiFetch('/api/sync-tokens', { method: 'POST', body: JSON.stringify({ label }) })
}

export async function listSyncTokens(): Promise<{ tokens: { token: string; token_id: string | null; label: string; created_at: string }[] }> {
  return apiFetch('/api/sync-tokens')
}

export async function deleteSyncToken(idOrPrefix: string): Promise<void> {
  await apiFetch(`/api/sync-tokens/${encodeURIComponent(idOrPrefix)}`, { method: 'DELETE' })
}

export async function downloadCsv(f: FilterState, viewAs?: string): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${WORKER}/api/export/csv${qs(f, viewAs)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('CSV export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'aimprint-export.csv'
  a.click()
  // Revoke after a short delay — revoking synchronously can abort the download
  // before the browser has opened the stream (reproducible on Safari).
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export async function deleteAccount(): Promise<void> {
  await apiFetch('/api/account', { method: 'DELETE' })
}
