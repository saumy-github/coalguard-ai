import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RequireRole } from '../components/auth/RequireRole';
import { LandingPage } from '../components/views/LandingPage';
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/Dashboard';
import { MineMapPage } from '../pages/MineMapPage';
import { WorkerOverviewPage, WorkerReportPage, WorkerProfilePage } from '../components/views/WorkerDashboard';
import { SafetyOverviewPage, SafetyIssuesPage, SafetyProfilePage } from '../components/views/SafetyOfficerDashboard';
import { CorporateOverviewPage, CorporateReportsPage, CorporateProfilePage } from '../components/views/CorporateDashboard';
import {
  RegulatoryOverviewPage,
  RegulatoryMinesPage,
  RegulatoryCompliancePage,
  RegulatoryReportsPage,
  RegulatoryProfilePage,
} from '../components/views/RegulatoryDashboard';
import { AdminUsersPage, AdminMinesPage, AdminProfilePage } from '../components/views/AdminDashboard';

// research/saumy/09-changes-5-sep.md Decision #16's route tree, built out one
// role at a time as each gets real (non-mock) pages to route to — see
// 10-frontend-coding-plan.md's phases. All 5 roles are real as of Phases
// 5-8 — `/dashboard` itself is now just a shared redirect-by-role landing
// point, nothing renders directly under it anymore.
export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
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

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
