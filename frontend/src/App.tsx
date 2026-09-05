import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { RequireAuth } from './components/auth/RequireAuth';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { ToastContainer } from './components/common/ToastContainer';

import { LandingPage } from './components/views/LandingPage';
import { Login } from './pages/auth/Login';
import { WorkerDashboard } from './components/views/WorkerDashboard';
import { SafetyOfficerDashboard } from './components/views/SafetyOfficerDashboard';
import { CorporateDashboard } from './components/views/CorporateDashboard';
import { RegulatoryDashboard } from './components/views/RegulatoryDashboard';
import { AdminDashboard } from './components/views/AdminDashboard';
import { WorkerApp } from './pages/worker/WorkerApp';

const AppShell = () => (
  <div className="min-h-screen bg-[#0f0c09] text-stone-300 flex flex-col font-sans selection:bg-amber-500/30">
    <Header />
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Role-aware landing route: the JSX rendered depends on the logged-in
            user's user_type, not on the URL — matches research/lld.md §6
            ("Dashboard — same route, content varies by role"). */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <RoleDashboard />
            </RequireAuth>
          }
        />

        {/* The field Worker flow (offline-capable inspection submission) is a
            distinct full-bleed page, not a PageLayout dashboard — see
            research/lld.md §7e / §6 NewInspection. */}
        <Route
          path="/worker"
          element={
            <RequireAuth>
              <WorkerApp />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>

    <Sidebar />
    <GlobalSearchModal />
    <NotificationsDrawer />
    <ToastContainer />

    <footer className="border-t border-white/5 py-4 text-center text-xs font-mono text-stone-500 relative z-10 bg-[#0f0c09]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#eab308] animate-pulse"></span>
          <span className="uppercase tracking-widest font-bold">COALGUARD AI • Smart Mine Safety & DGMS Compliance</span>
        </div>
        <span className="text-[#eab308]/70 font-bold tracking-widest uppercase">Smart India Hackathon 2026</span>
      </div>
    </footer>
  </div>
);

// research/lld.md §3's 5 roles. Worker's fuller field-ops dashboard (tasks,
// quick report, notifications) lives here like every other role; the
// dedicated offline-capable inspection submission flow (research/lld.md §7e /
// §6 NewInspection) is the separate /worker route, reached from within it.
const RoleDashboard = () => {
  const userType = useAuthStore((state) => state.user?.user_type);

  switch (userType) {
    case 'worker':
      return <WorkerDashboard />;
    case 'mine_safety_officer':
      return <SafetyOfficerDashboard />;
    case 'corporate_management':
      return <CorporateDashboard />;
    case 'regulatory_authority':
      return <RegulatoryDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      // hasHydrated/token gating already happened in RequireAuth; a missing
      // user_type here means /auth/me hasn't resolved yet on this render.
      return null;
  }
};

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
