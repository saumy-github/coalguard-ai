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
}: SummaryCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`hover-3d-lift bg-zinc-900/40 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/5 flex flex-col justify-between transition-all duration-300 shadow-xl ${
        onClick ? 'cursor-pointer hover:border-white/10 hover:bg-zinc-800/60' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {title}
        </span>
        {icon && (
          <div className="p-2.5 rounded-xl bg-black/30 text-zinc-300 border border-white/5 shadow-inner">
            {icon}
          </div>
        )}
      </div>

      <div className="my-2 flex items-end justify-between gap-3">
        <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
          {value}
        </h3>
        {status && <StatusBadge status={status} label={statusLabel} />}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-white/5 font-medium">
        <span className="truncate">{subtext}</span>
        {trend && (
          <span className="text-[11px] text-blue-400 font-bold shrink-0 ml-2 px-2 py-0.5 bg-blue-500/10 rounded-md">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
