import React from 'react';

export const CoalGuardLogo = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Hexagon Shield (Tech + Safety) */}
    <polygon points="12 2 22 7 22 17 12 22 2 17 2 7" />
    
    {/* Downward Triangle (Mine Shaft) */}
    <polygon points="8 9 16 9 12 15" />
    
    {/* Lock/Chain-link detail at the bottom vertex (Cryptography) */}
    <circle cx="12" cy="18" r="1.5" />
  </svg>
);
