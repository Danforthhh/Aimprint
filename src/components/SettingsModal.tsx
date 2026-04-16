import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { createSyncToken, listSyncTokens, deleteSyncToken } from '../services/api'

interface Props {
  onClose: () => void
}

interface TokenRow { token: string; label: string; created_at: string }

export default function SettingsModal({ onClose }: Props) {
  const [tokens, setTokens]   = useState<TokenRow[]>([])
  const [label, setLabel]     = useState('New machine')
  const [newToken, setNewToken] = useState('')
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(false)
  const user = auth.currentUser

  useEffect(() => {
    listSyncTokens().then(r => setTokens(r.tokens)).catch(() => {})
  }, [])

  async function generate() {
    setLoading(true)
    try {
      const result = await createSyncToken(label)
      setNewToken(result.token)
      const updated = await listSyncTokens()
      setTokens(updated.tokens)
    } finally {
      setLoading(false)
    }
  }

  async function remove(tokenPrefix: string) {
    await deleteSyncToken(tokenPrefix)
    const updated = await listSyncTokens()
    setTokens(updated.tokens)
  }

  function copy() {
    navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Account */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Account</h3>
            <p className="text-sm text-gray-300 mb-3">{user?.email}</p>
            <button
              onClick={() => signOut(auth)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Sign out
            </button>
          </div>

          {/* Sync tokens */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Sync tokens</h3>
            <p className="text-xs text-gray-500 mb-4">
              Each token connects one machine to your account. Use the same token on multiple laptops,
              or generate separate tokens per machine to manage them independently.
            </p>

            {/* Generate */}
            <div className="flex gap-2 mb-3">
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Token label (e.g. Work laptop)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={generate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium"
              >
                {loading ? '…' : 'Generate'}
              </button>
            </div>

            {newToken && (
              <div className="mb-3 bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-amber-400 mb-2">⚠ Save this token — it's shown only once</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-400 break-all font-mono">{newToken}</code>
                  <button onClick={copy} className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Token list */}
            {tokens.length > 0 && (
              <div className="space-y-2">
                {tokens.map(t => (
                  <div key={t.token} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{t.label}</p>
                      <p className="text-xs text-gray-500 font-mono">{t.token}…</p>
                    </div>
                    <button
                      onClick={() => remove(t.token.replace('...', ''))}
                      className="text-xs text-red-400 hover:text-red-300 ml-3"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
