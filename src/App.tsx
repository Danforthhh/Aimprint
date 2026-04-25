import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from './services/firebase'
import {
  fetchUsage, fetchCategories, fetchSidechain,
  fetchBreakdown, fetchSessions, fetchFilters, downloadCsv,
} from './services/api'
import type {
  FilterState, FiltersData, DayUsage, Totals,
  CategoryItem, DimItem, SubagentItem, Session, Category,
} from './types'
import { DEFAULT_FILTERS } from './types'

import AuthScreen    from './components/AuthScreen'
import OnboardingPage from './components/OnboardingPage'
import SettingsModal  from './components/SettingsModal'
import Filters        from './components/Filters'
import SummaryCards   from './components/SummaryCards'
import DailyChart     from './components/DailyChart'
import CategoryChart  from './components/CategoryChart'
import SubagentChart  from './components/SubagentChart'
import DimChart          from './components/DimChart'
import AgentCallsCard   from './components/AgentCallsCard'
import SessionTable     from './components/SessionTable'

const EMPTY_TOTALS: Totals = { input: 0, output: 0, cache_read: 0, cache_creation: 0, cost_usd: 0, requests: 0, sessions: 0 }

export default function App() {
  const [user, setUser]         = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [onboarding, setOnboarding]   = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Filter state
  const [filters, setFilters]         = useState<FilterState>(DEFAULT_FILTERS)
  const [filtersData, setFiltersData] = useState<FiltersData>({ projects: [], models: [], machines: [], tickets: [] })

  // Data
  const [daily,      setDaily]      = useState<DayUsage[]>([])
  const [totals,     setTotals]     = useState<Totals>(EMPTY_TOTALS)
  const [totalsPrev, setTotalsPrev] = useState<Totals>(EMPTY_TOTALS)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [sidechain,  setSidechain]  = useState<SubagentItem[]>([])
  const [projectDim, setProjectDim] = useState<DimItem[]>([])
  const [modelDim,   setModelDim]   = useState<DimItem[]>([])
  const [machineDim,          setMachineDim]          = useState<DimItem[]>([])
  const [agentCalls,          setAgentCalls]          = useState(0)
  const [sessionsWithAgents,  setSessWithAgents]      = useState(0)
  const [dailyAgentCalls,     setDailyAgentCalls]     = useState<{ date: string; agent_calls: number }[]>([])
  const [sessions,            setSessions]            = useState<Session[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
      if (u) {
        // Check if first time (no machines yet → show onboarding)
        fetchFilters()
          .then(f => {
            if (f.machines.length === 0) setOnboarding(true)
          })
          .catch(() => {})
      }
    })
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [usage, cats, side, proj, mod, mach, sess, fdata] = await Promise.all([
        fetchUsage(filters),
        fetchCategories(filters),
        fetchSidechain(filters),
        fetchBreakdown('project', filters.days),
        fetchBreakdown('model',   filters.days),
        fetchBreakdown('machine', filters.days),
        fetchSessions(filters),
        fetchFilters(),
      ])
      setDaily(usage.daily)
      setTotals(usage.totals ?? EMPTY_TOTALS)
      setTotalsPrev(usage.totalsPrev ?? EMPTY_TOTALS)
      setCategories(cats.categories)
      setSidechain(side.data)
      setProjectDim(proj.data)
      setModelDim(mod.data)
      setMachineDim(mach.data)
      setAgentCalls(usage.agent_calls ?? 0)
      setSessWithAgents(usage.sessions_with_agents ?? 0)
      setDailyAgentCalls(usage.daily_agent_calls ?? [])
      setSessions(sess.sessions)
      setFiltersData(fdata)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user, filters])

  useEffect(() => {
    if (user && !onboarding) loadData()
  }, [user, onboarding, loadData])

  function handleCategoryChanged(sessionId: string, category: Category) {
    setSessions(prev => prev.map(s =>
      s.session_id === sessionId ? { ...s, category, category_source: 'manual' } : s
    ))
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthScreen />
  if (onboarding) return <OnboardingPage onDone={() => { setOnboarding(false); loadData() }} />

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#2563eb"/>
            <path d="M 10,40 A 22,22 0 0 1 54,40" fill="none" stroke="white" strokeWidth="3" opacity="0.3" strokeLinecap="round"/>
            <path d="M 10,40 A 22,22 0 0 1 44,20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <line x1="10" y1="40" x2="14" y2="37" stroke="white" strokeWidth="1.5" opacity="0.5"/>
            <line x1="32" y1="18" x2="32" y2="22" stroke="white" strokeWidth="1.5" opacity="0.5"/>
            <line x1="54" y1="40" x2="50" y2="37" stroke="white" strokeWidth="1.5" opacity="0.5"/>
            <line x1="32" y1="40" x2="43" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="32" cy="40" r="7" fill="white" opacity="0.2"/>
            <circle cx="32" cy="40" r="7" fill="none" stroke="white" strokeWidth="2.5"/>
            <circle cx="32" cy="40" r="2.5" fill="white"/>
          </svg>
          <span className="font-bold text-white">Aimprint</span>
          <span className="text-xs text-gray-600 ml-1">Your AI usage footprint</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user.email}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs text-gray-400 hover:text-white bg-gray-800 rounded-lg px-3 py-1.5"
          >
            Settings
          </button>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Filters
          filters={filters}
          filtersData={filtersData}
          onChange={setFilters}
          onExport={() => downloadCsv(filters).catch(console.error)}
          onRefresh={loadData}
          loading={loading}
        />

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Summary */}
        <SummaryCards totals={totals} totalsPrev={totalsPrev} />

        {/* Charts row 1 */}
        <DailyChart data={daily} />

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryChart data={categories} />
          <AgentCallsCard agentCalls={agentCalls} sessionsWithAgents={sessionsWithAgents} dailyData={dailyAgentCalls} />
        </div>

        {/* Charts row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DimChart
            title="By project"
            data={projectDim}
            color="#3b82f6"
            subtitle="(basename of working directory)"
          />
          <DimChart title="By model"   data={modelDim}   color="#22c55e" />
          <DimChart title="By machine" data={machineDim} color="#f97316" />
          <SubagentChart data={sidechain} />
        </div>

        {/* Sessions */}
        <SessionTable sessions={sessions} onCategoryChanged={handleCategoryChanged} />
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
