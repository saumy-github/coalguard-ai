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
        return 'bg-lime-500/15 text-lime-400 border-lime-500/30';

      case 'warning':
      case 'action_required':
      case 'in_progress':
      case 'in_investigation':
      case 'medium':
      case 'conditional':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';

      case 'critical':
      case 'danger':
      case 'fail':
      case 'high':
        return 'bg-red-500/15 text-red-400 border-red-500/30';

      case 'info':
      case 'low':
      case 'pending':
      default:
        return 'bg-[#8d5d3e]/20 text-[#f6b994] border-[#8d5d3e]/40';
    }
  };

  const displayText = label || (status ? status.replace(/_/g, ' ').toUpperCase() : 'STATUS');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {displayText}
    </span>
  );
};
