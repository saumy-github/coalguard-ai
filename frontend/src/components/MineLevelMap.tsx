import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PageLayout } from './common/PageLayout';
import { SectionHeader } from './common/SectionHeader';

interface MineLevelData {
  level: string;
  section_count: number;
}

interface LocatedIssue {
  level: string;
  section: number;
  status: string;
}

export const MineLevelMap = () => {
  const [levels, setLevels] = useState<MineLevelData[]>([]);
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const { data } = await api.get<MineLevelData[]>('/mine-levels');
        setLevels(data);
      } finally {
        setIsLoading(false);
      }
    };

    const loadOpenIssues = async () => {
      // /person-issues and /site-issues don't exist yet (07-issue-collections-coding-plan.md
      // hasn't been built) — fail silently so the layout still renders with nothing highlighted.
      try {
        const [personIssues, siteIssues] = await Promise.all([
          api.get<LocatedIssue[]>('/person-issues'),
          api.get<LocatedIssue[]>('/site-issues'),
        ]);
        const open = new Set<string>();
        for (const issue of [...personIssues.data, ...siteIssues.data]) {
          if (issue.status === 'open') {
            open.add(`${issue.level}-${issue.section}`);
          }
        }
        setOpenLocations(open);
      } catch {
        setOpenLocations(new Set());
      }
    };

    loadLevels();
    loadOpenIssues();
  }, []);

  const sortedLevels = [...levels].sort((a, b) => a.level.localeCompare(b.level));

  return (
    <PageLayout
      title="Mine Level Map"
      subtitle="Underground layout by level and section — highlighted cells have an open issue."
      badge="Live Layout"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        {isLoading && <p className="text-sm font-mono text-slate-400">Loading mine layout…</p>}

        {!isLoading && sortedLevels.length === 0 && (
          <p className="text-sm font-mono text-slate-400">No levels configured for this mine yet.</p>
        )}

        {sortedLevels.map((lvl) => (
          <div key={lvl.level} className="space-y-2">
            <SectionHeader title={`Level ${lvl.level}`} subtitle={`${lvl.section_count} sections`} />
            {/* gap-px + a bg color showing through the gaps draws a shared 1px line between
                cells instead of a border per cell — reads as one connected slab of sections
                (a floor plan) rather than a row of separate buttons. */}
            <div
              className="grid gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(2.5rem, 1fr))' }}
            >
              {Array.from({ length: lvl.section_count }, (_, i) => i + 1).map((section) => {
                const hasOpenIssue = openLocations.has(`${lvl.level}-${section}`);
                return (
                  <div
                    key={section}
                    title={`Level ${lvl.level}, Section ${section}${hasOpenIssue ? ' — open issue' : ''}`}
                    className={`aspect-square flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                      hasOpenIssue ? 'bg-red-500/20 text-red-300' : 'bg-[#0d0d0f] text-slate-400'
                    }`}
                  >
                    {section}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-6 text-xs font-mono text-slate-400 pt-2 bg-white/5 p-4 rounded-xl border border-white/5">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /> Open issue
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" /> Clear
          </span>
        </div>
      </div>
    </PageLayout>
  );
};
