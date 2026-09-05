import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { fetchCombinedIssues, normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { IssueRow } from '../common/IssueRow';
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  HardHat,
  ChevronRight
} from 'lucide-react';

function useCombinedIssues() {
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIssues(await fetchCombinedIssues());
      } catch {
        // Non-critical — page just shows nothing if this fails.
      }
    };
    load();
  }, []);

  return issues;
}

// 1. Dashboard Overview — /dashboard/safety
export const SafetyOverviewPage = () => {
  const issues = useCombinedIssues();
  const openIssues = issues.filter((issue) => issue.status === 'open');
  const openSiteCount = openIssues.filter((issue) => issue.kind === 'Site').length;
  const openPersonCount = openIssues.filter((issue) => issue.kind === 'Person').length;
  const hasSevereOpenIssue = openIssues.some((issue) => normalizeSeverity(issue.severity) !== 'low' && normalizeSeverity(issue.severity) !== 'medium');
  const recentOpen = openIssues.slice(0, 3);

  const summaryCards = [
    {
      title: 'Open Site Issues',
      value: `${openSiteCount}`,
      subtext: 'Gas, ventilation, equipment',
      icon: <ShieldAlert className="w-5 h-5" />,
      status: openSiteCount > 0 ? 'warning' : 'safe',
      statusLabel: openSiteCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Open Worker/PPE Issues',
      value: `${openPersonCount}`,
      subtext: 'Helmet, vest, unsafe practice',
      icon: <HardHat className="w-5 h-5" />,
      status: openPersonCount > 0 ? 'warning' : 'safe',
      statusLabel: openPersonCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="Mine Safety Dashboard"
        subtitle="Real-time site and worker safety issues across your assigned mine."
        badge="Safety Command"
        summaryCards={summaryCards}
        headerActions={
          <Link
            to="/dashboard/safety/issues"
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>View Safety Issues</span>
          </Link>
        }
        attentionAlert={
          hasSevereOpenIssue ? (
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-rose-100 tracking-tight">High/critical severity issue open</h4>
                <p className="text-sm text-rose-200/80 mt-1.5 leading-relaxed">
                  At least one open issue needs immediate attention — see the Safety Issues queue for details.
                </p>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Recent Unresolved Issues"
            subtitle="Most severe and most recent open items."
            action={
              <Link
                to="/dashboard/safety/issues"
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View Full Queue</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            }
          />
          <div className="space-y-4">
            {recentOpen.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No open issues right now.</p>
            )}
            {recentOpen.map((issue) => (
              <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
            ))}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Safety Issues — /dashboard/safety/issues — full combined queue
export const SafetyIssuesPage = () => {
  const issues = useCombinedIssues();

  return (
    <DashboardLayout>
      <PageLayout
        title="Safety Issues Queue"
        subtitle="All site and worker/PPE safety issues at your mine, most severe and most recent first."
        badge="Issue Command"
      >
        <div className="space-y-4 mt-4">
          {issues.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400">
              No safety issues reported yet.
            </div>
          )}
          {issues.map((issue) => (
            <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
          ))}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/safety/profile — read-only, sourced only from
// GET /auth/me's real fields (research/saumy/09-changes-5-sep.md Decision #10,
// same treatment as Worker).
export const SafetyProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Safety Officer Profile"
        subtitle="Your account identity, as recorded by the system."
        badge="Officer Record"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-linear-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-emerald-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
              {user?.is_guest && (
                <p className="text-xs text-slate-400 mt-1">Guest session</p>
              )}
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Email</span>
              <span className="text-white">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-white">{user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Assigned Mine(s)</span>
              <span className="text-white">{user?.mine_ids?.length ? `${user.mine_ids.length} assigned` : 'None assigned'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
