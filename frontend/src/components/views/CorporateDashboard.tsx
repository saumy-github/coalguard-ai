import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { fetchCombinedIssues, normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import {
  fetchMines,
  fetchRegulatoryReports,
  groupIntoThreads,
  REPORT_STATUS_BADGE,
  type Mine,
  type RegulatoryReport,
} from '../../utils/regulatoryReports';
import { api } from '../../utils/api';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { IssueRow } from '../common/IssueRow';
import { StatusBadge } from '../common/StatusBadge';
import { AlertTriangle, ShieldAlert, HardHat } from 'lucide-react';

// 1. Overview — /dashboard/corporate — the only real Corporate page so far
// (research/saumy/09-changes-5-sep.md Decision #11): a cross-mine
// safety-issue overview *and* queue on one page, since there's no separate
// full-queue route in Decision #16's tree the way Safety Officer got.
// Production, compliance, ESG, forecasts, and reports all stay mock/deferred
// and were removed from this file entirely — see 09's "remove now" table.
export const CorporateOverviewPage = () => {
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

  const openIssues = issues.filter((issue) => issue.status === 'open');
  const openSiteCount = openIssues.filter((issue) => issue.kind === 'Site').length;
  const openPersonCount = openIssues.filter((issue) => issue.kind === 'Person').length;
  const hasSevereOpenIssue = openIssues.some(
    (issue) => normalizeSeverity(issue.severity) !== 'low' && normalizeSeverity(issue.severity) !== 'medium'
  );

  const summaryCards = [
    {
      title: 'Open Site Issues',
      value: `${openSiteCount}`,
      subtext: 'Across your assigned mines',
      icon: <ShieldAlert className="w-5 h-5" />,
      status: openSiteCount > 0 ? 'warning' : 'safe',
      statusLabel: openSiteCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Open Worker/PPE Issues',
      value: `${openPersonCount}`,
      subtext: 'Across your assigned mines',
      icon: <HardHat className="w-5 h-5" />,
      status: openPersonCount > 0 ? 'warning' : 'safe',
      statusLabel: openPersonCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="Corporate Safety Overview"
        subtitle="Site and worker safety issues across every mine assigned to you."
        badge="Enterprise Safety"
        summaryCards={summaryCards}
        attentionAlert={
          hasSevereOpenIssue ? (
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-chalk/20 text-chalk shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-display text-chalk tracking-tight">High/critical severity issue open</h4>
                <p className="text-sm text-chalk/80 mt-1.5 leading-relaxed">
                  At least one of your assigned mines has an open issue needing immediate attention.
                </p>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Safety Issues Queue"
            subtitle="All open and resolved issues across your assigned mines, most severe and most recent first."
          />
          <div className="space-y-4">
            {issues.length === 0 && (
              <p className="text-sm text-obsidian/60 text-center py-6">
                No safety issues reported at any of your assigned mines.
              </p>
            )}
            {issues.map((issue) => (
              <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} showMine />
            ))}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Reports — /dashboard/corporate/reports — submit a compliance report for
// an assigned mine, and see the response thread (Phase 7, Decision #13's
// trimmed report/verification loop). Not in Decision #16's original tree —
// that was written before this workflow existed; a natural in-scope
// extension of Corporate's route tree now that it does.
export const CorporateReportsPage = () => {
  const [mines, setMines] = useState<Mine[]>([]);
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [selectedMineId, setSelectedMineId] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [avgResolutionHours, setAvgResolutionHours] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = async () => {
    try {
      const [mineList, reportList] = await Promise.all([fetchMines(), fetchRegulatoryReports()]);
      setMines(mineList);
      setReports(reportList);
      setSelectedMineId((current) => current || mineList[0]?.id || '');
    } catch {
      // Non-critical — page just shows empty state if this fails.
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const threads = groupIntoThreads(reports);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMineId || !reportingPeriod.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/regulatory-reports', {
        mine_id: selectedMineId,
        reporting_period: reportingPeriod,
        average_resolution_time_hours: avgResolutionHours ? Number(avgResolutionHours) : undefined,
        notes: notes || undefined,
      });
      setReportingPeriod('');
      setAvgResolutionHours('');
      setNotes('');
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Compliance Reports"
        subtitle="Submit a periodic compliance report for one of your assigned mines, and track the regulator's response."
        badge="Reporting"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 max-w-xl mt-4">
          <SectionHeader
            title="Submit New Report"
            subtitle="Issue counts are computed automatically from real records — only the resolution time and notes are yours to declare."
          />
          {mines.length === 0 ? (
            <p className="text-sm text-obsidian/60">No assigned mines to report for.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-wider mb-2 block">Mine</label>
                <select
                  value={selectedMineId}
                  onChange={(e) => setSelectedMineId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50"
                >
                  {mines.map((mine) => (
                    <option key={mine.id} value={mine.id}>{mine.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-wider mb-2 block">Reporting Period</label>
                <input
                  type="text"
                  required
                  value={reportingPeriod}
                  onChange={(e) => setReportingPeriod(e.target.value)}
                  placeholder="e.g. September 2026"
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-wider mb-2 block">Declared Avg. Resolution Time (hours, optional)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={avgResolutionHours}
                  onChange={(e) => setAvgResolutionHours(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-wider mb-2 block">Declaration / Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader title="Report History" subtitle="Every submission and the regulator's response, per mine." />
          {threads.length === 0 && (
            <p className="text-sm text-obsidian/60 text-center py-6">No reports submitted yet.</p>
          )}
          {threads.map((t) => {
            const mine = mines.find((m) => m.id === t.mineId);
            return (
              <div key={`${t.mineId}-${t.reportingPeriod}`} className="space-y-3">
                <SectionHeader title={`${mine?.name ?? t.mineId} — ${t.reportingPeriod}`} />
                {t.thread.map((report) => (
                  <div key={report.id} className="p-4 rounded-2xl bg-pumice border border-obsidian/10">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-sm font-bold text-obsidian">
                        {report.report_type === 'corporate_submission' ? 'Your Submission' : "Regulator's Response"}
                      </span>
                      <StatusBadge status={REPORT_STATUS_BADGE[report.status]} label={report.status.toUpperCase()} />
                    </div>
                    <p className="text-xs font-mono text-obsidian/50 mt-2">
                      {new Date(report.submitted_at).toLocaleString()} · {report.total_safety_issues} issues, {report.critical_issues} critical, {report.resolved_issues} resolved
                    </p>
                    {report.notes && <p className="text-sm text-obsidian/70 mt-2">{report.notes}</p>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/corporate/profile — read-only, sourced only from
// GET /auth/me's real fields, same treatment as Worker/Safety Officer.
export const CorporateProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Corporate Management Profile"
        subtitle="Your account identity, as recorded by the system."
        badge="Executive Record"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ember/5 rounded-full blur-[80px]"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-obsidian/10 relative z-10">
            <div className="w-20 h-20 rounded-full bg-ember flex items-center justify-center text-chalk text-3xl font-display">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-obsidian tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-ember mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-obsidian/70 relative z-10">
            <div className="flex justify-between items-center py-2 border-b border-obsidian/10">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Email</span>
              <span className="text-obsidian">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-obsidian/10">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-obsidian">{user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-obsidian/10">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Assigned Mine(s)</span>
              <span className="text-obsidian">{user?.mines?.length ? `${user.mines.length} assigned` : 'None assigned'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
