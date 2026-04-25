import { useState } from 'react'
import { createSyncToken } from '../services/api'

interface Props {
  onDone: () => void
}

export default function OnboardingPage({ onDone }: Props) {
  const [token, setToken]   = useState('')
  const [label, setLabel]   = useState('My laptop')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [step, setStep]       = useState<1 | 2 | 3 | 4>(1)

  async function generate() {
    setLoading(true)
    try {
      const result = await createSyncToken(label)
      setToken(result.token)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
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
            <span className="text-2xl font-bold text-white">Aimprint</span>
          </div>
          <p className="text-gray-400 mt-1">Let's connect your first machine</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border
                ${step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 text-gray-500'}`}>
                {s}
              </div>
              {s < 4 && <div className={`flex-1 h-px ${step > s ? 'bg-blue-600' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        <div className="card space-y-6">
          {/* Step 1 */}
          <div>
            <h3 className="font-semibold text-white mb-1">Step 1 — Generate a sync token</h3>
            <p className="text-sm text-gray-400 mb-3">
              Give this token a label so you know which machine it belongs to.
            </p>
            <div className="flex gap-2">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="My laptop"
                disabled={step > 1}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={generate}
                disabled={loading || step > 1}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {token && (
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-xs text-green-400 break-all font-mono">
                  {token}
                </code>
                <button onClick={copy} className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            {token && <p className="text-amber-400 text-xs mt-2">⚠ Save this token now — it's shown only once.</p>}
          </div>

          {/* Step 2 */}
          <div className={step < 2 ? 'opacity-40 pointer-events-none' : ''}>
            <h3 className="font-semibold text-white mb-1">Step 2 — Install the sync agent</h3>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">{`git clone https://github.com/vin-bories/Aimprint
cd Aimprint/sync
cp .env.example .env
# Edit .env — paste your SYNC_TOKEN and set WORKER_URL
npm install`}</pre>
            {step === 2 && (
              <button onClick={() => setStep(3)} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
                Done → next step
              </button>
            )}
          </div>

          {/* Step 3 */}
          <div className={step < 3 ? 'opacity-40 pointer-events-none' : ''}>
            <h3 className="font-semibold text-white mb-1">Step 3 — Run your first sync</h3>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300">npm run sync</pre>
            {step === 3 && (
              <button onClick={() => setStep(4)} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
                Done → next step
              </button>
            )}
          </div>

          {/* Step 4 */}
          <div className={step < 4 ? 'opacity-40 pointer-events-none' : ''}>
            <h3 className="font-semibold text-white mb-1">Step 4 — Automate (optional)</h3>
            <p className="text-sm text-gray-400 mb-2">
              Add to <code className="text-gray-300">~/.claude/settings.json</code> to sync at every Claude Code session start:
            </p>
            <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">{`{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "npm run sync --prefix ~/aimprint-agent"
      }]
    }]
  }
}`}</pre>
            <p className="text-sm text-gray-400 mt-3">
              <strong className="text-white">Multiple laptops:</strong> run steps 2–3 on each additional machine using the same sync token.
              The dashboard will show a "machine" filter automatically.
            </p>
          </div>

          <button
            onClick={onDone}
            disabled={step < 2}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Go to dashboard →
          </button>
        </div>
      </div>
    </div>
  )
}
