import React from 'react';
import { useApp } from '../../context/AppContext';
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
  Award, 
  ShieldCheck, 
  ChevronRight,
  LogOut,
  Radio,
  ArrowRight
} from 'lucide-react';

export const Sidebar = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    activeSubTab, 
    setActiveSubTab,
    isSidebarOpen, 
    setIsSidebarOpen,
    loginAsRole,
    logout,
    notifications
  } = useApp();

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (!isSidebarOpen) return null;

  // Define clean, role-tailored menus strictly matching user requirements
  const getNavItems = () => {
    const role = currentUser?.role || 'safety_officer';

    if (role === 'field_worker') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'tasks', label: 'My Tasks', icon: <CheckSquare className="w-4 h-4" /> },
        { id: 'report', label: 'Report a Problem', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount > 0 ? `${unreadCount}` : null },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
      ];
    }

    if (role === 'safety_officer') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'monitoring', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" /> },
        { id: 'map', label: 'Mine Map', icon: <Map className="w-4 h-4" /> },
        { id: 'incidents', label: 'Incidents', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'ai_assistant', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'reports_history', label: 'Reports & History', icon: <History className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
      ];
    }

    if (role === 'corporate_management') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'my_mines', label: 'My Mines', icon: <Building2 className="w-4 h-4" /> },
        { id: 'risks_incidents', label: 'Risks & Incidents', icon: <ShieldAlert className="w-4 h-4" /> },
        { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-4 h-4" /> },
        { id: 'ai_insights', label: 'AI Insights', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
      ];
    }

    if (role === 'regulatory_authority') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'mines', label: 'Mines', icon: <Layers className="w-4 h-4" /> },
        { id: 'compliance', label: 'Compliance', icon: <FileCheck className="w-4 h-4" /> },
        { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'actions_required', label: 'Actions Required', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'audit_history', label: 'Audit History', icon: <History className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
      ];
    }

    if (role === 'system_admin') {
      return [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'system_health', label: 'System Health', icon: <Activity className="w-4 h-4" /> },
        { id: 'users_roles', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
        { id: 'data_storage', label: 'Data & Storage', icon: <Database className="w-4 h-4" /> },
        { id: 'ai_system', label: 'AI System', icon: <Cpu className="w-4 h-4" /> },
        { id: 'activity_logs', label: 'Activity Logs', icon: <ListTree className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> }
      ];
    }

    // SIH Evaluator Demo
    return [
      { id: 'overview', label: 'Demo Dashboard', icon: <Award className="w-4 h-4" /> },
      { id: 'sih_incident', label: 'Safety Incident', icon: <AlertCircle className="w-4 h-4" /> },
      { id: 'sih_ai', label: 'AI Analysis', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'sih_compliance', label: 'Compliance Check', icon: <FileCheck className="w-4 h-4" /> },
      { id: 'sih_history', label: 'Complete History', icon: <History className="w-4 h-4" /> },
      { id: 'sih_explore', label: 'Explore Platform', icon: <ChevronRight className="w-4 h-4" /> }
    ];
  };

  const navItems = getNavItems();

  const handleNavClick = (itemId) => {
    // Make sure we are on the current role's main dashboard view
    const role = currentUser?.role || 'safety_officer';
    let targetView = 'safety_officer_dashboard';
    if (role === 'field_worker') targetView = 'worker_dashboard';
    else if (role === 'corporate_management') targetView = 'corporate_dashboard';
    else if (role === 'regulatory_authority') targetView = 'regulatory_dashboard';
    else if (role === 'system_admin') targetView = 'admin_dashboard';
    else if (role === 'sih_evaluator') targetView = 'sih_evaluator';

    setActiveView(targetView);
    setActiveSubTab(itemId);
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#121213] border-r border-[#51443d]/60 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-left duration-200">
        
        {/* Top: Header with close */}
        <div>
          <div className="p-4 border-b border-[#353534] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#e9c176]/50 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-[#ffe3d3]" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white font-['Sora'] leading-tight">
                  COAL<span className="text-[#f6b994]">GUARD</span> AI
                </h2>
                <p className="text-[10px] text-[#9e8d85] font-mono">Navigation Menu</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-[#1a1919] hover:bg-[#252423] text-[#d6c3b9] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current User Card */}
          <div className="p-4 bg-[#181717] border-b border-[#353534]/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8d5d3e]/40 to-[#252423] border border-[#8d5d3e] flex items-center justify-center text-[#ffe3d3] font-bold text-base font-['Sora'] shrink-0 shadow">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-white truncate font-['Sora']">
                  {currentUser?.name || 'Operator'}
                </h3>
                <p className="text-[11px] text-[#f6b994] font-mono truncate">
                  {currentUser?.roleTitle}
                </p>
                <p className="text-[10px] text-[#9e8d85] font-mono truncate">
                  {currentUser?.organization}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9e8d85] px-3 py-1.5">
              {currentUser?.roleTitle} Menu
            </p>

            {navItems.map((item) => {
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-[#8d5d3e]/30 to-[#8d5d3e]/10 text-white font-bold border border-[#f6b994]/50 shadow-md'
                      : 'text-[#d6c3b9] hover:bg-[#1f1e1e] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#f6b994]' : 'text-[#9e8d85]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#8d5d3e] text-[#ffe3d3] text-[10px] font-bold">
                      {item.badge}
                    </span>
                  ) : isActive ? (
                    <ArrowRight className="w-3.5 h-3.5 text-[#f6b994]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#353534] bg-[#141415] space-y-2">
          
          <button
            onClick={() => {
              setActiveView('landing');
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1c1b1b] hover:bg-[#252423] text-xs font-mono text-[#d6c3b9] hover:text-white transition-all border border-[#353534]"
          >
            <span>Public Showcase</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-mono text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors border border-red-900/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

        </div>

      </div>
    </>
  );
};
