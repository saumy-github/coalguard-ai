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

      {/* 1. Page Header (Graphite Theme) */}
      <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 border border-white/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-6 animate-3d-enter">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="px-3 py-1 rounded-md text-[11px] font-mono bg-white/10 text-zinc-300 border border-white/10 font-bold uppercase tracking-widest">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-zinc-400 mt-2 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {headerActions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {headerActions}
          </div>
        )}
      </div>

      {/* 2. Summary Cards (3-4 Cards) */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {summaryCards.map((card, idx) => (
            <div key={idx} className={`animate-3d-enter stagger-${(idx % 4) + 1}`}>
              <SummaryCard {...card} />
            </div>
          ))}
        </div>
      )}

      {/* 3. Attention Alert (What Needs Attention?) */}
      {attentionAlert && (
        <div className="bg-red-950/20 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-red-500/20 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500 rounded-l-2xl"></div>
          {attentionAlert}
        </div>
      )}

      {/* 4. Main Content Area */}
      <div className="space-y-6 animate-3d-enter stagger-2">
        {children}
      </div>

      {/* 5. More Details / Bottom Section */}
      {detailedSection && (
        <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
          {detailedSection}
        </div>
      )}

    </div>
  );
};
