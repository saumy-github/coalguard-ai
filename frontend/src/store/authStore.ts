import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../utils/api'
import type { UserType } from '../utils/userTypes'

export interface CurrentUser {
  id: string
  email: string | null
  phone: string | null
  role: string
  full_name: string | null
  is_guest: boolean
  mine_ids: string[]
  // Cosmetic profile fields the backend doesn't provide yet — kept optional so
  // surviving dashboard/profile JSX (organization, badge number, etc.) still
  // compiles without redesign. Always undefined until the backend adds them.
  organization?: string
  badgeNumber?: string
  department?: string
  employeeId?: string
  mineAssigned?: string
  shift?: string
}

interface AuthState {
  token: string | null
  user: CurrentUser | null
  isLoading: boolean
  error: string | null
  // False until zustand's persist middleware has finished reading localStorage.
  // A route guard must wait for this before deciding to redirect to /login —
  // otherwise a valid persisted session flashes a redirect on every reload.
  hasHydrated: boolean
  login: (identifier: string, password: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  loginAsGuest: (userType: UserType) => Promise<void>
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  setHasHydrated: (value: boolean) => void
}

function errorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail || fallback
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      hasHydrated: false,

      login: async (identifier, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/auth/login', { identifier, password })
          set({ token: data.access_token })
          await get().fetchCurrentUser()
        } catch (err) {
          set({ error: errorMessage(err, 'Login failed') })
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/auth/google', { id_token: idToken })
          set({ token: data.access_token })
          await get().fetchCurrentUser()
        } catch (err) {
          set({ error: errorMessage(err, 'Google sign-in failed') })
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      loginAsGuest: async (userType) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/auth/guest', { role: userType })
          set({ token: data.access_token })
          await get().fetchCurrentUser()
        } catch (err) {
          set({ error: errorMessage(err, 'Guest login failed') })
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // Stateless JWT — nothing server-side depends on this succeeding.
        }
        set({ token: null, user: null })
      },

      fetchCurrentUser: async () => {
        const { data } = await api.get('/auth/me')
        set({ user: data })
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'coalguard-auth',
      // Only the token persists across reloads — `user` is re-fetched on
      // rehydration below, so it can't go stale relative to the backend.
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.fetchCurrentUser().catch(() => state.logout())
        }
        state?.setHasHydrated(true)
      },
    }
  )
)
