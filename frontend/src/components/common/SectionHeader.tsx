import React, { type ReactNode } from 'react';

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
}

export const SectionHeader = ({ title, subtitle, badge, action }: SectionHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/5">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-widest">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-zinc-400 font-medium mt-1 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
