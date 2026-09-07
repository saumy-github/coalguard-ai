import React, { type ReactNode } from 'react';

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
}

export const SectionHeader = ({ title, subtitle, badge, action }: SectionHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-obsidian/10">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-display text-obsidian">
            {title}
          </h2>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-pill text-xs font-medium bg-sulfur text-obsidian">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-obsidian/60 mt-0.5">
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
