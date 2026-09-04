import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Menu, 
  Search, 
  Bell, 
  ShieldAlert, 
  ChevronDown, 
  HardHat, 
  Activity, 
  Building2, 
  Landmark, 
  Sliders, 
  Award,
  LogOut,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';

export const Header = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    setActiveSubTab,
    toggleSidebar, 
    setSearchOpen, 
    setNotificationsOpen,
    notifications,
    loginAsRole,
    logout,
    isOfflineMode,
    setIsOfflineMode
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles = [
    { key: 'field_worker', title: 'Field Worker', subtitle: 'Underground Operations', icon: <HardHat className="w-4 h-4 text-amber-400" /> },
    { key: 'safety_officer', title: 'Mine Safety Officer', subtitle: 'Pit-Head Safety Command', icon: <Activity className="w-4 h-4 text-amber-400" /> },
    { key: 'corporate_management', title: 'Corporate Exec', subtitle: 'Enterprise & ESG Governance', icon: <Building2 className="w-4 h-4 text-stone-400" /> },
    { key: 'regulatory_authority', title: 'DGMS Regulatory', subtitle: 'Directorate General of Mines Safety', icon: <Landmark className="w-4 h-4 text-purple-400" /> },
    { key: 'system_admin', title: 'System Admin', subtitle: 'System Health & Security', icon: <Sliders className="w-4 h-4 text-orange-400" /> },
    { key: 'sih_evaluator', title: 'SIH Evaluator', subtitle: 'Interactive 60s Demo Suite', icon: <Award className="w-4 h-4 text-rose-400" /> }
  ];

  const getPageTitle = () => {
    switch (activeView) {
      case 'landing': return 'Overview';
      case 'login': return 'Operator Login';
      case 'worker_dashboard': return 'Worker Dashboard';
      case 'safety_officer_dashboard': return 'Mine Safety Command';
      case 'corporate_dashboard': return 'Corporate Executive';
      case 'regulatory_dashboard': return 'Regulatory Authority';
      case 'admin_dashboard': return 'System Administration';
      case 'sih_evaluator': return 'SIH 2026 Evaluation Hub';
      default: return 'Mine Safety';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0f0c09]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-4">
          {activeView !== 'landing' && activeView !== 'login' && (
            <button
              id="header-hamburger-btn"
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:border-amber-400 transition-all duration-300">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-lg text-white font-['Sora']">
                  COAL<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">GUARD</span> AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-none tracking-widest uppercase mt-0.5">
                Mine Safety Platform
              </p>
            </div>
          </div>
        </div>

        {/* Center: Current Page Title Tag */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-xs font-mono text-slate-300 font-medium">
            {getPageTitle()}
          </span>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Quick Demo SIH shortcut */}
          <button
            onClick={() => loginAsRole('sih_evaluator')}
            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>SIH Demo Suite</span>
          </button>

          {/* Search Button */}
          {activeView !== 'landing' && activeView !== 'login' && (
            <button
              id="header-search-btn"
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
              title="Search records and safety rules"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Notifications Button */}
          {activeView !== 'landing' && activeView !== 'login' && (
            <button
              id="header-notif-btn"
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-[#0f0c09] shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile & Role Switcher Dropdown removed per user request */}
        </div>

      </div>
    </header>
  );
};
