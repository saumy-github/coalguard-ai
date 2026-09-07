import React, { type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
}

export const EmptyState = ({
  icon,
  title = 'No records found',
  description = 'Everything is currently up to date.',
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <div className="bg-limestone rounded-card p-12 text-center flex flex-col items-center justify-center my-4">
      <div className="w-12 h-12 rounded-full bg-pumice flex items-center justify-center text-obsidian mb-4">
        {icon || <ShieldCheck className="w-6 h-6" />}
      </div>
      <h3 className="text-lg font-display text-obsidian mb-1">
        {title}
      </h3>
      <p className="text-sm text-obsidian/60 max-w-md mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-bronze px-6 py-3 text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
