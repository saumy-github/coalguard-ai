import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { LandingPage } from './components/views/LandingPage';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/Dashboard';
import { MineMapPage } from './pages/MineMapPage';
import { WorkerApp } from './pages/worker/WorkerApp';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* The field Worker flow (offline-capable inspection submission) is a
            distinct full-bleed page, not a PageLayout dashboard — see
            research/lld.md §7e / §6 NewInspection. Role-gated: the backend's
            POST /inspections/observations already 403s for non-Workers, but
            without this a Safety Officer/Corporate/etc. session landing here
            (stale tab, back-button, typed URL) hits that 403 with no
            explanation — this redirects them to their own dashboard instead. */}
        <Route
          path="/worker"
          element={
            <RequireAuth roles={['worker']}>
              <WorkerApp />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/map"
          element={
            <RequireAuth>
              <MineMapPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
