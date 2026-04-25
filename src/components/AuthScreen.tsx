import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../services/firebase'

function friendlyAuthError(msg: string): string {
  if (msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('INVALID_LOGIN_CREDENTIALS'))
    return 'Invalid email or password.'
  if (msg.includes('user-not-found'))
    return 'No account found with that email.'
  if (msg.includes('email-already-in-use'))
    return 'An account with this email already exists.'
  if (msg.includes('weak-password'))
    return 'Password must be at least 6 characters.'
  if (msg.includes('too-many-requests'))
    return 'Too many failed attempts. Please try again later.'
  if (msg.includes('network-request-failed'))
    return 'Network error. Please check your connection.'
  return 'Authentication failed. Please try again.'
}

export default function AuthScreen() {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
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
          <p className="text-gray-400 text-sm">Your AI usage footprint</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPass(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="text-blue-400 hover:text-blue-300"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
