import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import {
  fetchMines,
  fetchRegulatoryReports,
  formatHours,
  groupIntoThreads,
  REPORT_STATUS_BADGE,
  type DirectivePriority,
  type Mine,
  type RegulatoryReport,
  type ReportThread,
} from '../../utils/regulatoryReports';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { ReportDetail } from '../common/ReportDetail';
import { Landmark, FileCheck, AlertCircle, MapPin, ShieldCheck, Plus, X } from 'lucide-react';

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
      // Non-critical
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

// 1. Overview — /dashboard/regulatory
export const RegulatoryOverviewPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  const minesReporting = threads.length;
  const awaitingReview = threads.filter((t) => t.latest.report_type === 'corporate_submission').length;
  const totalIssues = threads.reduce((sum, t) => sum + t.latest.total_safety_issues, 0);
  const criticalIssues = threads.reduce((sum, t) => sum + t.latest.critical_issues, 0);
  const openIssues = threads.reduce((sum, t) => sum + t.latest.open_issues, 0);
  const resolutionTimes = reports
    .map((r) => r.average_resolution_time_hours)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgResolutionHours = resolutionTimes.length
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null;
  const verifiedCount = threads.filter((t) => t.latest.status === 'verified').length;

  const summaryCards = [
    {
      title: 'Mines Reporting',
      value: `${minesReporting}/${mines.length}`,
      subtext: 'Have submitted at least one report',
      icon: <Landmark className="w-6 h-6" />,
      status: 'safe',
      statusLabel: 'TRACKED',
    },
    {
      title: 'Awaiting Review',
      value: `${awaitingReview}`,
      subtext: 'Corporate submissions needing response',
      icon: <AlertCircle className="w-6 h-6" />,
      status: awaitingReview > 0 ? 'warning' : 'safe',
      statusLabel: awaitingReview > 0 ? 'ACTION NEEDED' : 'CLEAR',
    },
    {
      title: 'Reported Issues',
      value: `${totalIssues}`,
      subtext: `${criticalIssues} critical, ${openIssues} still open`,
      icon: <FileCheck className="w-5 h-5" />,
      status: criticalIssues > 0 ? 'warning' : 'safe',
      statusLabel: criticalIssues > 0 ? 'REVIEW' : 'CLEAR',
    },
    {
      title: 'Compliance State',
      value: `${verifiedCount}/${threads.length || 0}`,
      subtext: 'Reports verified · avg. resolution: ' + formatHours(avgResolutionHours),
      icon: <Landmark className="w-5 h-5" />,
      status: 'safe',
      statusLabel: 'SUMMARY',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="DGMS Regulatory Authority Dashboard"
        subtitle="Aggregate compliance status and cryptographic verification of all managed mines."
        badge="DGMS Oversight"
        summaryCards={summaryCards}
      >
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-4">
          <SectionHeader
            title="Reports Awaiting Response"
            subtitle="Corporate submissions requiring regulatory verification."
          />
          {threads.filter((t) => t.latest.report_type === 'corporate_submission').length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed">
              <ShieldCheck className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm font-medium tracking-wide">No reports awaiting verification.</p>
            </div>
          )}
          {threads
            .filter((t) => t.latest.report_type === 'corporate_submission')
            .map((t) => {
              const mine = mines.find((m) => m.id === t.mineId);
              return (
                <div key={`${t.mineId}-${t.periodLabel}`} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 shadow-lg hover:bg-zinc-800/40 transition-colors p-5 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">{mine?.name ?? t.mineId}</h4>
                    <p className="text-xs font-mono text-zinc-400 mt-1">{t.periodLabel} · {t.latest.total_safety_issues} issues reported ({t.latest.critical_issues} critical)</p>
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

// 2. Mines — /dashboard/regulatory/mines
export const RegulatoryMinesPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  return (
    <DashboardLayout>
      <PageLayout
        title="Assigned Mines Registry"
        subtitle="Every mine currently under DGMS oversight."
        badge="Mine Registry"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {mines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed md:col-span-2">
              <p className="text-sm font-medium tracking-wide">No mines currently registered under oversight.</p>
            </div>
          )}
          {mines.map((mine) => {
            const thread = threadForMine(threads, mine.id);
            return (
              <div key={mine.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 sm:p-8 rounded-[2rem] space-y-4 hover:bg-zinc-800/40 transition-colors shadow-xl">
                <h4 className="text-lg font-bold text-white tracking-tight">{mine.name}</h4>
                {mine.lat !== null && mine.lng !== null && (
                  <p className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" /> {mine.lat.toFixed(4)}, {mine.lng.toFixed(4)}
                  </p>
                )}
                {thread ? (
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                    <div className="text-xs font-mono text-zinc-400 space-y-1">
                       <p>{thread.latest.total_safety_issues} issues recorded</p>
                       <p className="text-red-400/80">{thread.latest.critical_issues} critical anomalies</p>
                    </div>
                    <StatusBadge status={REPORT_STATUS_BADGE[thread.latest.status]} label={thread.latest.status.toUpperCase()} />
                  </div>
                ) : (
                  <p className="text-xs font-mono text-zinc-500 pt-4 border-t border-white/5 mt-4">No reports filed.</p>
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
interface DirectiveDraft {
  text: string;
  priority: DirectivePriority;
  due_at: string;
}

// Mirrors f40fc947's input/label spec — see the same constants in
// CorporateDashboard.tsx for why the compact variant is its own string.
const regField =
  'w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner';
const regFieldCompact =
  'w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 shadow-inner';
const regLabel = 'text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block';

export const RegulatoryCompliancePage = () => {
  const { mines, reports, reload } = useMinesAndReports();
  const threads = groupIntoThreads(reports);
  const [respondingTo, setRespondingTo] = useState<RegulatoryReport | null>(null);
  const [status, setStatus] = useState<'under_review' | 'verified' | 'disputed'>('verified');
  const [findings, setFindings] = useState<string[]>([]);
  const [directives, setDirectives] = useState<DirectiveDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openRespond = (report: RegulatoryReport) => {
    setRespondingTo(report);
    setStatus('verified');
    setFindings([]);
    setDirectives([]);
    setNotes('');
  };

  const updateDirective = (index: number, patch: Partial<DirectiveDraft>) =>
    setDirectives((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const submitRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingTo) return;
    setIsSubmitting(true);
    try {
      await api.post(`/regulatory-reports/${respondingTo.id}/respond`, {
        status,
        findings: findings.map((f) => f.trim()).filter(Boolean),
        directives: directives
          .filter((d) => d.text.trim())
          .map((d) => ({
            text: d.text.trim(),
            priority: d.priority,
            due_at: d.due_at ? `${d.due_at}T00:00:00Z` : undefined,
          })),
        notes: notes || undefined,
      });
      setRespondingTo(null);
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Compliance Dashboard"
        subtitle="Review current compliance states and submit regulatory verification decisions."
        badge="Compliance"
      >
        <div className="space-y-4 mt-4">
          {mines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed">
              <p className="text-sm font-medium tracking-wide">No mines currently under oversight.</p>
            </div>
          )}
          {mines.map((mine) => {
            const thread = threadForMine(threads, mine.id);
            const canRespond = thread?.latest.report_type === 'corporate_submission';
            return (
              <div key={mine.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/40 transition-colors shadow-lg">
                <div>
                  <h4 className="text-sm font-bold text-white">{mine.name}</h4>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    {thread
                      ? `${thread.periodLabel} · ${thread.latest.total_safety_issues} issues, ${thread.latest.critical_issues} critical, ${thread.latest.open_issues} open`
                      : 'No reports yet'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {thread && <StatusBadge status={REPORT_STATUS_BADGE[thread.latest.status]} label={thread.latest.status.toUpperCase()} />}
                  {canRespond && thread && (
                    <button
                      onClick={() => openRespond(thread.latest)}
                      className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] px-5 py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {respondingTo && (
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.1)] p-6 sm:p-8 space-y-6 mt-8 max-w-xl">
            <SectionHeader
              title="Regulatory Decision"
              subtitle={`Reviewing: ${respondingTo.period_label}`}
            />
            <form onSubmit={submitRespond} className="space-y-5">
              <div>
                <label className={regLabel}>Decision</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className={regField}
                >
                  <option value="under_review" className="bg-zinc-900">Under Review</option>
                  <option value="verified" className="bg-zinc-900">Verified</option>
                  <option value="disputed" className="bg-zinc-900">Disputed</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`${regLabel} mb-0`}>Findings</p>
                  <button
                    type="button"
                    onClick={() => setFindings((c) => [...c, ''])}
                    className="flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {findings.length === 0 && (
                  <p className="text-xs text-zinc-500 font-mono">No findings recorded.</p>
                )}
                {findings.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={f}
                      onChange={(e) =>
                        setFindings((c) => c.map((v, idx) => (idx === i ? e.target.value : v)))
                      }
                      placeholder="e.g. Resolved count could not be reconciled with sensor logs."
                      className={regFieldCompact}
                    />
                    <button
                      type="button"
                      onClick={() => setFindings((c) => c.filter((_, idx) => idx !== i))}
                      className="p-2 text-zinc-500 hover:text-red-400 shrink-0"
                      aria-label="Remove finding"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`${regLabel} mb-0`}>Directives</p>
                  <button
                    type="button"
                    onClick={() =>
                      setDirectives((c) => [...c, { text: '', priority: 'mandatory', due_at: '' }])
                    }
                    className="flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {directives.length === 0 && (
                  <p className="text-xs text-zinc-500 font-mono">No directives issued.</p>
                )}
                {directives.map((d, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={d.text}
                        onChange={(e) => updateDirective(i, { text: e.target.value })}
                        placeholder="What the operator must do"
                        className={regFieldCompact}
                      />
                      <button
                        type="button"
                        onClick={() => setDirectives((c) => c.filter((_, idx) => idx !== i))}
                        className="p-2 text-zinc-500 hover:text-red-400 shrink-0"
                        aria-label="Remove directive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={d.priority}
                        onChange={(e) =>
                          updateDirective(i, { priority: e.target.value as DirectivePriority })
                        }
                        className={regFieldCompact}
                      >
                        <option value="advisory" className="bg-zinc-900">Advisory</option>
                        <option value="mandatory" className="bg-zinc-900">Mandatory</option>
                        <option value="immediate" className="bg-zinc-900">Immediate</option>
                      </select>
                      <input
                        type="date"
                        value={d.due_at}
                        onChange={(e) => updateDirective(i, { due_at: e.target.value })}
                        className={regFieldCompact}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className={regLabel}>Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Overall remarks on this return..."
                  className={`${regField} resize-none`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? 'Transmitting...' : 'Submit Decision'}
                </button>
                <button
                  type="button"
                  onClick={() => setRespondingTo(null)}
                  className="px-6 py-3.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors"
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

// 4. Reports — /dashboard/regulatory/reports
export const RegulatoryReportsPage = () => {
  const { mines, reports } = useMinesAndReports();
  const threads = groupIntoThreads(reports);

  return (
    <DashboardLayout>
      <PageLayout
        title="Regulatory Reports"
        subtitle="Every submission and the regulator's response, in order."
        badge="Report History"
      >
        <div className="space-y-6 mt-4">
          {threads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-black/20 rounded-[2rem] border border-white/5 border-dashed">
              <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium tracking-wide">No reports in the ledger.</p>
            </div>
          )}
          {threads.map((t) => {
            const mine = mines.find((m) => m.id === t.mineId);
            return (
              <div key={`${t.mineId}-${t.periodLabel}`} className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-[2rem] p-6 sm:p-8 space-y-4">
                <SectionHeader title={`${mine?.name ?? t.mineId} — ${t.periodLabel}`} />
                <div className="space-y-3">
                  {t.thread.map((report) => (
                    <ReportDetail key={report.id} report={report} />
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

// 5. Profile — /dashboard/regulatory/profile
export const RegulatoryProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Inspector Identity Record"
        subtitle="Your secure cryptographic profile and metadata."
        badge="Inspector Record"
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
                    <span className="text-sm font-mono text-blue-400 font-bold">OVERSIGHT ACTIVE</span>
                  </div>
                </div>

             </div>
           </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
