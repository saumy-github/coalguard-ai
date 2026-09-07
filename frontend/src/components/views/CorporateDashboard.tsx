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
import { AlertTriangle, ShieldAlert, HardHat, ShieldCheck } from 'lucide-react';

// 1. Overview — /dashboard/corporate
export const CorporateOverviewPage = () => {
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIssues(await fetchCombinedIssues());
      } catch {
        // Non-critical
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
      icon: <ShieldAlert className="w-6 h-6" />,
      status: openSiteCount > 0 ? 'warning' : 'safe',
      statusLabel: openSiteCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Open Worker/PPE Issues',
      value: `${openPersonCount}`,
      subtext: 'Across your assigned mines',
      icon: <HardHat className="w-6 h-6" />,
      status: openPersonCount > 0 ? 'warning' : 'safe',
      statusLabel: openPersonCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="Corporate Safety Overview"
        subtitle="Aggregate site and worker safety anomalies across every mine assigned to your portfolio."
        badge="Enterprise Safety"
        summaryCards={summaryCards}
        attentionAlert={
          hasSevereOpenIssue ? (
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 shrink-0 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-100 tracking-tight">Critical severity anomaly detected</h4>
                <p className="text-sm text-red-200/80 mt-1.5 leading-relaxed font-mono">
                  At least one of your assigned mines has an open anomaly needing immediate executive attention.
                </p>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Safety Anomalies Queue"
            subtitle="All open and resolved issues across your portfolio, prioritized by severity."
          />
          <div className="space-y-4">
            {issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <ShieldCheck className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium tracking-wide">No safety anomalies reported across your portfolio.</p>
              </div>
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

// 2. Reports — /dashboard/corporate/reports
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
      // Non-critical
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
        subtitle="Submit periodic compliance reports for assigned mines, and track regulator responses."
        badge="Reporting & Compliance"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col">
            <SectionHeader
              title="Submit New Report"
              subtitle="Issue counts are automatically verified. Declare resolution times."
            />
            {mines.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-sm py-10">
                No assigned mines to report for.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Select Mine</label>
                  <select
                    value={selectedMineId}
                    onChange={(e) => setSelectedMineId(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 appearance-none shadow-inner"
                  >
                    {mines.map((mine) => (
                      <option key={mine.id} value={mine.id} className="bg-zinc-900">{mine.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Reporting Period</label>
                  <input
                    type="text"
                    required
                    value={reportingPeriod}
                    onChange={(e) => setReportingPeriod(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Avg. Resolution Time (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={avgResolutionHours}
                    onChange={(e) => setAvgResolutionHours(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Declaration / Notes</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide additional details..."
                    className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative overflow-hidden group bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
                >
                  {isSubmitting ? 'Transmitting Data...' : 'Submit Cryptographic Report'}
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6">
            <SectionHeader title="Report Ledger" subtitle="Every submission and corresponding regulator response, per mine." />
            
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <ShieldCheck className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium tracking-wide">No reports submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {threads.map((t) => {
                  const mine = mines.find((m) => m.id === t.mineId);
                  return (
                    <div key={`${t.mineId}-${t.reportingPeriod}`} className="space-y-4">
                      <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                        <h4 className="text-sm font-bold text-white">{mine?.name ?? t.mineId}</h4>
                        <span className="text-xs font-mono text-zinc-500">[{t.reportingPeriod}]</span>
                      </div>
                      
                      {t.thread.map((report) => (
                        <div key={report.id} className="p-5 rounded-2xl bg-black/30 border border-white/5 shadow-inner transition-colors hover:bg-black/40">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-sm font-bold text-white tracking-wide">
                              {report.report_type === 'corporate_submission' ? 'Your Submission' : "Regulator's Verification"}
                            </span>
                            <StatusBadge status={REPORT_STATUS_BADGE[report.status]} label={report.status.toUpperCase()} />
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 mt-3 bg-zinc-900/50 p-2.5 rounded-lg border border-white/5">
                            <span>{new Date(report.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            <span className="text-zinc-600">•</span>
                            <span>{report.total_safety_issues} total anomalies</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-red-400/80">{report.critical_issues} critical</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-emerald-400/80">{report.resolved_issues} resolved</span>
                          </div>

                          {report.notes && (
                            <p className="text-sm text-zinc-300 mt-4 leading-relaxed pl-1 border-l-2 border-blue-500/30">
                              {report.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/corporate/profile
export const CorporateProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Executive Identity Record"
        subtitle="Your secure cryptographic profile and metadata."
        badge="Executive Record"
      >
        <div className="max-w-2xl mx-auto mt-8">
           <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
             
             {/* Banner */}
             <div className="h-32 bg-gradient-to-br from-blue-900/40 to-black border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="absolute bottom-[-50%] right-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
             </div>

             <div className="px-8 sm:px-12 pb-12">
                <div className="flex flex-col items-center -mt-16 mb-8 relative z-10">
                  <div className="w-32 h-32 rounded-2xl bg-zinc-900 border-4 border-[#121214] flex items-center justify-center text-zinc-100 text-5xl font-extrabold shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none"></div>
                    <span className="relative z-10 group-hover:scale-110 transition-transform duration-500">{displayName(user).charAt(0).toUpperCase()}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight mt-5">{displayName(user)}</h3>
                  <div className="px-3 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 text-xs font-mono font-bold text-blue-400 uppercase tracking-widest mt-3">
                    {userTypeLabel(user?.role)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.email || '—'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Phone</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.phone || '—'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assigned Mine(s)</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.mines?.length ? `${user.mines.length} assigned` : 'None assigned'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clearance Status</span>
                    <span className="text-sm font-mono text-blue-400 font-bold">ACTIVE COMMAND</span>
                  </div>
                </div>

             </div>
           </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
