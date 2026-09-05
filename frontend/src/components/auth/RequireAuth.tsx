import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { UserType } from '../../utils/userTypes'

interface RequireAuthProps {
  children: ReactNode
  // Restricts the route to these roles once the session is known. Omit
  // for "any authenticated user". A logged-in user of the wrong role is
  // authenticated, just on the wrong page — so this redirects to /dashboard,
  // not /login, and does not decide anything until the role itself is known
  // (see the hasHydrated + user checks below) to avoid a false redirect on
  // the render before /auth/me has resolved.
  roles?: UserType[]
}

// Waits for zustand's persist rehydration before deciding anything — otherwise
// a valid persisted session flashes a redirect to /login on every page reload,
// since `token` briefly reads as null until localStorage has been read.
export const RequireAuth = ({ children, roles }: RequireAuthProps) => {
  const token = useAuthStore((state) => state.token)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const user = useAuthStore((state) => state.user)

  if (!hasHydrated) {
    return null
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (roles) {
    // /auth/me hasn't resolved yet on this render (fires right after token is
    // set, before fetchCurrentUser() returns) — wait rather than redirect on
    // a guess, or a fresh login into a role-gated route bounces to /dashboard
    // for a frame before landing back correctly.
    if (!user) {
      return null
    }
    if (!roles.includes(user.role as UserType)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
