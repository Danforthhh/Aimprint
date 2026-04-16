import { getIdToken } from 'firebase/auth'
import { auth } from './firebase'
import type {
  DayUsage, Totals, CategoryItem, DimItem, SubagentItem,
  Session, FiltersData, FilterState,
} from '../types'


const WORKER = import.meta.env['VITE_WORKER_URL'] ?? ''

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

function qs(f: FilterState): string {
  const p = new URLSearchParams({
    days:     String(f.days),
    project:  f.project,
    model:    f.model,
    machine:  f.machine,
    category: f.category,
    ticket:   f.ticket,
  })
  return `?${p}`
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export async function fetchUsage(f: FilterState): Promise<{
  daily: DayUsage[]
  totals: Totals
  totalsPrev: Totals
}> {
  return apiFetch(`/api/usage${qs(f)}`)
}

export async function fetchCategories(f: FilterState): Promise<{ categories: CategoryItem[] }> {
  return apiFetch(`/api/categories${qs(f)}`)
}

export async function fetchSidechain(f: FilterState): Promise<{ data: SubagentItem[] }> {
  return apiFetch(`/api/sidechain${qs(f)}`)
}

export async function fetchBreakdown(dim: string, days: number): Promise<{ data: DimItem[] }> {
  return apiFetch(`/api/breakdown/${dim}?days=${days}`)
}

export async function fetchSessions(f: FilterState, limit = 50, offset = 0): Promise<{ sessions: Session[] }> {
  const p = new URLSearchParams({
    days: String(f.days), project: f.project, model: f.model,
    machine: f.machine, category: f.category, ticket: f.ticket,
    limit: String(limit), offset: String(offset),
  })
  return apiFetch(`/api/sessions?${p}`)
}

export async function fetchFilters(): Promise<FiltersData> {
  return apiFetch('/api/filters')
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

export async function listSyncTokens(): Promise<{ tokens: { token: string; label: string; created_at: string }[] }> {
  return apiFetch('/api/sync-tokens')
}

export async function deleteSyncToken(tokenPrefix: string): Promise<void> {
  await apiFetch(`/api/sync-tokens/${encodeURIComponent(tokenPrefix)}`, { method: 'DELETE' })
}

export async function downloadCsv(f: FilterState): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${WORKER}/api/export/csv${qs(f)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('CSV export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = 'aimprint-export.csv'
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function deleteAccount(): Promise<void> {
  await apiFetch('/api/account', { method: 'DELETE' })
}
