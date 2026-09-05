import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Send
} from 'lucide-react';

// PersonIssue has no corrective-action/label field of its own (backend/src/
// models/person_issue.py keeps it minimal) — these are presentation-only,
// derived client-side from issue_type.
const PERSON_ISSUE_LABEL: Record<string, string> = {
  no_helmet: 'No Helmet Detected',
  no_vest: 'No Safety Vest Detected',
  unsafe_practice: 'Unsafe Practice Observed',
  other: 'Safety Issue',
};

const CORRECTIVE_ACTION_BY_ISSUE_TYPE: Record<string, string> = {
  no_helmet: 'Put on your safety helmet before continuing work.',
  no_vest: 'Put on your high-visibility safety vest before continuing work.',
  unsafe_practice: 'Stop the unsafe practice immediately and follow standard procedure.',
  other: "Follow your Safety Officer's instructions for this issue.",
};

interface PersonIssueRecord {
  id: string;
  level: string;
  section: number;
  issue_type: string;
  observation: string;
  severity: string;
  status: string;
  created_at: string;
}

interface SiteIssueRecord {
  id: string;
  level: string;
  section: number;
  issue_type: string;
  source: string;
  observation: string;
  severity: string;
  status: string;
  created_at: string;
}

// 1. Dashboard / Overview — /dashboard/worker
export const WorkerOverviewPage = () => {
  const user = useAuthStore((state) => state.user);
  const [personIssues, setPersonIssues] = useState<PersonIssueRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<PersonIssueRecord[]>('/person-issues/me');
        setPersonIssues(data);
      } catch {
        // Non-critical — page just shows no warning if this fails.
      }
    };
    load();
  }, []);

  const openPersonIssues = personIssues.filter((issue) => issue.status === 'open');

  return (
    <DashboardLayout>
      <PageLayout
        title={`Good Morning, ${displayName(user)}`}
        subtitle="Your personal safety status and quick access to reporting."
        badge="Worker Dashboard"
        headerActions={
          <Link
            to="/dashboard/worker/report"
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report a Problem</span>
          </Link>
        }
        attentionAlert={
          openPersonIssues.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Personal Safety Issue{openPersonIssues.length > 1 ? 's' : ''}
                </h3>
              </div>
              {openPersonIssues.map((issue) => (
                <div key={issue.id} className="p-4 rounded-xl bg-black/20 border border-red-500/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-white">
                      {PERSON_ISSUE_LABEL[issue.issue_type] ?? issue.issue_type}
                    </span>
                    <StatusBadge status={issue.severity} label={issue.severity.toUpperCase()} />
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5">{issue.observation}</p>
                  <p className="text-xs font-mono text-slate-500 mt-2">
                    Level {issue.level}, Section {issue.section}
                  </p>
                  <p className="text-xs font-mono text-amber-400 mt-2">
                    {CORRECTIVE_ACTION_BY_ISSUE_TYPE[issue.issue_type] ?? CORRECTIVE_ACTION_BY_ISSUE_TYPE.other}
                  </p>
                </div>
              ))}
            </div>
          ) : undefined
        }
      >
        {openPersonIssues.length === 0 && (
          <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400">
            No open safety issues assigned to you right now.
          </div>
        )}
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Report a Problem — /dashboard/worker/report
export const WorkerReportPage = () => {
  const { addToast } = useUIStore();

  const [reportTitle, setReportTitle] = useState('');
  const [reportIssueType, setReportIssueType] = useState('equipment_fault');
  const [reportLevel, setReportLevel] = useState('A');
  const [reportSection, setReportSection] = useState(1);
  const [reportSeverity, setReportSeverity] = useState('WARNING');
  const [reportDesc, setReportDesc] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [siteIssues, setSiteIssues] = useState<SiteIssueRecord[]>([]);

  const fetchSiteIssues = async () => {
    try {
      const { data } = await api.get<SiteIssueRecord[]>('/site-issues');
      setSiteIssues(data);
    } catch {
      // Non-critical for this page — the form still works without the list.
    }
  };

  useEffect(() => {
    fetchSiteIssues();
  }, []);

  const handlePhotoUpload = () => {
    setHasPhoto(true);
    addToast('success', 'Photo Attached', 'Worksite photo attached to report.');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;

    const observation = reportDesc.trim() ? `${reportTitle}: ${reportDesc}` : reportTitle;

    setIsSubmittingReport(true);
    try {
      await api.post('/site-issues', {
        level: reportLevel,
        section: reportSection,
        issue_type: reportIssueType,
        observation,
        severity: reportSeverity,
      });

      addToast('success', 'Report Submitted', 'Your report has been logged to the Safety Officer.');
      setReportTitle('');
      setReportDesc('');
      setHasPhoto(false);
      await fetchSiteIssues();
    } catch {
      addToast('error', 'Submission Failed', 'Could not submit the report — please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Report a Safety Problem"
        subtitle="Easily log any hazard, unusual reading, or equipment defect directly to the Safety Officer."
        badge="Quick Report"
      >
        <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <SectionHeader
            title="New Incident Report"
            subtitle="Fill in the details or use voice recording."
          />

          <form onSubmit={handleReportSubmit} className="space-y-5 relative z-10">

            <div>
              <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">
                What is the problem?
              </label>
              <input
                type="text"
                required
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Unusual gas odor near Face 4B fan"
                className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Issue Type</label>
                <select
                  value={reportIssueType}
                  onChange={(e) => setReportIssueType(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none custom-select"
                >
                  <option value="high_methane">Gas Leakage (Methane)</option>
                  <option value="high_co">Gas Leakage (Carbon Monoxide)</option>
                  <option value="low_ventilation">Ventilation Issue</option>
                  <option value="high_temperature">High Temperature</option>
                  <option value="equipment_fault">Equipment Fault</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Severity</label>
                <select
                  value={reportSeverity}
                  onChange={(e) => setReportSeverity(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none custom-select"
                >
                  <option value="WARNING">Warning (Requires check)</option>
                  <option value="CRITICAL">Critical (Immediate danger)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Level</label>
                <select
                  value={reportLevel}
                  onChange={(e) => setReportLevel(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none custom-select"
                >
                  <option value="A">Level A</option>
                  <option value="B">Level B</option>
                  <option value="C">Level C</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Section</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={reportSection}
                  onChange={(e) => setReportSection(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Description / Notes</label>
              <textarea
                rows={4}
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Provide any additional details or observations..."
                className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Quick Photo Helper */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePhotoUpload}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all ${hasPhoto
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                  }`}
              >
                <Camera className={`w-4 h-4 ${hasPhoto ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{hasPhoto ? 'Photo Attached ✓' : 'Add Photo'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmittingReport}
              className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-1 mt-4 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="w-5 h-5" />
              <span>{isSubmittingReport ? 'Submitting...' : 'Submit Report to Command Center'}</span>
            </button>

          </form>
        </div>

        {/* Recently reported site issues for this mine */}
        <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-4 mt-6">
          <SectionHeader title="Recent Site Issues" subtitle="Reported by anyone at your mine, most recent first." />
          {siteIssues.length === 0 && (
            <p className="text-sm font-mono text-slate-400">No site issues reported yet.</p>
          )}
          {[...siteIssues]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-bold text-white">{issue.observation}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    Level {issue.level}, Section {issue.section} · {issue.issue_type} · {issue.source}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider ${
                    issue.severity === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-300'
                      : issue.severity === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {issue.status === 'open' ? issue.severity : 'RESOLVED'}
                </span>
              </div>
            ))}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/worker/profile — read-only, sourced only from
// GET /auth/me's real fields (research/saumy/09-changes-5-sep.md Decision #9).
// No employee ID, badge, shift, organization, or PPE fields — the backend
// doesn't supply them yet.
export const WorkerProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Worker Profile"
        subtitle="Your account identity, as recorded by the system."
        badge="Personal Record"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4">
          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
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

          <div className="space-y-4 text-sm font-mono text-slate-300">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Email</span>
              <span className="text-white">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-white">{user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Assigned Mine(s)</span>
              <span className="text-white">{user?.mine_ids?.length ? `${user.mine_ids.length} assigned` : 'None assigned'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
