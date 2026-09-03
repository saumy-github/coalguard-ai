import React, { type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationsDrawer } from './NotificationsDrawer';
import { ToastContainer } from '../common/ToastContainer';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#0f0c09] text-stone-300 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Universal Top Header */}
      <Header />

      {/* Main Workspace Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {children}
      </main>

      {/* Global Modals & Drawers */}
      <Sidebar />
      <GlobalSearchModal />
      <NotificationsDrawer />
      <ToastContainer />

      {/* Subtle Tech Footer */}
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
};
