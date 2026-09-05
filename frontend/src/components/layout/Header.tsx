import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import {
  Menu,
  Search,
  Bell,
  ShieldAlert,
  Wifi,
  WifiOff
} from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const token = useAuthStore((state) => state.token);
  const { toggleSidebar, setSearchOpen, setNotificationsOpen, isOfflineMode, setIsOfflineMode } = useUIStore();
  const notifications = useDashboardDataStore((state) => state.notifications);

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const isChromeHidden = location.pathname === '/' || location.pathname === '/login';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Overview';
      case '/login': return 'Operator Login';
      case '/worker': return 'New Inspection';
      case '/dashboard': return 'Mine Safety Command';
      default: return 'Mine Safety';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0f0c09]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-4">
          {!isChromeHidden && (
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
            onClick={() => navigate('/')}
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">

          {token && (
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/5 transition-all"
              title="Toggle offline-mode preview"
            >
              {isOfflineMode ? <WifiOff className="w-4 h-4 text-red-400" /> : <Wifi className="w-4 h-4 text-lime-400" />}
              <span className="text-slate-300">{isOfflineMode ? 'Offline' : 'Online'}</span>
            </button>
          )}

          {!isChromeHidden && (
            <button
              id="header-search-btn"
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
              title="Search records and safety rules"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {!isChromeHidden && (
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

        </div>

      </div>
    </header>
  );
};
