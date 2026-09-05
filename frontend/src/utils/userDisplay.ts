import type { CurrentUser } from '../store/authStore'
import type { UserType } from './userTypes'

const USER_TYPE_LABELS: Record<UserType, string> = {
  worker: 'Worker',
  safety_officer: 'Mine Safety Officer',
  corporate_manager: 'Corporate Management',
  regulator: 'Regulatory Authority',
  admin: 'Admin',
}

// role comes back from the backend as a plain string; guard against an
// unrecognized value rather than rendering "undefined".
export function userTypeLabel(role: string | null | undefined): string {
  if (!role) return 'Operator'
  return USER_TYPE_LABELS[role as UserType] ?? role
}

export function displayName(user: CurrentUser | null | undefined): string {
  return user?.full_name || user?.email || user?.phone || 'Operator'
}
