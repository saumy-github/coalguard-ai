import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// research/saumy/09-changes-5-sep.md Decision #16: `/dashboard` is only ever
// a shared authenticated landing point that redirects to a role's own real
// route tree — as of Phase 8 (the last role to migrate), nothing renders
// directly here anymore for any role. Not using utils/userTypes.ts's
// DASHBOARD_PATH_BY_ROLE here deliberately: that map sends `worker` to
// `/worker` (the guest-login landing convention, WorkerApp's separate
// offline-inspection flow) — arriving at this shared `/dashboard` URL always
// means the tab-dashboard tree instead, so the mapping has to differ here.
export const Dashboard = () => {
  const role = useAuthStore((state) => state.user?.role);

  if (role === 'worker') return <Navigate to="/dashboard/worker" replace />;
  if (role === 'safety_officer') return <Navigate to="/dashboard/safety" replace />;
  if (role === 'corporate_manager') return <Navigate to="/dashboard/corporate" replace />;
  if (role === 'regulator') return <Navigate to="/dashboard/regulatory" replace />;
  if (role === 'admin') return <Navigate to="/dashboard/admin/users" replace />;

  // Role not yet known (e.g. /auth/me hasn't resolved on this render) —
  // render nothing rather than guess, same principle as RequireAuth's own
  // hydration wait.
  return null;
};
