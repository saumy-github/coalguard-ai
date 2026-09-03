import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// Waits for zustand's persist rehydration before deciding anything — otherwise
// a valid persisted session flashes a redirect to /login on every page reload,
// since `token` briefly reads as null until localStorage has been read.
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const token = useAuthStore((state) => state.token)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  if (!hasHydrated) {
    return null
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
