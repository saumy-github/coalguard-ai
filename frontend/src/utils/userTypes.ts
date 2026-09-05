// Mirrors backend/src/models/user.py's UserType Literal — the 5 roles in
// research/saumy/09-changes-5-sep.md Decision #12. Single source of truth so
// role lists (Sidebar, Header, Landing, guest picker) can't individually drift
// out of sync again, the way the old AppContext-based UI drifted onto a stale
// 6/7-role model.
export type UserType =
  | 'worker'
  | 'safety_officer'
  | 'corporate_manager'
  | 'regulator'
  | 'admin'

export interface RoleMeta {
  userType: UserType
  title: string
  subtitle: string
}

export const ROLES: RoleMeta[] = [
  { userType: 'worker', title: 'Worker', subtitle: 'Underground Operations' },
  { userType: 'safety_officer', title: 'Mine Safety Officer', subtitle: 'Pit-Head Safety Command' },
  { userType: 'corporate_manager', title: 'Corporate Management', subtitle: 'Enterprise & ESG Governance' },
  { userType: 'regulator', title: 'Regulatory Authority', subtitle: 'DGMS / CPCB — read-only' },
  { userType: 'admin', title: 'Admin', subtitle: 'System & User Provisioning' },
]

// Where each role lands after login. Kept here (not in a component) so both
// the guest picker and the post-login redirect agree on the same mapping.
export const DASHBOARD_PATH_BY_ROLE: Record<UserType, string> = {
  worker: '/worker',
  safety_officer: '/dashboard',
  corporate_manager: '/dashboard',
  regulator: '/dashboard',
  admin: '/dashboard',
}
