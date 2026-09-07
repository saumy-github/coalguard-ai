import React, { type ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';

export interface SummaryCardProps {
  title: ReactNode;
  value: ReactNode;
  subtext?: ReactNode;
  icon?: ReactNode;
  status?: string;
  statusLabel?: string;
  trend?: ReactNode;
  onClick?: () => void;
  className?: string;
  // DESIGN.md's Stat Feature Card is Ember-filled/Chalk-text — reserved for
  // the single most important metric per screen so it doesn't dilute into
  // "everything is emphasized". Other cards stay on the plain Limestone
  // surface. Off by default; each dashboard picks which card (usually one)
  // deserves it.
  featured?: boolean;
}

export const SummaryCard = ({
  title,
  value,
  subtext,
  icon,
  status,
  statusLabel,
  trend,
  onClick,
  className = '',
  featured = false,
}: SummaryCardProps) => {
  const surface = featured ? 'bg-ember text-chalk' : 'bg-limestone text-obsidian';
  const mutedText = featured ? 'text-chalk/70' : 'text-obsidian/60';
  const iconWrap = featured ? 'bg-chalk/15 text-chalk' : 'bg-pumice text-obsidian';
  const dividerBorder = featured ? 'border-chalk/20' : 'border-obsidian/10';

  return (
    <div
      onClick={onClick}
      className={`rounded-card p-6 flex flex-col justify-between transition-opacity ${surface} ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-sm font-medium ${mutedText}`}>
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-full ${iconWrap}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="my-1 flex items-baseline justify-between gap-2">
        <h3 className="text-4xl font-display">
          {value}
        </h3>
        {status && <StatusBadge status={status} label={statusLabel} />}
      </div>

      <div className={`mt-3 flex items-center justify-between text-xs pt-3 border-t ${dividerBorder} ${mutedText}`}>
        <span className="truncate">{subtext}</span>
        {trend && (
          <span className="font-medium shrink-0 ml-2">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
