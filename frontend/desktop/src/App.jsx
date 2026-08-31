import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { NotificationsDrawer } from './components/layout/NotificationsDrawer';
import { ToastContainer } from './components/common/ToastContainer';

// Role Views
import { LandingPage } from './components/views/LandingPage';
import { LoginPage } from './components/views/LoginPage';
import { WorkerDashboard } from './components/views/WorkerDashboard';
import { SafetyOfficerDashboard } from './components/views/SafetyOfficerDashboard';
import { CorporateDashboard } from './components/views/CorporateDashboard';
import { RegulatoryDashboard } from './components/views/RegulatoryDashboard';
import { AdminDashboard } from './components/views/AdminDashboard';
import { SIHEvaluatorDashboard } from './components/views/SIHEvaluatorDashboard';

const MainContent = () => {
  const { activeView } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'landing':
        return <LandingPage />;
      case 'login':
        return <LoginPage />;
      case 'worker_dashboard':
        return <WorkerDashboard />;
      case 'safety_officer_dashboard':
        return <SafetyOfficerDashboard />;
      case 'corporate_dashboard':
        return <CorporateDashboard />;
      case 'regulatory_dashboard':
        return <RegulatoryDashboard />;
      case 'admin_dashboard':
        return <AdminDashboard />;
      case 'sih_evaluator':
        return <SIHEvaluatorDashboard />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#111112] text-[#d6c3b9] flex flex-col font-['Inter',sans-serif]">
      {/* Universal Top Header */}
      <Header />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActiveView()}
      </main>

      {/* Global Modals & Drawers */}
      <Sidebar />
      <GlobalSearchModal />
      <NotificationsDrawer />
      <ToastContainer />

      {/* Subtle Footer */}
      <footer className="border-t border-[#353534]/50 py-4 text-center text-xs font-mono text-[#9e8d85]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>COALGUARD AI • Smart Mine Safety & DGMS Compliance</span>
          <span>Smart India Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
