import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RequireRole } from '../components/auth/RequireRole';

// Route-level code splitting. Every screen below is `React.lazy`-loaded so the
// initial download is just the shell + whichever one route the visitor landed
// on — not all five role dashboards, the demo flow and the Leaflet map at once
// (which is what a single eager bundle meant). Routes that share a source file
// (a role's Overview/Issues/Profile pages) resolve to that file's single shared
// chunk, so navigating within a role costs no extra fetch.
//
// The views use named exports, so each lazy factory picks its component out of
// the resolved module. `ComponentType<Record<string, never>>` — these are all
// no-prop page components.
function lazyNamed<M extends Record<string, unknown>, K extends keyof M>(
  loader: () => Promise<M>,
  key: K,
) {
  return lazy(async () => {
    const mod = await loader();
    return { default: mod[key] as ComponentType<Record<string, never>> };
  });
}

const LandingPage = lazyNamed(() => import('../components/views/LandingPage'), 'LandingPage');
const DemoFlowPage = lazyNamed(() => import('../components/views/DemoFlowPage'), 'DemoFlowPage');
const Login = lazyNamed(() => import('../pages/auth/Login'), 'Login');
const Dashboard = lazyNamed(() => import('../pages/Dashboard'), 'Dashboard');
const MineMapPage = lazyNamed(() => import('../pages/MineMapPage'), 'MineMapPage');
const AttendanceKioskPage = lazyNamed(() => import('../pages/AttendanceKiosk'), 'AttendanceKioskPage');

const WorkerOverviewPage = lazyNamed(() => import('../components/views/WorkerDashboard'), 'WorkerOverviewPage');
const WorkerReportPage = lazyNamed(() => import('../components/views/WorkerDashboard'), 'WorkerReportPage');
const WorkerProfilePage = lazyNamed(() => import('../components/views/WorkerDashboard'), 'WorkerProfilePage');

const SafetyOverviewPage = lazyNamed(() => import('../components/views/SafetyOfficerDashboard'), 'SafetyOverviewPage');
const SafetyIssuesPage = lazyNamed(() => import('../components/views/SafetyOfficerDashboard'), 'SafetyIssuesPage');
const SafetyProfilePage = lazyNamed(() => import('../components/views/SafetyOfficerDashboard'), 'SafetyProfilePage');

const CorporateOverviewPage = lazyNamed(() => import('../components/views/CorporateDashboard'), 'CorporateOverviewPage');
const CorporateReportsPage = lazyNamed(() => import('../components/views/CorporateDashboard'), 'CorporateReportsPage');
const CorporateProfilePage = lazyNamed(() => import('../components/views/CorporateDashboard'), 'CorporateProfilePage');

const RegulatoryOverviewPage = lazyNamed(() => import('../components/views/RegulatoryDashboard'), 'RegulatoryOverviewPage');
const RegulatoryMinesPage = lazyNamed(() => import('../components/views/RegulatoryDashboard'), 'RegulatoryMinesPage');
const RegulatoryCompliancePage = lazyNamed(() => import('../components/views/RegulatoryDashboard'), 'RegulatoryCompliancePage');
const RegulatoryReportsPage = lazyNamed(() => import('../components/views/RegulatoryDashboard'), 'RegulatoryReportsPage');
const RegulatoryProfilePage = lazyNamed(() => import('../components/views/RegulatoryDashboard'), 'RegulatoryProfilePage');

const AdminUsersPage = lazyNamed(() => import('../components/views/AdminDashboard'), 'AdminUsersPage');
const AdminMinesPage = lazyNamed(() => import('../components/views/AdminDashboard'), 'AdminMinesPage');
const AdminProfilePage = lazyNamed(() => import('../components/views/AdminDashboard'), 'AdminProfilePage');

// Full-viewport fallback while a route chunk is in flight. Deliberately plain —
// it should be invisible on a fast connection and unobtrusive on a slow one.
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/70 animate-spin" />
      <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">Loading</p>
    </div>
  </div>
);

