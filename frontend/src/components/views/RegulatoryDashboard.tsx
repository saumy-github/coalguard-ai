import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import {
  fetchMines,
  fetchRegulatoryReports,
  groupIntoThreads,
  REPORT_STATUS_BADGE,
  type Mine,
  type RegulatoryReport,
  type ReportThread,
} from '../../utils/regulatoryReports';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Landmark, FileCheck, AlertCircle, MapPin } from 'lucide-react';

function useMinesAndReports() {
  const [mines, setMines] = useState<Mine[]>([]);
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = async () => {
    try {
      const [mineList, reportList] = await Promise.all([fetchMines(), fetchRegulatoryReports()]);
      setMines(mineList);
      setReports(reportList);
    } catch {
      // Non-critical — pages just show empty state if this fails.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { mines, reports, isLoading, reload };
}

function threadForMine(threads: ReportThread[], mineId: string): ReportThread | undefined {
  return threads.find((t) => t.mineId === mineId);
}

// 1. Overview — /dashboard/regulatory — aggregate KPIs only, no raw incident feed.
export const RegulatoryOverviewPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  const minesReporting = threads.length;
  const awaitingReview = threads.filter((t) => t.latest.report_type === 'corporate_submission').length;
  const totalIssues = threads.reduce((sum, t) => sum + t.latest.total_safety_issues, 0);
  const criticalIssues = threads.reduce((sum, t) => sum + t.latest.critical_issues, 0);
  const declaredTimes = reports
    .map((r) => r.average_resolution_time_hours)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgResolutionHours = declaredTimes.length
    ? declaredTimes.reduce((a, b) => a + b, 0) / declaredTimes.length
    : null;
  const verifiedCount = threads.filter((t) => t.latest.status === 'verified').length;

  const summaryCards = [
    {
      title: 'Mines Reporting',
      value: `${minesReporting}/${mines.length}`,
      subtext: 'Have submitted at least one report',
      icon: <Landmark className="w-5 h-5" />,
      status: 'safe',
      statusLabel: 'TRACKED',
    },
    {
      title: 'Awaiting Review',
      value: `${awaitingReview}`,
      subtext: 'Corporate submissions with no response yet',
      icon: <AlertCircle className="w-5 h-5" />,
      status: awaitingReview > 0 ? 'warning' : 'safe',
      statusLabel: awaitingReview > 0 ? 'ACTION NEEDED' : 'CLEAR',
    },
    {
      title: 'Reported Issues',
      value: `${totalIssues}`,
      subtext: `${criticalIssues} critical, per latest reports`,
      icon: <FileCheck className="w-5 h-5" />,
      status: criticalIssues > 0 ? 'warning' : 'safe',
      statusLabel: criticalIssues > 0 ? 'REVIEW' : 'CLEAR',
    },
    {
      title: 'Compliance State',
      value: `${verifiedCount}/${threads.length || 0}`,
      subtext: 'Reports verified · declared avg. resolution: ' + (avgResolutionHours !== null ? `${avgResolutionHours.toFixed(1)}h` : '—'),
      icon: <Landmark className="w-5 h-5" />,
      status: 'safe',
      statusLabel: 'SUMMARY',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="DGMS Regulatory Authority Dashboard"
        subtitle="Aggregate compliance status across every mine under Corporate Management assignment."
        badge="DGMS Oversight"
        summaryCards={summaryCards}
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <SectionHeader
            title="Reports Awaiting Response"
            subtitle="Corporate submissions with no regulatory response yet."
          />
          {threads.filter((t) => t.latest.report_type === 'corporate_submission').length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Nothing awaiting review.</p>
          )}
          {threads
            .filter((t) => t.latest.report_type === 'corporate_submission')
            .map((t) => {
              const mine = mines.find((m) => m.id === t.mineId);
              return (
                <div key={`${t.mineId}-${t.reportingPeriod}`} className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">{mine?.name ?? t.mineId}</h4>
                    <p className="text-xs font-mono text-slate-400 mt-1">{t.reportingPeriod} · {t.latest.total_safety_issues} issues reported ({t.latest.critical_issues} critical)</p>
                  </div>
                  <StatusBadge status={REPORT_STATUS_BADGE[t.latest.status]} label={t.latest.status.toUpperCase()} />
                </div>
              );
            })}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Mines — /dashboard/regulatory/mines — one card per assigned mine.
// Cards, not a real map widget: this codebase has no geo-mapping library and
// adding one to plot two points isn't worth it (research/saumy/
// 10-frontend-coding-plan.md Phase 7).
export const RegulatoryMinesPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  return (
    <DashboardLayout>
      <PageLayout
        title="Assigned Mines"
        subtitle="Every mine currently under a Corporate Management assignment."
        badge="Mine Registry"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {mines.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400 md:col-span-2">
              No mines currently under Corporate Management.
            </div>
          )}
          {mines.map((mine) => {
            const thread = threadForMine(threads, mine.id);
            return (
              <div key={mine.id} className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-3">
                <h4 className="text-base font-bold text-white tracking-wide">{mine.name}</h4>
                {mine.lat !== null && mine.lng !== null && (
                  <p className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {mine.lat.toFixed(4)}, {mine.lng.toFixed(4)}
                  </p>
                )}
                {thread ? (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-sm font-mono">
                    <span className="text-slate-300">{thread.latest.total_safety_issues} issues · {thread.latest.critical_issues} critical</span>
                    <StatusBadge status={REPORT_STATUS_BADGE[thread.latest.status]} label={thread.latest.status.toUpperCase()} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 pt-2 border-t border-white/5">No reports yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Compliance — /dashboard/regulatory/compliance — current status per mine, with a respond action.
export const RegulatoryCompliancePage = () => {
  const { mines, reports, reload } = useMinesAndReports();
  const threads = groupIntoThreads(reports);
  const [respondingTo, setRespondingTo] = useState<RegulatoryReport | null>(null);
  const [status, setStatus] = useState<'under_review' | 'verified' | 'disputed'>('verified');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openRespond = (report: RegulatoryReport) => {
    setRespondingTo(report);
    setStatus('verified');
    setNotes('');
  };

  const submitRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingTo) return;
    setIsSubmitting(true);
    try {
      await api.post(`/regulatory-reports/${respondingTo.id}/respond`, { status, notes: notes || undefined });
      setRespondingTo(null);
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Compliance Status"
        subtitle="Current status per mine, derived from the most recent report in its thread."
        badge="Compliance"
      >
        <div className="space-y-4 mt-4">
          {mines.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400">
              No mines currently under Corporate Management.
            </div>
          )}
          {mines.map((mine) => {
            const thread = threadForMine(threads, mine.id);
            const canRespond = thread?.latest.report_type === 'corporate_submission';
            return (
              <div key={mine.id} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">{mine.name}</h4>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    {thread ? `${thread.reportingPeriod} · ${thread.latest.total_safety_issues} issues, ${thread.latest.critical_issues} critical` : 'No reports yet'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {thread && <StatusBadge status={REPORT_STATUS_BADGE[thread.latest.status]} label={thread.latest.status.toUpperCase()} />}
                  {canRespond && thread && (
                    <button
                      onClick={() => openRespond(thread.latest)}
                      className="btn-primary-earth px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      Respond
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {respondingTo && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 mt-6 max-w-xl">
            <SectionHeader title="Respond to Report" subtitle={respondingTo.reporting_period} />
            <form onSubmit={submitRespond} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">Decision</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                  <option value="under_review">Under Review</option>
                  <option value="verified">Verified</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 block">Findings</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Findings from cross-checking against real issue counts..."
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Response'}
                </button>
                <button
                  type="button"
                  onClick={() => setRespondingTo(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </PageLayout>
    </DashboardLayout>
  );
};

// 4. Reports — /dashboard/regulatory/reports — full chronological thread per mine.
export const RegulatoryReportsPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  return (
    <DashboardLayout>
      <PageLayout
        title="Regulatory Reports"
        subtitle="Every submission and verification, in full — nothing is ever overwritten, only added to."
        badge="Report History"
      >
        <div className="space-y-6 mt-4">
          {threads.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400">
              No reports yet.
            </div>
          )}
          {threads.map((t) => {
            const mine = mines.find((m) => m.id === t.mineId);
            return (
              <div key={`${t.mineId}-${t.reportingPeriod}`} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
                <SectionHeader title={`${mine?.name ?? t.mineId} — ${t.reportingPeriod}`} />
                <div className="space-y-3">
                  {t.thread.map((report) => (
                    <div key={report.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {report.report_type === 'corporate_submission' ? 'Corporate Submission' : 'Regulatory Verification'}
                        </span>
                        <StatusBadge status={REPORT_STATUS_BADGE[report.status]} label={report.status.toUpperCase()} />
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-2">
                        {new Date(report.submitted_at).toLocaleString()} · {report.total_safety_issues} issues, {report.critical_issues} critical, {report.resolved_issues} resolved
                      </p>
                      {report.average_resolution_time_hours !== null && (
                        <p className="text-xs font-mono text-amber-400 mt-1">
                          Declared avg. resolution time: {report.average_resolution_time_hours}h
                        </p>
                      )}
                      {report.notes && <p className="text-sm text-slate-300 mt-2">{report.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 5. Profile — /dashboard/regulatory/profile — read-only, sourced only from
// GET /auth/me's real fields, same treatment as every other role.
export const RegulatoryProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Regulatory Authority Profile"
        subtitle="Your account identity, as recorded by the system."
        badge="Inspector Record"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-amber-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
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
