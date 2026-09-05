import type { CurrentUser } from '../store/authStore'
import type { UserType } from './userTypes'

const USER_TYPE_LABELS: Record<UserType, string> = {
  worker: 'Worker',
  mine_safety_officer: 'Mine Safety Officer',
  corporate_management: 'Corporate Management',
  regulatory_authority: 'Regulatory Authority',
  admin: 'Admin',
}

// user_type comes back from the backend as a plain string; guard against an
// unrecognized value rather than rendering "undefined".
export function userTypeLabel(userType: string | null | undefined): string {
  if (!userType) return 'Operator'
  return USER_TYPE_LABELS[userType as UserType] ?? userType
}

export function displayName(user: CurrentUser | null | undefined): string {
  return user?.full_name || user?.email || user?.phone || 'Operator'
}