// research/saumy/09-changes-5-sep.md Decision #16's route tree, built out one
// role at a time as each gets real (non-mock) pages to route to — see
// 10-frontend-coding-plan.md's phases. All 5 roles are real as of Phases
// 5-8 — `/dashboard` itself is now just a shared redirect-by-role landing
// point, nothing renders directly under it anymore.
export const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoFlowPage />} />
      <Route path="/login" element={<Login />} />

      {/* Shared authenticated landing route — redirects every role to its own
          real tree below. */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      {/* Worker's real route tree */}
      <Route path="/dashboard/worker" element={<RequireRole role="worker"><WorkerOverviewPage /></RequireRole>} />
      <Route path="/dashboard/worker/report" element={<RequireRole role="worker"><WorkerReportPage /></RequireRole>} />
      <Route path="/dashboard/worker/map" element={<RequireRole role="worker"><MineMapPage /></RequireRole>} />
      <Route path="/dashboard/worker/profile" element={<RequireRole role="worker"><WorkerProfilePage /></RequireRole>} />

      {/* Safety Officer's real route tree */}
      <Route path="/dashboard/safety" element={<RequireRole role="safety_officer"><SafetyOverviewPage /></RequireRole>} />
      <Route path="/dashboard/safety/issues" element={<RequireRole role="safety_officer"><SafetyIssuesPage /></RequireRole>} />
      <Route path="/dashboard/safety/map" element={<RequireRole role="safety_officer"><MineMapPage /></RequireRole>} />
      <Route path="/dashboard/safety/profile" element={<RequireRole role="safety_officer"><SafetyProfilePage /></RequireRole>} />

      {/* Corporate Management's real route tree (Decision #11) — production/
          compliance/ESG/forecasts stay mock/deferred, so there's no route for
          them yet; see 09's "remove now" table. `/reports` was added in Phase 7
          once the report-submission workflow existed. */}
      <Route path="/dashboard/corporate" element={<RequireRole role="corporate_manager"><CorporateOverviewPage /></RequireRole>} />
      <Route path="/dashboard/corporate/reports" element={<RequireRole role="corporate_manager"><CorporateReportsPage /></RequireRole>} />
      <Route path="/dashboard/corporate/profile" element={<RequireRole role="corporate_manager"><CorporateProfilePage /></RequireRole>} />

      {/* Regulatory Authority's real route tree (Decision #13, trimmed to the
          report/verification loop — Phase 7). Inspections/Actions Required/
          Audit History stay deferred; no route for them yet. */}
      <Route path="/dashboard/regulatory" element={<RequireRole role="regulator"><RegulatoryOverviewPage /></RequireRole>} />
      <Route path="/dashboard/regulatory/mines" element={<RequireRole role="regulator"><RegulatoryMinesPage /></RequireRole>} />
      <Route path="/dashboard/regulatory/compliance" element={<RequireRole role="regulator"><RegulatoryCompliancePage /></RequireRole>} />
      <Route path="/dashboard/regulatory/reports" element={<RequireRole role="regulator"><RegulatoryReportsPage /></RequireRole>} />
      <Route path="/dashboard/regulatory/profile" element={<RequireRole role="regulator"><RegulatoryProfilePage /></RequireRole>} />

      {/* Admin's real route tree (Decision #14) — System Health/Data & Storage/
          AI System/Activity Logs/Settings stay deferred; no route for them yet.
          Last of the 5 roles to migrate — `activeSubTab` now has no remaining
          reader anywhere in the app (deleted in Phase 9). */}
      <Route path="/dashboard/admin/users" element={<RequireRole role="admin"><AdminUsersPage /></RequireRole>} />
      <Route path="/dashboard/admin/mines" element={<RequireRole role="admin"><AdminMinesPage /></RequireRole>} />
      <Route path="/dashboard/admin/profile" element={<RequireRole role="admin"><AdminProfilePage /></RequireRole>} />

      {/* Shared attendance kiosk device — not tied to one role's own tree. */}
      <Route
        path="/dashboard/attendance/kiosk"
        element={
          <RequireAuth roles={['safety_officer', 'admin']}>
            <AttendanceKioskPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);
