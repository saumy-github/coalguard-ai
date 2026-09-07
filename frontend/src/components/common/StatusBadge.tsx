import React from 'react';

export interface StatusBadgeProps {
  status: string;
  label?: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'safe':
      case 'optimal':
      case 'passed':
      case 'resolved':
      case 'verified_closed':
      case 'active':
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]';

      case 'warning':
      case 'action_required':
      case 'in_progress':
      case 'in_investigation':
      case 'medium':
      case 'conditional':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]';

      case 'critical':
      case 'danger':
      case 'fail':
      case 'high':
        return 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]';

      case 'info':
      case 'low':
      case 'pending':
      default:
        return 'bg-zinc-800 text-zinc-300 border-white/10';
    }
  };

  const displayText = label || (status ? status.replace(/_/g, ' ').toUpperCase() : 'STATUS');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest border ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shadow-sm" />
      {displayText}
    </span>
  );
};
