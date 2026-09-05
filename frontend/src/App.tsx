import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/Dashboard';
import { MineMapPage } from './pages/MineMapPage';
import { WorkerApp } from './pages/worker/WorkerApp';
import { LandingPage } from './components/views/LandingPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/worker"
        element={
          <RequireAuth>
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
  );
}

export default App;
