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
    <div className="min-h-screen flex items-center justify-center bg-pumice px-4">
      <div className="w-full max-w-sm bg-limestone rounded-card p-8">
        <h1 className="text-3xl font-display text-obsidian mb-1">
          COAL<span className="text-ember">GUARD</span>
        </h1>
        <p className="text-sm text-obsidian/60 mb-6">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-obsidian/70 mb-1.5">
              Email or phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-chalk text-obsidian rounded-input px-5 py-3 focus:outline-none focus:ring-2 focus:ring-ember/40"
              placeholder="you@example.com or +91..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian/70 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-chalk text-obsidian rounded-input px-5 py-3 focus:outline-none focus:ring-2 focus:ring-ember/40"
              required
            />
          </div>

          {(validationError || error) && (
            <p className="text-sm text-ember font-medium">{validationError || error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary-earth w-full py-3 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {GOOGLE_AUTH_ENABLED && GOOGLE_CLIENT_ID && (
          <div className="mt-6 pt-6 border-t border-obsidian/10 flex justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => useAuthStore.setState({ error: 'Google sign-in failed' })}
              />
            </GoogleOAuthProvider>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-obsidian/10">
          <p className="text-xs font-medium text-obsidian/50 uppercase tracking-wider mb-2">Demo accounts (seeded)</p>
          <ul className="space-y-1 text-xs text-obsidian/70">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.identifier} className="flex justify-between gap-3">
                <span className="text-obsidian/50">{account.role}</span>
                <span className="text-obsidian font-mono">{account.identifier}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-obsidian/50 mt-2">
            Password for all of the above: <span className="text-obsidian font-mono">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
