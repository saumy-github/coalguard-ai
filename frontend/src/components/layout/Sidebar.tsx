import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../lib/userDisplay';
import type { UserType } from '../../lib/userTypes';
import {
  X,
  LayoutDashboard,
  CheckSquare,
  AlertCircle,
  Map,
  Bell,
  User,
  Activity,
  FileText,
  ClipboardCheck,
  Sparkles,
  History,
  Building2,
  ShieldAlert,
  FileCheck,
  TrendingUp,
  Landmark,
  Layers,
  Sliders,
  Users,
  Database,
  Cpu,
  ListTree,
  Settings,
  ArrowRight,
  LogOut
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | null;
}

// One nav list per backend user_type (research/lld.md §3) — replaces the old
// 6/7-role menu that still had field_worker/system_admin/sih_evaluator keys.
const NAV_ITEMS_BY_ROLE: Record<UserType, (unreadCount: number) => NavItem[]> = {
  worker: (unreadCount) => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tasks', label: 'My Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'report', label: 'Report a Problem', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount > 0 ? `${unreadCount}` : null },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ],
  mine_safety_officer: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'monitoring', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" /> },
    { id: 'incidents', label: 'Incidents', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'ai_assistant', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'reports_history', label: 'Reports & History', icon: <History className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ],
  corporate_management: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my_mines', label: 'My Mines', icon: <Building2 className="w-4 h-4" /> },
    { id: 'risks_incidents', label: 'Risks & Incidents', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'ai_insights', label: 'AI Insights', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ],
  regulatory_authority: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'mines', label: 'Mines', icon: <Layers className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'actions_required', label: 'Actions Required', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'audit_history', label: 'Audit History', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ],
  admin: () => [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'system_health', label: 'System Health', icon: <Activity className="w-4 h-4" /> },
    { id: 'users_roles', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'data_storage', label: 'Data & Storage', icon: <Database className="w-4 h-4" /> },
    { id: 'ai_system', label: 'AI System', icon: <Cpu className="w-4 h-4" /> },
    { id: 'activity_logs', label: 'Activity Logs', icon: <ListTree className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
  ]
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, setIsSidebarOpen, activeSubTab, setActiveSubTab } = useUIStore();
  const notifications = useDashboardDataStore((state) => state.notifications);

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (!isSidebarOpen) return null;

  const role = (user?.user_type as UserType) || 'mine_safety_officer';
  const navItems = NAV_ITEMS_BY_ROLE[role](unreadCount);
  // Worker's field-ops dashboard is rendered at /dashboard just like every
  // other role (see App.tsx's RoleDashboard) — only the offline inspection
  // submission flow lives at the separate /worker route.
  const dashboardPath = '/dashboard';

  const handleNavClick = (itemId: string) => {
    setActiveSubTab(itemId);
    navigate(dashboardPath);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsSidebarOpen(false);
    navigate('/login');
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white font-['Sora'] leading-tight tracking-tight">
                  COAL<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">GUARD</span> AI
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                {displayName(user).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white truncate font-['Sora']">
                  {displayName(user)}
                </h3>
                <p className="text-[11px] text-amber-400 font-mono truncate uppercase tracking-wider mt-0.5">
                  {userTypeLabel(user?.user_type)}
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
              {userTypeLabel(user?.user_type)} Menu
            </p>

            {navItems.map((item) => {
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
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
            onClick={handleLogout}
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
