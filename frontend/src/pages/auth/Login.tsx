import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'

// Google auth is fully built (frontend + backend) but deliberately not exposed
// in the live UI yet — see research/saumy/02-google-auth-deferred.md. Flip this
// to true once a real Google Cloud OAuth Client ID is configured.
const GOOGLE_AUTH_ENABLED = false

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Basic format check only — good enough to catch an obvious typo before hitting
// the backend. Only applied when the identifier looks like it's meant to be an
// email (contains "@"); phone numbers go through untouched, no format enforced.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mirrors backend/scripts/seed_users.py exactly — update both together if the
// seed data ever changes. Dev/test credentials only, never real accounts.
const DEMO_ACCOUNTS = [
  { role: 'Worker', identifier: '9990000001' },
  { role: 'Mine Safety Officer', identifier: 'officer@example.com' },
  { role: 'Corporate Management', identifier: 'corporate@example.com' },
  { role: 'Regulatory Authority', identifier: 'regulator@example.com' },
  { role: 'Admin', identifier: 'admin@example.com' },
]
const DEMO_PASSWORD = 'test123'

export const Login = () => {
  const navigate = useNavigate()
  const { login, loginWithGoogle, isLoading, error } = useAuthStore()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (identifier.includes('@') && !EMAIL_PATTERN.test(identifier)) {
      setValidationError('Enter a valid email address')
      return
    }

    try {
      await login(identifier, password)
      navigate('/dashboard')
    } catch {
      // Failure message is already surfaced via the store's `error` field.
    }
  }

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    try {
      await loginWithGoogle(credentialResponse.credential)
      navigate('/dashboard')
    } catch {
      // Failure message is already surfaced via the store's `error` field.
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-lg shadow border border-slate-800 p-6">
        <h1 className="text-2xl font-bold text-white mb-1">CoalGuard</h1>
        <p className="text-sm text-slate-400 mb-6">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email or phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700"
              placeholder="you@example.com or +91..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 text-white rounded p-2 border border-slate-700"
              required
            />
          </div>

          {(validationError || error) && (
            <p className="text-sm text-red-400">{validationError || error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {GOOGLE_AUTH_ENABLED && GOOGLE_CLIENT_ID && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => useAuthStore.setState({ error: 'Google sign-in failed' })}
              />
            </GoogleOAuthProvider>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demo accounts (seeded)</p>
          <ul className="space-y-1 text-xs text-slate-400 font-mono">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.identifier} className="flex justify-between gap-3">
                <span className="text-slate-500">{account.role}</span>
                <span className="text-slate-300">{account.identifier}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            Password for all of the above: <span className="text-slate-300 font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
