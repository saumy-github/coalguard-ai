import React from 'react';
import { SummaryCard } from './SummaryCard';
import { SectionHeader } from './SectionHeader';

export const PageLayout = ({
  title,
  subtitle,
  badge,
  headerActions,
  summaryCards = [],
  attentionAlert,
  children,
  detailedSection
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. Page Header */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 border border-[#51443d]/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-['Sora'] tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-[#8d5d3e]/20 text-[#f6b994] border border-[#8d5d3e]/40 font-bold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#d6c3b9] font-mono mt-1 max-w-3xl">
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

      {/* 2. Summary Cards (3-4 Cards) */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {summaryCards.map((card, idx) => (
            <SummaryCard key={idx} {...card} />
          ))}
        </div>
      )}

      {/* 3. Attention Alert (What Needs Attention?) */}
      {attentionAlert && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-red-500/40 bg-red-950/20 shadow-lg">
          {attentionAlert}
        </div>
      )}

      {/* 4. Main Content Area */}
      <div className="space-y-6">
        {children}
      </div>

      {/* 5. More Details / Bottom Section */}
      {detailedSection && (
        <div className="mt-8 pt-6 border-t border-[#353534]/60 space-y-4">
          {detailedSection}
        </div>
      )}

    </div>
  );
};
