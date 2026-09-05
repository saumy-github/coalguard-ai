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
      className={`glass-card rounded-xl p-4 sm:p-5 border border-[#51443d]/50 flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-[#f6b994]/60 hover:bg-[#1f1e1e]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-medium text-[#9e8d85] uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-[#252423] text-[#f6b994] border border-[#51443d]/40">
            {icon}
          </div>
        )}
      </div>

      <div className="my-1 flex items-baseline justify-between gap-2">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Sora'] tracking-tight">
          {value}
        </h3>
        {status && <StatusBadge status={status} label={statusLabel} />}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-mono text-[#d6c3b9] pt-2 border-t border-[#353534]/50">
        <span className="truncate">{subtext}</span>
        {trend && (
          <span className="text-[11px] text-[#f6b994] font-semibold shrink-0 ml-2">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
