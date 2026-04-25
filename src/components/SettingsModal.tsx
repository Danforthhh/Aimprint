import { useState, useEffect } from 'react'
import { signOut, deleteUser } from 'firebase/auth'
import { auth } from '../services/firebase'
import { createSyncToken, listSyncTokens, deleteSyncToken, deleteAccount } from '../services/api'

interface Props {
  onClose: () => void
}

interface TokenRow { token: string; label: string; created_at: string }

export default function SettingsModal({ onClose }: Props) {
  const [tokens, setTokens]     = useState<TokenRow[]>([])
  const [label, setLabel]       = useState('New machine')
  const [newToken, setNewToken] = useState('')
  const [copied, setCopied]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const user = auth.currentUser

  useEffect(() => {
    listSyncTokens().then(r => setTokens(r.tokens)).catch(() => {})
  }, [])

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const result = await createSyncToken(label)
      setNewToken(result.token)
      const updated = await listSyncTokens()
      setTokens(updated.tokens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate token')
    } finally {
      setLoading(false)
    }
  }

  async function remove(tokenPrefix: string) {
    setError('')
    try {
      await deleteSyncToken(tokenPrefix)
      const updated = await listSyncTokens()
      setTokens(updated.tokens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke token')
    }
  }

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)
    setError('')
    try {
      // 1. Delete the Firebase Auth user FIRST — fails fast if re-auth is needed.
      //    This prevents the worse failure mode of D1 data being erased while the
      //    Firebase account survives (user could log back in to an empty dashboard).
      await deleteUser(user)
      // 2. D1 data only deleted after Firebase confirms success.
      //    If this fails the Firebase account is gone so the data is orphaned but
      //    inaccessible — a hygiene issue, not a security or data-loss issue.
      await deleteAccount()
      // Auth listener in App.tsx will detect the Firebase sign-out and redirect.
    } catch (e) {
      setDeleting(false)
      setDeleteConfirm(false)
      const msg = e instanceof Error ? e.message : 'Failed to delete account'
      if (msg.includes('requires-recent-login')) {
        setError('Please sign out and sign back in before deleting your account.')
      } else {
        setError(msg)
      }
    }
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
          {/* Global error banner */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Account */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Account</h3>
            <p className="text-sm text-gray-300 mb-3">{user?.email}</p>
            <button
              onClick={() => signOut(auth)}
              className="text-sm text-gray-400 hover:text-white"
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
              <div className="mb-3 bg-gray-800 rounded-lg p-3 space-y-3">
                <p className="text-xs text-amber-400">⚠ Save this token — it's shown only once</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-400 break-all font-mono">{newToken}</code>
                  <button onClick={copy} className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="border-t border-gray-700 pt-3 space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Setup on the new machine:</p>
                  <p className="text-xs text-gray-500">1. Clone &amp; install</p>
                  <pre className="bg-gray-900 rounded p-2 text-xs text-gray-300 overflow-x-auto">{`git clone https://github.com/vin-bories/Aimprint
cd Aimprint && npm install`}</pre>
                  <p className="text-xs text-gray-500">2. Create <code className="text-gray-300">sync/.env</code></p>
                  <pre className="bg-gray-900 rounded p-2 text-xs text-gray-300 overflow-x-auto">{`WORKER_URL=${import.meta.env.VITE_WORKER_URL}\nSYNC_TOKEN=${newToken}`}</pre>
                  <p className="text-xs text-gray-500">3. Run sync</p>
                  <pre className="bg-gray-900 rounded p-2 text-xs text-gray-300">npm run sync</pre>
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
                      onClick={() => remove(t.token.slice(0, 8))}
                      className="text-xs text-red-400 hover:text-red-300 ml-3"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm font-medium text-red-500 uppercase tracking-wider mb-3">Danger zone</h3>
            {!deleteConfirm ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-300 font-medium">Delete account</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Permanently deletes your account, all sync tokens, and all usage data. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="shrink-0 text-sm text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Delete account
                </button>
              </div>
            ) : (
              <div className="bg-red-900/10 border border-red-800 rounded-lg p-4 space-y-3">
                <p className="text-sm text-red-300 font-medium">Are you sure?</p>
                <p className="text-xs text-red-400">
                  This will permanently delete <strong>{user?.email}</strong> and all associated data.
                  Your sync agent will stop working immediately.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg px-4 py-1.5 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
