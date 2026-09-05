import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { UserType } from '../../utils/userTypes'
import { RequireAuth } from './RequireAuth'

// Where a role's own real route tree lives, once it has one (research/saumy/
// 09-changes-5-sep.md Decision #16). Grows as more roles migrate off
// `/dashboard`'s tab-based shell in later phases — a role missing here falls
// back to the generic `/dashboard`, which redirects correctly on its own.
const OWN_DASHBOARD_ROUTE: Partial<Record<UserType, string>> = {
  worker: '/dashboard/worker',
  safety_officer: '/dashboard/safety',
  corporate_manager: '/dashboard/corporate',
  regulator: '/dashboard/regulatory',
  // No bare /dashboard/admin overview in Decision #16's tree — Users is
  // Admin's first/primary page.
  admin: '/dashboard/admin/users',
}

interface RequireRoleProps {
  role: UserType
  children: ReactNode
}

// Thin wrapper over RequireAuth's own `roles` prop, for exactly-one-role
// dashboard routes (Phase 5). RequireAuth already does the real authentication
// + hydration-race handling — reused here, not duplicated — and would itself
// redirect a role mismatch to the generic `/dashboard`, which is correct but
// costs an extra hop through Dashboard.tsx's own role redirect. This checks
// the mismatch first (only when `user` is already known, so it never races
// ahead of RequireAuth's own wait) and sends the user straight to their real
// route tree when one exists.
export const RequireRole = ({ role, children }: RequireRoleProps) => {
  const user = useAuthStore((state) => state.user)

  if (user && user.role !== role) {
    return <Navigate to={OWN_DASHBOARD_ROUTE[user.role as UserType] ?? '/dashboard'} replace />
  }

  return <RequireAuth roles={[role]}>{children}</RequireAuth>
}
