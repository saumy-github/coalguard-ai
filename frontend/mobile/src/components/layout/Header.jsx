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
    { key: 'safety_officer', title: 'Mine Safety Officer', subtitle: 'Pit-Head Safety Command', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
    { key: 'corporate_management', title: 'Corporate Exec', subtitle: 'Enterprise & ESG Governance', icon: <Building2 className="w-4 h-4 text-blue-400" /> },
    { key: 'regulatory_authority', title: 'DGMS Regulatory', subtitle: 'Directorate General of Mines Safety', icon: <Landmark className="w-4 h-4 text-purple-400" /> },
    { key: 'system_admin', title: 'System Admin', subtitle: 'System Health & Security', icon: <Sliders className="w-4 h-4 text-cyan-400" /> },
    { key: 'sih_evaluator', title: 'SIH Evaluator', subtitle: 'Interactive 60s Demo Suite', icon: <Award className="w-4 h-4 text-[#e9c176]" /> }
  ];

  const getPageTitle = () => {
    switch (activeView) {
      case 'landing':
        return 'Overview';
      case 'login':
        return 'Operator Login';
      case 'worker_dashboard':
        return 'Worker Dashboard';
      case 'safety_officer_dashboard':
        return 'Mine Safety Command';
      case 'corporate_dashboard':
        return 'Corporate Executive';
      case 'regulatory_dashboard':
        return 'Regulatory Authority';
      case 'admin_dashboard':
        return 'System Administration';
      case 'sih_evaluator':
        return 'SIH 2026 Evaluation Hub';
      default:
        return 'Mine Safety';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#111112]/95 backdrop-blur-md border-b border-[#353534]/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            id="header-hamburger-btn"
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-[#1a1919] hover:bg-[#252423] text-[#d6c3b9] hover:text-white border border-[#353534] transition-all"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#e9c176]/60 flex items-center justify-center shadow-lg group-hover:border-[#f6b994] transition-all">
              <ShieldAlert className="w-5 h-5 text-[#ffe3d3]" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-base text-white font-['Sora']">
                  COAL<span className="text-[#f6b994]">GUARD</span> AI
                </span>
              </div>
              <p className="text-[10px] text-[#9e8d85] font-mono leading-none">
                Mine Safety & Governance Platform
              </p>
            </div>
          </div>
        </div>

        {/* Center: Current Page Title Tag */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1b1b] border border-[#51443d]/40">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-[#d6c3b9] font-medium">
            {getPageTitle()}
          </span>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Demo SIH shortcut */}
          <button
            onClick={() => loginAsRole('sih_evaluator')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8d5d3e]/20 hover:bg-[#8d5d3e]/35 text-[#f6b994] border border-[#8d5d3e]/50 text-xs font-mono font-bold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SIH Demo Suite</span>
          </button>

          {/* Search Button */}
          <button
            id="header-search-btn"
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg bg-[#1a1919] hover:bg-[#252423] text-[#d6c3b9] hover:text-white border border-[#353534] transition-all"
            title="Search records and safety rules"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Button */}
          <button
            id="header-notif-btn"
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-lg bg-[#1a1919] hover:bg-[#252423] text-[#d6c3b9] hover:text-white border border-[#353534] transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#8d5d3e] text-[#ffe3d3] text-[9px] font-mono font-bold flex items-center justify-center border border-[#111112]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile & Role Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-user-menu-btn"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#1a1919] hover:bg-[#252423] border border-[#51443d]/60 hover:border-[#f6b994] transition-all group"
            >
              <div className="w-7 h-7 rounded-md bg-[#252423] border border-[#8d5d3e] flex items-center justify-center text-[#f6b994] font-bold text-xs font-['Sora'] shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left max-w-[130px] truncate">
                <p className="text-xs font-bold text-white truncate font-['Sora'] leading-tight">
                  {currentUser?.name || 'Operator'}
                </p>
                <p className="text-[10px] text-[#f6b994] truncate font-mono">
                  {currentUser?.roleTitle || 'Personnel'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9e8d85] group-hover:text-white transition-transform" />
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#161617] border border-[#51443d]/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Current User Info */}
                <div className="p-3 border-b border-[#353534]/70 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8d5d3e]/40 to-[#252423] border border-[#8d5d3e] flex items-center justify-center text-[#ffe3d3] font-bold text-base font-['Sora'] shadow shrink-0">
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate font-['Sora']">
                        {currentUser?.name}
                      </h4>
                      <p className="text-[11px] text-[#f6b994] font-mono truncate">
                        {currentUser?.roleTitle}
                      </p>
                      <p className="text-[10px] text-[#9e8d85] font-mono truncate">
                        {currentUser?.organization}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Switch Role Section */}
                <div className="px-2 py-1">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9e8d85] mb-1.5">
                    Switch Role (Demo Suite)
                  </p>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {roles.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => {
                          loginAsRole(r.key, currentUser?.name);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-all ${
                          currentUser?.role === r.key
                            ? 'bg-[#8d5d3e]/30 text-[#f6b994] border border-[#8d5d3e]/50 font-bold'
                            : 'text-[#d6c3b9] hover:bg-[#252423] hover:text-white'
                        }`}
                      >
                        <div className="p-1 rounded-md bg-[#1f1e1e]">
                          {r.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.title}</p>
                          <p className="text-[9px] text-[#9e8d85] font-mono truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sign Out */}
                <div className="mt-2 pt-2 border-t border-[#353534]/70">
                  <button
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-mono text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
