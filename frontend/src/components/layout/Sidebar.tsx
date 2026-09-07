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
        className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-limestone z-50 flex flex-col justify-between animate-fade-in-up">

        {/* Top: Header with close */}
        <div>
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ember flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-chalk" />
              </div>
              <div>
                <h2 className="text-base font-display text-obsidian leading-tight tracking-wide">
                  COAL<span className="text-ember">GUARD</span> AI
                </h2>
                <p className="text-[10px] text-obsidian/50 tracking-widest uppercase mt-0.5">Navigation Menu</p>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full bg-chalk hover:bg-pumice text-obsidian transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current User Card */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-chalk">
              <div className="w-12 h-12 rounded-full bg-ember flex items-center justify-center text-chalk font-display text-xl shrink-0">
                {displayName(user).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-obsidian truncate">
                  {displayName(user)}
                </h3>
                <p className="text-xs text-ember truncate uppercase tracking-wider mt-0.5">
                  {userTypeLabel(user?.role)}
                </p>
                {user?.organization && (
                  <p className="text-xs text-obsidian/50 truncate mt-0.5">
                    {user.organization}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)]">
            <p className="text-[10px] font-medium uppercase tracking-widest text-obsidian/40 px-3 py-2">
              {userTypeLabel(user?.role)} Menu
            </p>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  id={`sidebar-link-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-pill text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-ember text-chalk font-medium'
                      : 'text-obsidian hover:bg-chalk'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="px-2 py-0.5 rounded-full bg-sulfur text-obsidian text-[10px] font-medium">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-5">
          <button
            onClick={handleSignOut}
            className="btn-glass w-full flex items-center justify-center gap-2 py-3 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </>
  );
};
