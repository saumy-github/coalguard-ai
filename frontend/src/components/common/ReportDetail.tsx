import React, { useState } from 'react';
import {
  DIRECTIVE_PRIORITY_BADGE,
  PILLAR_LABEL,
  REPORT_STATUS_BADGE,
  downloadReportPdf,
  formatHours,
  formatPeriodRange,
  type RegulatoryReport,
} from '../../utils/regulatoryReports';
import { StatusBadge } from './StatusBadge';
import { SectionHeader } from './SectionHeader';
import { ChevronDown, ChevronRight, FileDown, FileSignature, Gavel, Wrench } from 'lucide-react';

// One report, rendered in full. Deliberately shared by both the Corporate and
// Regulatory dashboards rather than duplicated per role: the two parties are
// supposed to be looking at the *same* document, and any divergence between
// their views is exactly the kind of thing a dispute turns on.

const cell = 'px-3 py-2 text-left';
const headCell = `${cell} text-[10px] font-mono uppercase tracking-wider text-zinc-400`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/10 px-3.5 py-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
      {hint && <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export interface ReportDetailProps {
  report: RegulatoryReport;
  /** Collapsed by default inside a long thread; expanded on a dedicated view. */
  defaultOpen?: boolean;
}

export const ReportDetail = ({ report, defaultOpen = false }: ReportDetailProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isSubmission = report.report_type === 'corporate_submission';
  const Chevron = open ? ChevronDown : ChevronRight;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadReportPdf(report.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v);
        }}
        className="w-full text-left p-4 hover:bg-black/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            <Chevron className="w-4 h-4 text-zinc-400 shrink-0" />
            {isSubmission ? 'Corporate Submission' : 'Regulatory Verification'}
          </span>
          <div className="flex items-center gap-2">
            <StatusBadge status={REPORT_STATUS_BADGE[report.status]} label={report.status.toUpperCase()} />
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {downloading ? 'Preparing…' : 'PDF'}
            </button>
          </div>
        </div>
        <p className="text-xs font-mono text-zinc-400 mt-2 pl-6">
          {formatPeriodRange(report)} · filed {new Date(report.submitted_at).toLocaleString()}
        </p>
        <p className="text-xs font-mono text-zinc-300 mt-1 pl-6">
          {report.total_safety_issues} issues · {report.critical_issues} critical ·{' '}
          {report.resolved_issues} resolved · {report.open_issues} open
        </p>
      </div>

      {open && (
        <div className="px-4 pb-5 space-y-5 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat label="Total Issues" value={String(report.total_safety_issues)} />
            <Stat label="Critical" value={String(report.critical_issues)} />
            <Stat label="Resolved" value={String(report.resolved_issues)} />
            <Stat label="Open" value={String(report.open_issues)} />
            <Stat
              label="Avg. Resolution"
              value={formatHours(report.average_resolution_time_hours)}
              hint={report.average_resolution_time_hours === null ? 'nothing measurable' : undefined}
            />
          </div>

          {/* Level breakdown */}
          {report.level_breakdown.length > 0 && (
            <div>
              <SectionHeader title="By Level & Section" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className={headCell}>Location</th>
                      <th className={headCell}>Total</th>
                      <th className={headCell}>Critical</th>
                      <th className={headCell}>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.level_breakdown.map((l) => (
                      <tr key={`${l.level}-${l.section}`} className="border-b border-white/5">
                        <td className={`${cell} text-white font-semibold`}>
                          Level {l.level}
                          {l.section !== null ? ` · Section ${l.section}` : ''}
                        </td>
                        <td className={`${cell} text-zinc-300`}>{l.total}</td>
                        <td className={`${cell} ${l.critical > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                          {l.critical}
                        </td>
                        <td className={`${cell} text-zinc-300`}>{l.open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Corrective actions */}
          {report.corrective_actions.length > 0 && (
            <div>
              <SectionHeader title="Corrective Actions" />
              <div className="space-y-2">
                {report.corrective_actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl bg-black/40 border border-white/10 p-3">
                    <Wrench className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-white">{a.action}</p>
                      <p className="text-[10px] font-mono text-zinc-400 mt-1">
                        {PILLAR_LABEL[a.pillar]}
                        {a.owner ? ` · owner ${a.owner}` : ''}
                        {a.completed_at
                          ? ` · completed ${new Date(a.completed_at).toLocaleDateString()}`
                          : ' · not yet completed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issue snapshot — frozen at submission, so it can be long. */}
          {report.issue_snapshot.length > 0 && (
            <div>
              <SectionHeader
                title="Issue Snapshot"
                subtitle="Recorded as it stood when this return was filed."
                action={
                  <button
                    type="button"
                    onClick={() => setShowSnapshot((v) => !v)}
                    className="text-xs font-mono text-blue-400 hover:text-white"
                  >
                    {showSnapshot ? 'Hide' : `Show ${report.issue_snapshot.length}`}
                  </button>
                }
              />
              {showSnapshot && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className={headCell}>Type</th>
                        <th className={headCell}>Kind</th>
                        <th className={headCell}>Pillar</th>
                        <th className={headCell}>Severity</th>
                        <th className={headCell}>Status</th>
                        <th className={headCell}>Location</th>
                        <th className={headCell}>Raised</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.issue_snapshot.map((e) => (
                        <tr key={`${e.kind}-${e.issue_id}`} className="border-b border-white/5">
                          <td className={`${cell} text-white`}>{e.issue_type.replace(/_/g, ' ')}</td>
                          <td className={`${cell} text-zinc-400`}>{e.kind}</td>
                          <td className={`${cell} text-zinc-400`}>{PILLAR_LABEL[e.pillar]}</td>
                          <td className={`${cell} text-zinc-300`}>{e.severity}</td>
                          <td className={`${cell} text-zinc-300`}>{e.status}</td>
                          <td className={`${cell} text-zinc-400`}>
                            {e.level}-{e.section}
                          </td>
                          <td className={`${cell} text-zinc-400`}>
                            {new Date(e.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Declaration — submissions only */}
          {report.declaration && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-blue-400" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-blue-400">Declaration</p>
              </div>
              <p className="text-sm text-white mt-2">{report.declaration.statement}</p>
              <p className="text-[10px] font-mono text-zinc-400 mt-2">
                Signed by {report.declaration.declared_by_name ?? report.declaration.declared_by_user_id} ·{' '}
                {new Date(report.declaration.signed_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Regulator findings — verifications only */}
          {report.regulator_findings && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  Regulator Findings — {report.regulator_findings.verdict.toUpperCase()}
                </p>
              </div>

              {report.regulator_findings.findings.length > 0 && (
                <ul className="space-y-1.5">
                  {report.regulator_findings.findings.map((f, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              {report.regulator_findings.directives.map((d, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-black/40 p-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm text-white">{d.text}</p>
                    {d.due_at && (
                      <p className="text-[10px] font-mono text-zinc-400 mt-1">
                        Due {new Date(d.due_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <StatusBadge
                    status={DIRECTIVE_PRIORITY_BADGE[d.priority]}
                    label={d.priority.toUpperCase()}
                  />
                </div>
              ))}
            </div>
          )}

          {report.notes && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Notes</p>
              <p className="text-sm text-zinc-300 mt-1">{report.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
