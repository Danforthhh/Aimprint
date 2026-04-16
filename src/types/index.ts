export type Category =
  | 'code_writing'
  | 'code_process'
  | 'quality'
  | 'deep_analysis'
  | 'refinement'
  | 'planning'
  | 'random'
  | 'other'

export const ALL_CATEGORIES: Category[] = [
  'code_writing', 'code_process', 'quality', 'deep_analysis',
  'refinement', 'planning', 'random', 'other',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  code_writing:  'Code writing',
  code_process:  'Code process',
  quality:       'Quality',
  deep_analysis: 'Deep analysis',
  refinement:    'Refinement',
  planning:      'Planning',
  random:        'Random',
  other:         'Other',
}

export const CATEGORY_DESCRIPTIONS: Record<Category, { summary: string; examples: string }> = {
  code_writing:  { summary: 'Implementing features, writing new code',           examples: 'e.g. adding a new endpoint, building a component, writing a migration' },
  code_process:  { summary: 'CI/CD, deployments, Docker, builds, ops',           examples: 'e.g. wrangler deploy, docker build, npm run build, git push to prod' },
  quality:       { summary: 'Tests, linting, code review, security',             examples: 'e.g. writing Jest tests, fixing ESLint errors, reviewing a PR' },
  deep_analysis: { summary: 'Codebase exploration, architecture review',         examples: 'e.g. reading many files, understanding a codebase, architecture planning' },
  refinement:    { summary: 'Refactoring, simplifying, cleaning up',             examples: 'e.g. extracting functions, renaming variables, removing dead code' },
  planning:      { summary: 'PRDs, tickets, strategy, roadmaps',                 examples: 'e.g. writing a spec, creating ClickUp tickets, drafting a roadmap' },
  random:        { summary: 'Quick questions, short sessions (< 3 min)',         examples: 'e.g. "how does X work?", one-off lookups, quick fixes' },
  other:         { summary: 'Doesn\'t fit a clear pattern',                      examples: 'Mixed or unclear work type' },
}

export const CATEGORY_COLORS: Record<Category, string> = {
  code_writing:  '#3b82f6',  // blue-500
  code_process:  '#f97316',  // orange-500
  quality:       '#22c55e',  // green-500
  deep_analysis: '#a855f7',  // purple-500
  refinement:    '#14b8a6',  // teal-500
  planning:      '#eab308',  // yellow-500
  random:        '#6b7280',  // gray-500
  other:         '#64748b',  // slate-500
}

// ── API types ──────────────────────────────────────────────────────────────────

export interface DayUsage {
  date: string
  input: number
  output: number
  cache_read: number
  cache_creation: number
  cost_usd: number
}

export interface Totals {
  input: number
  output: number
  cache_read: number
  cache_creation: number
  cost_usd: number
  requests: number
  sessions: number
}

export interface CategoryItem {
  category: Category
  sessions: number   // number of distinct sessions (legacy, still returned by some queries)
  requests?: number  // number of individual requests (per-request classification)
  tokens: number
  cost_usd: number
}

export interface DimItem {
  label: string
  sessions: number
  tokens: number
  cost_usd: number
}

export interface SubagentItem {
  is_sidechain: number
  sessions: number
  tokens: number
  cost_usd: number
}

export interface Session {
  session_id: string
  machine: string
  project: string
  model: string
  git_branch?: string
  ticket?: string
  date: string
  category: Category
  category_source: 'auto' | 'manual'
  tokens: number
  cost_usd: number
}

export interface FiltersData {
  projects: string[]
  models: string[]
  machines: string[]
  tickets: string[]
}

// ── Dashboard filter state ─────────────────────────────────────────────────────

export interface FilterState {
  days: number
  project: string
  model: string
  machine: string
  category: string
  ticket: string
}

export const DEFAULT_FILTERS: FilterState = {
  days: 30,
  project: 'all',
  model: 'all',
  machine: 'all',
  category: 'all',
  ticket: 'all',
}
