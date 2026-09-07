import React from 'react';

export interface StatusBadgeProps {
  status: string;
  label?: string;
}

// Caldera's palette is deliberately constrained to Ember/Plasma Violet/Sulfur
// (DESIGN.md's "Don't ... introduce additional accent colors"), but a status
// badge needs to distinguish good/attention/bad at a glance — Sulfur doubles
// as the "needs attention" tone here since it's the system's only other
// chromatic color, and Ember (already the primary-action color) reads as
// "critical" rather than introducing a fourth hue like red.
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
        return 'bg-obsidian text-chalk';

      case 'warning':
      case 'action_required':
      case 'in_progress':
      case 'in_investigation':
      case 'medium':
      case 'conditional':
        return 'bg-sulfur text-obsidian';

      case 'critical':
      case 'danger':
      case 'fail':
      case 'high':
        return 'bg-ember text-chalk';

      case 'info':
      case 'low':
      case 'pending':
      default:
        return 'bg-pumice text-obsidian';
    }
  };

  const displayText = label || (status ? status.replace(/_/g, ' ').toUpperCase() : 'STATUS');

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium ${getBadgeStyle()}`}>
      {displayText}
    </span>
  );
};
