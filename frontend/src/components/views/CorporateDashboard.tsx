import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { fetchCombinedIssues, normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import {
  buildReportDraft,
  fetchMines,
  fetchRegulatoryReports,
  groupIntoThreads,
  monthBounds,
  PILLAR_LABEL,
  PILLARS,
  type Mine,
  type Pillar,
  type RegulatoryReport,
} from '../../utils/regulatoryReports';
import { api } from '../../utils/api';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { IssueRow } from '../common/IssueRow';
import { ReportDetail } from '../common/ReportDetail';
import { AlertTriangle, ShieldAlert, HardHat, ShieldCheck, Plus, X } from 'lucide-react';

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

// 2. Reports — /dashboard/corporate/reports — submit a compliance report for
// an assigned mine, and see the response thread (Phase 7, Decision #13's
// trimmed report/verification loop). Not in Decision #16's original tree —
// that was written before this workflow existed; a natural in-scope
// extension of Corporate's route tree now that it does.
interface ActionDraft {
  pillar: Pillar;
  action: string;
  owner: string;
  completed_at: string;
  // Set only when this row was auto-inserted from a real resolved issue
  // (utils/regulatoryReports.ts's buildReportDraft) — carried through to
  // CorrectiveActionIn.issue_id on submit so the report links back to the
  // real record, and used locally to avoid re-inserting a row the user
  // already removed.
  issue_id?: string;
}

// Matches the input/label spec in f40fc947's redesign exactly, so the report
// form is indistinguishable from the rest of that design pass.
const field =
  'w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner';
// Same styling at a tighter rhythm, for the dense corrective-action rows.
// A separate constant rather than `${field} py-2` — two conflicting padding
// utilities in one class string are resolved by stylesheet order, not string
// order, so the override isn't reliable.
const fieldCompact =
  'w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 shadow-inner';
const fieldLabel = 'text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block';

export const CorporateReportsPage = () => {
  const [mines, setMines] = useState<Mine[]>([]);
  const [reports, setReports] = useState<RegulatoryReport[]>([]);
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);
  const [selectedMineId, setSelectedMineId] = useState('');
  // Real dates now, not a free-text label — the counts on the report are scoped
  // by this range, so it has to be a range and not a caption.
  const [periodStart, setPeriodStart] = useState(() => monthBounds(new Date()).start);
  const [periodEnd, setPeriodEnd] = useState(() => monthBounds(new Date()).end);
  const [narratives, setNarratives] = useState<Partial<Record<Pillar, string>>>({});
  const [actions, setActions] = useState<ActionDraft[]>([]);
  const [declaration, setDeclaration] = useState(
    'I certify that the information in this return is accurate and complete to the best of my knowledge.'
  );
  const [certified, setCertified] = useState(false);
  const [avgResolutionHours, setAvgResolutionHours] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which pillars the corporate manager has typed into themselves — once
  // touched, the live-data draft below stops overwriting that pillar so
  // editing never fights with auto-fill. Which resolved issues have already
  // been offered as a corrective-action row — so deleting one doesn't cause
  // it to reappear on the next recompute.
  const touchedNarrativesRef = useRef<Set<Pillar>>(new Set());
  const offeredActionIdsRef = useRef<Set<string>>(new Set());

  const reload = async () => {
    try {
      const [mineList, reportList, issueList] = await Promise.all([
        fetchMines(),
        fetchRegulatoryReports(),
        fetchCombinedIssues(),
      ]);
      setMines(mineList);
      setReports(reportList);
      setIssues(issueList);
      setSelectedMineId((current) => current || mineList[0]?.id || '');
    } catch {
      // Non-critical
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const threads = groupIntoThreads(reports);

  // The same figures the backend will compute and store on submission —
  // sourced from the real site/person issues at this mine, scoped to this
  // period, using the identical pillar/critical rules the server uses (see
  // utils/regulatoryReports.ts's buildReportDraft docstring). Recomputed
  // whenever the mine, period, or the underlying issue list changes.
  const draft = useMemo(
    () => (selectedMineId ? buildReportDraft(issues, selectedMineId, periodStart, periodEnd) : null),
    [issues, selectedMineId, periodStart, periodEnd]
  );

  // Fills in what the manager hasn't: an empty, untouched pillar narrative
  // gets the live-data draft sentence; a resolved issue not yet represented
  // as a corrective action gets its own row; an empty resolution-time field
  // gets the measured average. Never overwrites anything already there.
  useEffect(() => {
    if (!draft) return;

    setNarratives((current) => {
      let changed = false;
      const next = { ...current };
      for (const section of draft.sections) {
        if (section.narrative && !next[section.pillar] && !touchedNarrativesRef.current.has(section.pillar)) {
          next[section.pillar] = section.narrative;
          changed = true;
        }
      }
      return changed ? next : current;
    });

    setActions((current) => {
      const present = new Set(current.map((a) => a.issue_id).filter((id): id is string => !!id));
      const toAdd = draft.correctiveActions.filter(
        (d) => !present.has(d.issue_id) && !offeredActionIdsRef.current.has(d.issue_id)
      );
      if (toAdd.length === 0) return current;
      toAdd.forEach((d) => offeredActionIdsRef.current.add(d.issue_id));
      return [
        ...current,
        ...toAdd.map((d) => ({
          pillar: d.pillar,
          action: d.action,
          owner: '',
          completed_at: d.completed_at,
          issue_id: d.issue_id,
        })),
      ];
    });

    if (draft.averageResolutionHours !== null) {
      setAvgResolutionHours((current) => current || String(draft.averageResolutionHours));
    }
  }, [draft]);

  const setNarrative = (pillar: Pillar, text: string) => {
    touchedNarrativesRef.current.add(pillar);
    setNarratives((current) => ({ ...current, [pillar]: text }));
  };

  const applyDraftNarrative = (pillar: Pillar) => {
    const section = draft?.sections.find((s) => s.pillar === pillar);
    if (!section?.narrative) return;
    touchedNarrativesRef.current.delete(pillar);
    setNarratives((current) => ({ ...current, [pillar]: section.narrative }));
  };

  const updateAction = (index: number, patch: Partial<ActionDraft>) =>
    setActions((current) => current.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMineId || !certified || !declaration.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      // Send only non-empty narratives so an untouched pillar stays null on the
      // report rather than being stamped with an empty string.
      const filledNarratives = Object.fromEntries(
        Object.entries(narratives).filter(([, text]) => text && text.trim())
      );
      await api.post('/regulatory-reports', {
        mine_id: selectedMineId,
        // End-of-day so an issue raised on the final day of the period is inside it.
        period_start: `${periodStart}T00:00:00Z`,
        period_end: `${periodEnd}T23:59:59Z`,
        narratives: filledNarratives,
        corrective_actions: actions
          .filter((a) => a.action.trim())
          .map((a) => ({
            issue_id: a.issue_id,
            pillar: a.pillar,
            action: a.action.trim(),
            owner: a.owner.trim() || undefined,
            completed_at: a.completed_at ? `${a.completed_at}T00:00:00Z` : undefined,
          })),
        declaration_statement: declaration.trim(),
        declared_average_resolution_time_hours: avgResolutionHours
          ? Number(avgResolutionHours)
          : undefined,
        notes: notes || undefined,
      });
      setNarratives({});
      setActions([]);
      setAvgResolutionHours('');
      setNotes('');
      setCertified(false);
      touchedNarrativesRef.current.clear();
      offeredActionIdsRef.current.clear();
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Submission failed.');
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
            subtitle="Issue counts and resolution times are calculated automatically for the period selected below."
          />
          {mines.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-sm py-10">
              No assigned mines to report for.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={fieldLabel}>Mine</label>
                <select
                  value={selectedMineId}
                  onChange={(e) => setSelectedMineId(e.target.value)}
                  className={field}
                >
                  {mines.map((mine) => (
                    <option key={mine.id} value={mine.id} className="bg-zinc-900">{mine.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>Period Start</label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Period End</label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className={field}
                  />
                </div>
              </div>

              {draft && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className={`${fieldLabel} mb-2`}>Calculated Totals</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {(
                      [
                        ['Total', draft.totals.total, 'text-white'],
                        ['Critical', draft.totals.critical, draft.totals.critical > 0 ? 'text-red-400' : 'text-white'],
                        ['Resolved', draft.totals.resolved, 'text-emerald-400'],
                        ['Open', draft.totals.open, 'text-amber-400'],
                      ] as const
                    ).map(([label, value, colour]) => (
                      <div key={label}>
                        <p className={`text-lg font-bold ${colour}`}>{value}</p>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className={fieldLabel}>Narrative by pillar (optional)</p>
                {PILLARS.map((pillar) => {
                  const section = draft?.sections.find((s) => s.pillar === pillar);
                  return (
                    <div key={pillar}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-mono text-blue-400">
                          {PILLAR_LABEL[pillar]}
                          {section && section.total > 0 && (
                            <span className="text-zinc-500"> · {section.total} recorded{section.critical > 0 ? `, ${section.critical} critical` : ''}</span>
                          )}
                        </label>
                        {section?.narrative && (
                          <button
                            type="button"
                            onClick={() => applyDraftNarrative(pillar)}
                            className="text-[10px] font-mono text-blue-400 hover:text-white underline decoration-dotted"
                          >
                            Insert suggested text
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={narratives[pillar] ?? ''}
                        onChange={(e) => setNarrative(pillar, e.target.value)}
                        placeholder={`Your account of ${PILLAR_LABEL[pillar].toLowerCase()} performance this period...`}
                        className={`${field} resize-none`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`${fieldLabel} mb-0`}>Corrective actions taken</p>
                  <button
                    type="button"
                    onClick={() =>
                      setActions((c) => [...c, { pillar: 'safety', action: '', owner: '', completed_at: '' }])
                    }
                    className="flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {actions.length === 0 && (
                  <p className="text-xs text-zinc-500 font-mono">None recorded.</p>
                )}
                {actions.map((a, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                    {a.issue_id && (
                      <p className="text-[10px] font-mono text-emerald-400/80">
                        Pre-filled from a resolved issue — edit as needed.
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={a.pillar}
                        onChange={(e) => updateAction(i, { pillar: e.target.value as Pillar })}
                        className={fieldCompact}
                      >
                        {PILLARS.map((p) => (
                          <option key={p} value={p} className="bg-zinc-900">{PILLAR_LABEL[p]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setActions((c) => c.filter((_, idx) => idx !== i))}
                        className="p-2 text-zinc-500 hover:text-red-400 shrink-0"
                        aria-label="Remove corrective action"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={a.action}
                      onChange={(e) => updateAction(i, { action: e.target.value })}
                      placeholder="What was done"
                      className={fieldCompact}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={a.owner}
                        onChange={(e) => updateAction(i, { owner: e.target.value })}
                        placeholder="Owner (optional)"
                        className={fieldCompact}
                      />
                      <input
                        type="date"
                        value={a.completed_at}
                        onChange={(e) => updateAction(i, { completed_at: e.target.value })}
                        className={fieldCompact}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className={fieldLabel}>
                  Declared avg. resolution time (hours, optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={avgResolutionHours}
                  onChange={(e) => setAvgResolutionHours(e.target.value)}
                  className={field}
                />
                <p className="text-[10px] font-mono text-zinc-500 mt-1.5">
                  {draft?.averageResolutionHours !== null && draft?.averageResolutionHours !== undefined
                    ? `Calculated from ${draft.totals.resolved} resolved issue(s) this period.`
                    : 'Used only when no issue in the period has a recorded resolution time.'}
                </p>
              </div>

              <div>
                <label className={fieldLabel}>Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${field} resize-none`}
                />
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <label className={fieldLabel}>Declaration</label>
                <textarea
                  rows={2}
                  required
                  value={declaration}
                  onChange={(e) => setDeclaration(e.target.value)}
                  className={`${field} resize-none`}
                />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certified}
                    onChange={(e) => setCertified(e.target.checked)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <span className="text-xs text-zinc-300">
                    I certify the above is accurate and complete.
                  </span>
                </label>
              </div>

              {error && <p className="text-xs font-mono text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !certified}
                className="bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
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
                  <div key={`${t.mineId}-${t.periodLabel}`} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                      <h4 className="text-sm font-bold text-white">{mine?.name ?? t.mineId}</h4>
                      <span className="text-xs font-mono text-zinc-500">[{t.periodLabel}]</span>
                    </div>
                    {t.thread.map((report) => (
                      <ReportDetail key={report.id} report={report} />
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
