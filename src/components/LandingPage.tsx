import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_DESCRIPTIONS } from '../types'

interface LandingPageProps {
  onGetStarted: () => void
}

const CATEGORY_WIDTHS: Record<string, string> = {
  code_writing:     '72%',
  code_process:     '45%',
  quality:          '38%',
  deep_analysis:    '55%',
  refinement:       '30%',
  planning:         '25%',
  document_writing: '18%',
  random:           '20%',
  other:            '12%',
}

const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
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
)

const FEATURES = [
  {
    color: '#3b82f6',
    title: 'Token breakdown',
    desc: 'By project, model, machine, ticket, and time period — slice and filter any way you need.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    color: '#a855f7',
    title: 'Work categories',
    desc: '8 automatic categories — code writing, quality, deep analysis, and more. Reassign manually when needed.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    color: '#f97316',
    title: 'Multi-machine sync',
    desc: 'Aggregate token usage from multiple laptops into one shared dashboard automatically.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    color: '#22c55e',
    title: 'Zero AI cost',
    desc: 'Runs entirely on free Cloudflare infrastructure. The tracker itself consumes zero tokens.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    color: '#14b8a6',
    title: 'Privacy-first',
    desc: 'Conversation content never leaves your machine. Only token counts and metadata are synced.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    color: '#eab308',
    title: 'Period comparison',
    desc: 'Current week vs previous at a glance on every metric — cost, tokens, sessions, cache efficiency.',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Create an account',
    desc: 'Sign up in seconds. No credit card required.',
  },
  {
    n: '2',
    title: 'Run the sync agent',
    desc: 'One command reads your ~/.claude/projects/ logs and pushes metadata to your private dashboard.',
  },
  {
    n: '3',
    title: 'Open your dashboard',
    desc: 'Token usage, cost, and category breakdown appear instantly — across all machines and projects.',
  },
]

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#030712] text-gray-100">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-gray-800/60 bg-[#030712]/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-bold text-white text-lg">Aimprint</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-1.5 font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-800/60 rounded-full px-4 py-1 mb-6 text-sm text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            Free forever · No credit card required
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Know exactly where your<br className="hidden sm:block" />
            <span className="text-blue-400"> AI tokens go</span>
          </h1>

          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Track Claude Code token consumption across every project, machine,
            and work category — with zero AI cost and full privacy.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              onClick={onGetStarted}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
            >
              Get Started — it's free
            </button>
            <button
              onClick={onGetStarted}
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
            >
              Sign in
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Zero AI cost&nbsp;·&nbsp;Privacy-first&nbsp;·&nbsp;Cloudflare-powered
          </p>
        </div>

        {/* Mock dashboard */}
        <div className="max-w-4xl mx-auto mt-14">
          <div className="card border border-gray-800 rounded-2xl p-5 text-left shadow-2xl shadow-black/60">
            {/* Mock header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Logo size={20} />
                <span className="text-sm font-semibold text-white">Aimprint</span>
                <span className="text-xs text-gray-600 ml-1">Your AI usage footprint</span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs bg-gray-800 text-gray-400 rounded px-2 py-1">Last 30 days</span>
                <span className="text-xs bg-gray-800 text-gray-400 rounded px-2 py-1">All projects</span>
              </div>
            </div>

            {/* Mock summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Active tokens', value: '2.4M', sub: '1.1M input · 1.3M output', color: 'text-blue-400', delta: '+12%' },
                { label: 'Sessions', value: '47', sub: '3 projects', color: 'text-gray-300', delta: '+5%' },
                { label: 'Est. cost', value: '$1.82', sub: 'API equivalent', color: 'text-green-400', delta: '-8%' },
                { label: 'Cache efficiency', value: '68%', sub: 'of input tokens', color: 'text-amber-400', delta: '+3%' },
              ].map(c => (
                <div key={c.label} className="bg-gray-800/60 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color} mb-0.5`}>{c.value}</p>
                  <p className="text-xs text-gray-600">{c.sub}</p>
                  <span className="text-xs text-gray-500 mt-1 inline-block">{c.delta} vs prev</span>
                </div>
              ))}
            </div>

            {/* Mock bar chart */}
            <div className="bg-gray-800/40 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-3">Daily token usage</p>
              <div className="flex items-end gap-1 h-16">
                {[40, 55, 30, 70, 85, 45, 60, 75, 50, 90, 65, 80, 55, 70].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-0.5 items-stretch" style={{ height: `${h}%` }}>
                    <div className="flex-1 bg-blue-500/70 rounded-sm" style={{ flex: 0.4 }} />
                    <div className="flex-1 bg-green-500/70 rounded-sm" style={{ flex: 0.35 }} />
                    <div className="flex-1 bg-amber-500/50 rounded-sm" style={{ flex: 0.25 }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2">
                {[['#3b82f6', 'Input'], ['#22c55e', 'Output'], ['#eab308', 'Cache read']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c as string }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">What you get</h2>
          <p className="text-gray-500 text-center mb-12 text-sm">Everything you need to understand your Claude Code usage.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="card rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: f.color + '22', color: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">How it works</h2>
          <p className="text-gray-500 text-center mb-14 text-sm">Up and running in under five minutes.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.n} className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-4 shrink-0">
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute" />
                )}
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category showcase */}
      <section className="px-6 py-20 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">Work categories, automatically classified</h2>
          <p className="text-gray-500 text-center mb-12 text-sm max-w-xl mx-auto">
            Every Claude Code session is automatically labelled by work type — so you know whether you're writing code, running deploys, or doing architecture review.
          </p>
          <div className="card rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ALL_CATEGORIES.filter(c => c !== 'other').map(c => (
                <div key={c} className="flex items-start gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ background: CATEGORY_COLORS[c] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200">{CATEGORY_LABELS[c]}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">{CATEGORY_DESCRIPTIONS[c].summary}</p>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: CATEGORY_WIDTHS[c] ?? '20%', background: CATEGORY_COLORS[c] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-600/10 border border-blue-800/60 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Start tracking your AI footprint today</h2>
            <p className="text-gray-400 text-sm mb-7">Free forever. No credit card required.</p>
            <button
              onClick={onGetStarted}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-8 py-2.5 text-sm transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-gray-600 text-sm">
          <Logo size={18} />
          <span>Aimprint · Your AI usage footprint · © 2025</span>
        </div>
      </footer>
    </div>
  )
}
