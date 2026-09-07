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
import { CoalGuardLogo } from '../common/CoalGuardLogo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | null;
  path: string;
}

const NAV_ITEMS_BY_ROLE: Record<UserType, () => NavItem[]> = {
  worker: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/worker' },
    { id: 'report', label: 'Report Issue', icon: <AlertCircle className="w-5 h-5" />, path: '/dashboard/worker/report' },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-5 h-5" />, path: '/dashboard/worker/map' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, path: '/dashboard/worker/profile' }
  ],
  safety_officer: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/safety' },
    { id: 'issues', label: 'Safety Issues', icon: <AlertCircle className="w-5 h-5" />, path: '/dashboard/safety/issues' },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-5 h-5" />, path: '/dashboard/safety/map' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, path: '/dashboard/safety/profile' }
  ],
  corporate_manager: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/corporate' },
    { id: 'reports', label: 'Compliance Reports', icon: <FileText className="w-5 h-5" />, path: '/dashboard/corporate/reports' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, path: '/dashboard/corporate/profile' }
  ],
  regulator: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dashboard/regulatory' },
    { id: 'mines', label: 'Mines', icon: <Layers className="w-5 h-5" />, path: '/dashboard/regulatory/mines' },
    { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-5 h-5" />, path: '/dashboard/regulatory/compliance' },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" />, path: '/dashboard/regulatory/reports' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, path: '/dashboard/regulatory/profile' }
  ],
  admin: () => [
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" />, path: '/dashboard/admin/users' },
    { id: 'mines', label: 'Mines', icon: <Layers className="w-5 h-5" />, path: '/dashboard/admin/mines' },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" />, path: '/dashboard/admin/profile' }
  ]
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, setIsSidebarOpen } = useUIStore();

  if (!isSidebarOpen) return null;

  const navItems = user?.role ? NAV_ITEMS_BY_ROLE[user.role as UserType]() : [];

  const handleNavClick = (item: NavItem) => {
    navigate(item.path);
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    setIsSidebarOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Drawer (Graphite Glass Theme) */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-zinc-950/90 backdrop-blur-3xl border-r border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col justify-between animate-fade-in-up">

        {/* Top: Header with close */}
        <div>
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30 flex items-center justify-center shadow-lg relative overflow-hidden">
                <CoalGuardLogo className="w-5 h-5 text-blue-500 relative z-10" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">
                  COAL<span className="text-blue-500">GUARD</span>
                </h2>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5">Workspace</p>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl bg-black/20 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current User Card */}
          <div className="p-5 border-b border-white/5 bg-zinc-900/20">
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow-md">
                {displayName(user).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate">
                  {displayName(user)}
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono font-bold truncate uppercase tracking-widest mt-1">
                  {userTypeLabel(user?.role)}
                </p>
                {user?.organization && (
                  <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                    {user.organization}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600 px-3 py-2 mb-2">
              Menu
            </p>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  id={`sidebar-link-${item.id}`}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left group relative overflow-hidden ${
                    isActive
                      ? 'bg-zinc-800 border border-white/10 text-white shadow-lg'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-l-xl"></div>
                  )}

                  <div className="flex items-center gap-3 relative z-10 pl-1">
                    <span className={`transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                      {item.icon}
                    </span>
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="px-2 py-0.5 rounded-md bg-white text-zinc-900 text-[10px] font-bold shadow-sm relative z-10">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ArrowRight className="w-4 h-4 text-zinc-400 relative z-10" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Sign Out</span>
          </button>
        </div>

      </div>
    </>
  );
};
