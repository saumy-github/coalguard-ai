import React, { type ReactNode } from 'react';
import { SummaryCard, type SummaryCardProps } from './SummaryCard';

export interface PageLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  headerActions?: ReactNode;
  summaryCards?: SummaryCardProps[];
  attentionAlert?: ReactNode;
  children?: ReactNode;
  detailedSection?: ReactNode;
}

export const PageLayout = ({
  title,
  subtitle,
  badge,
  headerActions,
  summaryCards = [],
  attentionAlert,
  children,
  detailedSection,
}: PageLayoutProps) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* 1. Page Header */}
      <div className="bg-limestone rounded-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-display text-obsidian">
              {title}
            </h1>
            {badge && (
              <span className="px-3 py-1 rounded-pill text-xs font-medium bg-sulfur text-obsidian">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-obsidian/60 mt-2 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {headerActions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {headerActions}
          </div>
        )}
      </div>

      {/* 2. Summary Cards */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, idx) => (
            <SummaryCard key={idx} {...card} />
          ))}
        </div>
      )}

      {/* 3. Attention Alert — Ember, not a fourth accent color, since this is
          the same "needs action now" register as a critical StatusBadge. */}
      {attentionAlert && (
        <div className="rounded-card p-6 bg-ember text-chalk">
          {attentionAlert}
        </div>
      )}

      {/* 4. Main Content Area */}
      <div className="space-y-6">
        {children}
      </div>

      {/* 5. More Details / Bottom Section */}
      {detailedSection && (
        <div className="mt-8 pt-6 border-t border-obsidian/10 space-y-4">
          {detailedSection}
        </div>
      )}

    </div>
  );
};
