import React, { type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';

// Global search and a notification drawer were removed in Phase 2 (Decision
// #8) — both were backed by mock data with no real backend behind them. The
// components themselves were deleted in Phase 9 once they were the last
// consumers of dashboardDataStore/mockData; rebuild both from scratch if a
// real notification/search backend ever justifies them.
export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Universal Top Header */}
      <Header />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>

      {/* Global Modals & Drawers */}
      <Sidebar />
      <ToastContainer />
    </div>
  );
};
