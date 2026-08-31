import React from 'react';

export const SectionHeader = ({ title, subtitle, badge, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#353534]/60">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-white font-['Sora'] tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8d5d3e]/20 text-[#f6b994] border border-[#8d5d3e]/40 font-semibold">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#9e8d85] font-mono mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};
