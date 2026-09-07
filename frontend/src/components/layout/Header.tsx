import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  Menu,
  ShieldAlert
} from 'lucide-react';

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
    <header className="sticky top-0 z-40 w-full bg-pumice/90 backdrop-blur-md px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-4">
          {!isChromeHidden && (
            <button
              id="header-hamburger-btn"
              onClick={toggleSidebar}
              className="p-2.5 rounded-pill bg-limestone hover:bg-chalk text-obsidian transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-ember flex items-center justify-center transition-opacity group-hover:opacity-85">
              <ShieldAlert className="w-5 h-5 text-chalk" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-lg text-obsidian tracking-wide">
                COAL<span className="text-ember">GUARD</span> AI
              </span>
              <p className="text-[10px] text-obsidian/50 leading-none tracking-widest uppercase mt-1">
                Mine Safety Platform
              </p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
