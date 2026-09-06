import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import type { UserType } from '../../utils/userTypes';
import {
  X,
  LayoutDashboard,
  AlertCircle,
  Map,
  User,
  FileText,
  ShieldAlert,
  FileCheck,
  Layers,
  Users,
  ArrowRight,
  LogOut
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | null;
  path: string;
}

// One nav list per backend role (research/saumy/09-changes-5-sep.md Decision
// #12). All 5 roles are fully real routes now (Decision #16, Phases 5-8) —
// every item carries a `path`.
const NAV_ITEMS_BY_ROLE: Record<UserType, () => NavItem[]> = {
  worker: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard/worker' },
    { id: 'report', label: 'Report a Problem', icon: <AlertCircle className="w-4 h-4" />, path: '/dashboard/worker/report' },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" />, path: '/dashboard/worker/map' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, path: '/dashboard/worker/profile' }
  ],
  safety_officer: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard/safety' },
    { id: 'issues', label: 'Safety Issues', icon: <AlertCircle className="w-4 h-4" />, path: '/dashboard/safety/issues' },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" />, path: '/dashboard/safety/map' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, path: '/dashboard/safety/profile' }
  ],
  corporate_manager: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard/corporate' },
    { id: 'reports', label: 'Compliance Reports', icon: <FileText className="w-4 h-4" />, path: '/dashboard/corporate/reports' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, path: '/dashboard/corporate/profile' }
  ],
  regulator: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/dashboard/regulatory' },
    { id: 'mines', label: 'Mines', icon: <Layers className="w-4 h-4" />, path: '/dashboard/regulatory/mines' },
    { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-4 h-4" />, path: '/dashboard/regulatory/compliance' },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" />, path: '/dashboard/regulatory/reports' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, path: '/dashboard/regulatory/profile' }
  ],
  admin: () => [
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, path: '/dashboard/admin/users' },
    { id: 'mines', label: 'Mines', icon: <Layers className="w-4 h-4" />, path: '/dashboard/admin/mines' },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, path: '/dashboard/admin/profile' }
  ]
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, setIsSidebarOpen } = useUIStore();

  if (!isSidebarOpen) return null;

  // Empty (not a guessed-role fallback) until the role is actually known —
  // showing another role's menu during the /auth/me hydration gap would be
  // worse than showing nothing, same reasoning as RequireAuth's user check.
  const navItems = user?.role ? NAV_ITEMS_BY_ROLE[user.role as UserType]() : [];

  const handleNavClick = (item: NavItem) => {
    navigate(item.path);
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    setIsSidebarOpen(false);
    navigate('/');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0f0c09]/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#1a1511]/95 backdrop-blur-xl border-r border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col justify-between animate-fade-in-up">

        {/* Top: Header with close */}
        <div>
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white font-['Sora'] leading-tight tracking-tight">
                  COAL<span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-400">GUARD</span> AI
                </h2>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">Navigation Menu</p>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current User Card */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                {displayName(user).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate font-['Sora']">
                  {displayName(user)}
                </h3>
                <p className="text-[11px] text-amber-400 font-mono truncate uppercase tracking-wider mt-0.5">
                  {userTypeLabel(user?.role)}
                </p>
                {user?.organization && (
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {user.organization}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 px-3 py-2">
              {userTypeLabel(user?.role)} Menu
            </p>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  id={`sidebar-link-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all text-left ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-transparent hover:border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </>
  );
};
