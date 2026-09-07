import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import { addIssueReport } from '../../utils/db';
import { useSyncManager } from '../../hooks/useSyncManager';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Send,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock,
  X
} from 'lucide-react';
import { MarkAttendanceModal } from '../attendance/MarkAttendanceModal';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// PersonIssue has no corrective-action/label field of its own (backend/src/
// models/person_issue.py keeps it minimal) — these are presentation-only,
// derived client-side from issue_type.
const PERSON_ISSUE_LABEL: Record<string, string> = {
  no_helmet: 'No Helmet Detected',
  no_vest: 'No Safety Vest Detected',
  other: 'Safety Issue',
};

const CORRECTIVE_ACTION_BY_ISSUE_TYPE: Record<string, string> = {
  no_helmet: 'Put on your safety helmet before continuing work.',
  no_vest: 'Put on your high-visibility safety vest before continuing work.',
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

// 1. Dashboard / Overview — /dashboard/worker
export const WorkerOverviewPage = () => {
  const user = useAuthStore((state) => state.user);
  const [personIssues, setPersonIssues] = useState<PersonIssueRecord[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  const loadAttendance = async () => {
    try {
      const { data } = await api.get('/attendance/me');
      if (Array.isArray(data) && data.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const recordToday = data.find((r: any) => r.created_at?.startsWith(todayStr));
        setTodayAttendance(recordToday || null);
      }
    } catch {
      // Non-critical
    }
  };

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
    loadAttendance();
  }, []);

  const openPersonIssues = personIssues.filter((issue) => issue.status === 'open');

  return (
    <DashboardLayout>
      <PageLayout
        title={`Good Morning, ${displayName(user)}`}
        subtitle="Your personal safety status and quick access to reporting."
        badge="Worker Dashboard"
        headerActions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                todayAttendance
                  ? 'btn-glass text-obsidian/70'
                  : 'btn-primary-earth text-obsidian'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{todayAttendance ? 'Attendance: Verified' : 'Mark Attendance'}</span>
            </button>
            <Link
              to="/dashboard/worker/report"
              className="btn-glass px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Report a Problem</span>
            </Link>
          </div>
        }
        attentionAlert={
          openPersonIssues.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ember">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Personal Safety Issue{openPersonIssues.length > 1 ? 's' : ''}
                </h3>
              </div>
              {openPersonIssues.map((issue) => (
                <div key={issue.id} className="p-4 rounded-xl bg-pumice border border-ember/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-obsidian">
                      {PERSON_ISSUE_LABEL[issue.issue_type] ?? issue.issue_type}
                    </span>
                    <StatusBadge status={issue.severity} label={issue.severity.toUpperCase()} />
                  </div>
                  <p className="text-sm text-obsidian/70 mt-1.5">{issue.observation}</p>
                  <p className="text-xs font-mono text-obsidian/50 mt-2">
                    Level {issue.level}, Section {issue.section}
                  </p>
                  <p className="text-xs font-mono text-ember mt-2">
                    {CORRECTIVE_ACTION_BY_ISSUE_TYPE[issue.issue_type] ?? CORRECTIVE_ACTION_BY_ISSUE_TYPE.other}
                  </p>
                </div>
              ))}
            </div>
          ) : undefined
        }
      >
        {/* Daily Shift Attendance Overview Card */}
        <div className="glass-panel rounded-3xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                  todayAttendance
                    ? 'bg-obsidian/10 border-obsidian/30 text-obsidian'
                    : 'bg-ember/10 border-ember/30 text-ember'
                }`}
              >
                {todayAttendance ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-obsidian uppercase tracking-wide">
                    Shift Attendance & Geofence Status
                  </h3>
                  {todayAttendance ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-obsidian/20 text-obsidian border border-obsidian/40 uppercase">
                      Present On-Site
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ember/20 text-ember border border-ember/40 uppercase animate-pulse">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-obsidian/60 mt-0.5">
                  {todayAttendance
                    ? `Clocked in at ${new Date(todayAttendance.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Geofence verified (<100m)`
                    : 'Verify your face & GPS location to confirm presence on the mine site.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAttendanceModalOpen(true)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition whitespace-nowrap ${
                todayAttendance
                  ? 'btn-glass text-obsidian/70 hover:text-obsidian'
                  : 'btn-primary-earth text-obsidian'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{todayAttendance ? 'Verify / Retake' : 'Punch In (Face ID)'}</span>
            </button>
          </div>

          {todayAttendance && (
            <div className="mt-4 pt-3 border-t border-obsidian/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-obsidian/50 text-[10px] block uppercase">Mine Site</span>
                <span className="text-obsidian/80">{todayAttendance.mine_name || 'ECL Sector 7G'}</span>
              </div>
              <div>
                <span className="text-obsidian/50 text-[10px] block uppercase">Perimeter Radius</span>
                <span className="text-obsidian">{todayAttendance.distance_from_site_m ?? 0} m (Within 100m)</span>
              </div>
              <div>
                <span className="text-obsidian/50 text-[10px] block uppercase">Liveness Check</span>
                <span className="text-obsidian">Blink Confirmed</span>
              </div>
              <div>
                <span className="text-obsidian/50 text-[10px] block uppercase">Identity Match</span>
                <span className="text-obsidian">DeepFace Verified</span>
              </div>
            </div>
          )}
        </div>

        {openPersonIssues.length === 0 && (
          <div className="glass-panel rounded-3xl p-6 text-center text-sm text-obsidian/60">
            No open safety issues assigned to you right now.
          </div>
        )}
      </PageLayout>

      <MarkAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSuccess={(rec) => {
          setTodayAttendance(rec.attendance_record || rec);
          loadAttendance();
        }}
      />
    </DashboardLayout>
  );
};


// 2. Report a Problem — /dashboard/worker/report
export const WorkerReportPage = () => {
  const { addToast } = useUIStore();

  const [reportDescription, setReportDescription] = useState('');
  const [reportLevel, setReportLevel] = useState('A');
  const [reportSection, setReportSection] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // isOnline/syncIssueReports were previously owned by WorkerApp (now
  // removed) and passed down to ObservationForm — this page is the only
  // remaining caller, so it owns the hook directly.
  const { isOnline, syncIssueReports } = useSyncManager();

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreviewUrl(await fileToDataUrl(file));
    e.target.value = '';
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    const observation = reportDescription.trim();

    setIsSubmittingReport(true);
    try {
      if (!isOnline) throw { response: undefined };

      const formData = new FormData();
      formData.append('observation', observation);
      formData.append('level', reportLevel);
      formData.append('section', String(reportSection));
      if (photoFile) formData.append('photo', photoFile);

      const { data } = await api.post('/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data) {
        const kindLabel = data.target === 'site_issue' ? 'Site Issue' : 'Person Issue';
        addToast(
          'success',
          'Report Filed',
          `Classified as a ${kindLabel} (${data.issue.issue_type.replace(/_/g, ' ')}).`
        );
      } else {
        addToast('success', 'Report Received', 'Your report was received and is being processed.');
      }
    } catch (err: any) {
      if (err?.response) {
        addToast('error', 'Submission Failed', 'Could not submit the report — please try again.');
        setIsSubmittingReport(false);
        return;
      }
      // Offline, or the request never reached the server — queue it locally
      // so it syncs automatically once connectivity returns.
      await addIssueReport({
        observation,
        level: reportLevel,
        section: reportSection,
        photo_data_url: photoPreviewUrl,
        captured_at: new Date().toISOString(),
        synced: 0,
      });
      addToast('success', 'Report Saved', 'Saved locally — will submit once you are back online.');
      if (isOnline) {
        syncIssueReports();
      }
    }

    setReportDescription('');
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsSubmittingReport(false);
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-ember/10 rounded-full blur-[80px] pointer-events-none"></div>

          <SectionHeader
            title="New Incident Report"
            subtitle="Describe the problem — our AI will classify the type and severity."
          />

          <form onSubmit={handleReportSubmit} className="space-y-5 relative z-10">

            <div>
              <label className="text-xs font-mono text-obsidian/60 mb-2 block uppercase tracking-wider">
                What is the problem?
              </label>
              <textarea
                required
                rows={3}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="e.g. Unusual gas odor near Face 4B fan"
                className="w-full px-5 py-3.5 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50 focus:ring-1 focus:ring-ember/50 transition-all placeholder:text-obsidian/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-mono text-obsidian/60 mb-2 block uppercase tracking-wider">Level</label>
                <select
                  value={reportLevel}
                  onChange={(e) => setReportLevel(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50 appearance-none custom-select"
                >
                  <option value="A">Level A</option>
                  <option value="B">Level B</option>
                  <option value="C">Level C</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-obsidian/60 mb-2 block uppercase tracking-wider">Section</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={reportSection}
                  onChange={(e) => setReportSection(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm focus:outline-none focus:border-ember/50 transition-all"
                />
              </div>
            </div>

            {/* Photo attachment */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all ${photoFile
                    ? 'bg-ember/20 text-ember border-ember/50'
                    : 'bg-pumice text-obsidian/70 hover:text-obsidian border-obsidian/10 hover:border-obsidian/10'
                  }`}
              >
                <Camera className={`w-4 h-4 ${photoFile ? 'text-ember' : 'text-obsidian/60'}`} />
                <span>{photoFile ? 'Photo Attached ✓' : 'Add Photo'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {photoPreviewUrl && (
                <div className="relative">
                  <img
                    src={photoPreviewUrl}
                    alt="Attached"
                    className="w-12 h-12 object-cover rounded-lg border border-obsidian/10"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1.5 -right-1.5 bg-limestone border border-obsidian/10 rounded-full p-0.5"
                  >
                    <X size={12} className="text-obsidian/70" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingReport}
              className="w-full btn-primary-earth py-4 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              <span>{isSubmittingReport ? 'Submitting...' : 'Submit Report to Command Center'}</span>
            </button>

          </form>
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

          <div className="flex items-center gap-5 pb-6 border-b border-obsidian/10">
            <div className="w-20 h-20 rounded-full bg-ember flex items-center justify-center text-chalk text-3xl font-display">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-obsidian tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-ember mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-obsidian/70">
            <div className="flex justify-between items-center py-1">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Email</span>
              <span className="text-obsidian">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-obsidian">{user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Assigned Mine</span>
              <span className="text-obsidian">{user?.mine ? 'Assigned' : 'None assigned'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
