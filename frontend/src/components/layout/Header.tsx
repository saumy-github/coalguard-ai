import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  Menu
} from 'lucide-react';
import { CoalGuardLogo } from '../common/CoalGuardLogo';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { toggleSidebar } = useUIStore();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-6 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-4">
          {!isChromeHidden && (
            <button
              id="header-hamburger-btn"
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30 flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:border-blue-400 transition-all duration-300">
              <CoalGuardLogo className="w-5 h-5 text-blue-500" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-xl text-white">
                  COAL<span className="text-blue-500">GUARD</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono leading-none tracking-widest uppercase mt-0.5">
                Mine Safety Platform
              </p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
