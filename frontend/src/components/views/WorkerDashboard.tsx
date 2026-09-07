import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import { DashboardLayout } from '../layout/DashboardLayout';
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
  UserCircle,
  ChevronRight,
  ShieldAlert,
  Fingerprint,
  X,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { MarkAttendanceModal } from '../attendance/MarkAttendanceModal';
import { useSyncManager } from '../../hooks/useSyncManager';
import { addIssueReport } from '../../utils/db';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });


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

// Reusable Graphite Theme Wrapper to override DashboardLayout's generic background
const GraphiteWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[calc(100vh-64px)] bg-zinc-950 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-6 relative overflow-hidden font-sans selection:bg-zinc-700 selection:text-white">
    {/* Sleek Graphite Gradient Background */}
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-[#18181b] to-zinc-950"></div>
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      ></div>
    </div>
    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-zinc-700/5 rounded-full blur-[120px] pointer-events-none"></div>
    
    <div className="relative z-10 w-full max-w-6xl mx-auto space-y-8">
      {children}
    </div>
  </div>
);


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
      } catch {}
    };
    load();
    loadAttendance();
  }, []);

  const openPersonIssues = personIssues.filter((issue) => issue.status === 'open');

  return (
    <DashboardLayout>
      <GraphiteWrapper>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-800/80 rounded-lg border border-white/10">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>
            </div>
            <p className="text-zinc-400">Welcome back, <span className="font-semibold text-zinc-200">{displayName(user)}</span>. Here is your current status.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAttendanceModalOpen(true)}
              className={`px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.2)] ${
                todayAttendance
                  ? 'bg-zinc-800/80 text-zinc-300 border border-white/10 hover:bg-zinc-700/80'
                  : 'bg-zinc-100 text-zinc-900 hover:bg-white border border-transparent'
              }`}
            >
              <Fingerprint className="w-5 h-5" />
              <span>{todayAttendance ? 'Attendance Verified' : 'Punch In (Face ID)'}</span>
            </button>
            <Link
              to="/dashboard/worker/report"
              className="px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-zinc-800/80 text-zinc-300 border border-white/10 hover:bg-zinc-700/80 hover:text-white transition-all shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
            >
              <AlertCircle className="w-5 h-5" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {openPersonIssues.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-400 ml-1">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Active Safety Alerts</h3>
            </div>
            {openPersonIssues.map((issue) => (
              <div key={issue.id} className="p-6 rounded-2xl bg-red-950/20 backdrop-blur-xl border border-red-500/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500 rounded-l-2xl"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-white tracking-tight">
                        {PERSON_ISSUE_LABEL[issue.issue_type] ?? issue.issue_type}
                      </span>
                      <StatusBadge status={issue.severity} label={issue.severity.toUpperCase()} />
                    </div>
                    <p className="text-sm text-zinc-400">{issue.observation}</p>
                    <p className="text-sm font-mono text-amber-400/90 mt-3 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      {CORRECTIVE_ACTION_BY_ISSUE_TYPE[issue.issue_type] ?? CORRECTIVE_ACTION_BY_ISSUE_TYPE.other}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Location</p>
                    <p className="text-sm font-mono text-zinc-300 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      Level {issue.level}, Section {issue.section}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Digital ID / Attendance Status */}
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            
            <div className="shrink-0 relative">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center border-[3px] shadow-[0_0_40px_rgba(0,0,0,0.3)] relative z-10 bg-zinc-900 ${
                todayAttendance ? 'border-emerald-500/50 text-emerald-400' : 'border-amber-500/50 text-amber-400'
              }`}>
                {todayAttendance ? <CheckCircle2 className="w-14 h-14" /> : <ShieldCheck className="w-14 h-14" />}
              </div>
              {/* Glow */}
              <div className={`absolute inset-0 rounded-full blur-[30px] opacity-40 ${
                todayAttendance ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}></div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">Shift Status</h2>
              <p className="text-zinc-400 mb-6 max-w-lg">
                {todayAttendance
                  ? 'Your identity and location have been cryptographically verified. You are cleared for work.'
                  : 'You must verify your face and GPS location before beginning your shift.'}
              </p>

              {todayAttendance ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Time</span>
                    <span className="text-sm font-mono text-zinc-200">
                      {new Date(todayAttendance.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Site</span>
                    <span className="text-sm font-mono text-zinc-200">{todayAttendance.mine_name || 'ECL Sector 7G'}</span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Location</span>
                    <span className="text-sm font-mono text-emerald-400">Within {todayAttendance.distance_from_site_m ?? 0}m</span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Identity</span>
                    <span className="text-sm font-mono text-emerald-400">DeepFace Verified</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-zinc-100 text-zinc-900 hover:bg-white transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)] inline-flex items-center gap-2"
                >
                  Initiate Secure Login <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {openPersonIssues.length === 0 && (
          <div className="text-center py-12">
             <div className="w-16 h-16 mx-auto bg-zinc-900/50 rounded-2xl border border-white/5 flex items-center justify-center mb-4">
               <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
             </div>
             <p className="text-zinc-500 font-medium">All clear. No safety issues assigned to you.</p>
          </div>
        )}

      </GraphiteWrapper>

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
  const [siteIssues, setSiteIssues] = useState<SiteIssueRecord[]>([]);
  const [lastClassification, setLastClassification] = useState<{ target: string; issue_type: string; severity: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isOnline, syncIssueReports } = useSyncManager();

  const fetchSiteIssues = async () => {
    try {
      const { data } = await api.get<SiteIssueRecord[]>('/site-issues');
      setSiteIssues(data);
    } catch {}
  };

  useEffect(() => {
    fetchSiteIssues();
  }, []);

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
        timeout: 45000, // AI classification may take a moment
      });

      if (data && data.issue) {
        const kindLabel = data.target === 'site_issue' ? 'Site Issue' : 'Person Issue';
        setLastClassification({
          target: data.target,
          issue_type: data.issue.issue_type,
          severity: data.issue.severity,
        });
        addToast(
          'success',
          'Report Filed',
          `Classified as a ${kindLabel} — ${data.issue.issue_type.replace(/_/g, ' ')} (${data.issue.severity}).`
        );
      } else {
        addToast('success', 'Report Received', 'Your report was received and is being processed.');
      }
      await fetchSiteIssues();
    } catch (err: any) {
      if (err?.response) {
        addToast('error', 'Submission Failed', 'Could not submit the report — please try again.');
        setIsSubmittingReport(false);
        return;
      }
      
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
      <GraphiteWrapper>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-800/80 rounded-lg border border-white/10">
                <ShieldAlert className="w-6 h-6 text-zinc-300" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Report Issue</h1>
            </div>
            <p className="text-zinc-400">Log hazards or unusual readings directly to the Command Center.</p>
          </div>
          
          <Link
            to="/dashboard/worker"
            className="px-5 py-3 rounded-xl text-sm font-bold bg-zinc-800/80 text-zinc-300 border border-white/10 hover:bg-zinc-700/80 hover:text-white transition-all shadow-lg w-fit"
          >
            Cancel
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-8 sm:p-10">
              <form onSubmit={handleReportSubmit} className="space-y-6">
                
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">What is the problem?</label>
                  <textarea
                    required
                    rows={4}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="e.g. Unusual gas odor near Face 4B fan. Our AI will automatically classify the type and severity."
                    className="w-full bg-black/20 text-zinc-100 rounded-xl px-5 py-4 border border-white/10 focus:outline-none focus:ring-1 focus:bg-black/40 focus:border-zinc-500 transition-all placeholder:text-zinc-600 resize-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Level</label>
                    <div className="relative">
                      <select
                        value={reportLevel}
                        onChange={(e) => setReportLevel(e.target.value)}
                        className="w-full bg-black/20 text-zinc-100 rounded-xl px-5 py-4 border border-white/10 focus:outline-none focus:ring-1 focus:bg-black/40 focus:border-zinc-500 appearance-none transition-all shadow-inner"
                      >
                        <option value="A">Level A</option>
                        <option value="B">Level B</option>
                        <option value="C">Level C</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Section</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={reportSection}
                      onChange={(e) => setReportSection(Number(e.target.value))}
                      className="w-full bg-black/20 text-zinc-100 rounded-xl px-5 py-4 border border-white/10 focus:outline-none focus:ring-1 focus:bg-black/40 focus:border-zinc-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Photo attachment */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-5 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border ${photoFile
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 border-white/5 hover:border-white/10'
                      }`}
                  >
                    <Camera className={`w-5 h-5 ${photoFile ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    <span>{photoFile ? 'Photo Attached ✓' : 'Add Photo Evidence'}</span>
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
                        className="w-14 h-14 object-cover rounded-xl border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-700 rounded-full p-1"
                      >
                        <X size={14} className="text-zinc-300" />
                      </button>
                    </div>
                  )}
                </div>

                {/* AI classification result badge */}
                {lastClassification && (
                  <div className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${
                    lastClassification.target === 'site_issue'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                  }`}>
                    <div className="shrink-0 mt-0.5">
                      {lastClassification.target === 'site_issue'
                        ? <AlertTriangle className="w-5 h-5" />
                        : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">
                        AI Triage Result
                      </p>
                      <p className="text-sm font-semibold">
                        {lastClassification.target === 'site_issue' ? 'Site Issue' : 'Person Issue'}
                        {' · '}
                        <span className="font-mono">{lastClassification.issue_type.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs mt-0.5 opacity-70 font-mono uppercase">
                        Severity: {lastClassification.severity}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="w-full relative overflow-hidden group bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-900 font-bold py-4 px-6 rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                  >
                    {isSubmittingReport
                      ? <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
                      : <Send className="w-5 h-5 text-zinc-700" />}
                    <span>{isSubmittingReport ? 'Analysing & Submitting...' : 'Submit to Command Center'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Reports sidebar */}
          <div className="lg:col-span-5 space-y-4">
             <div className="flex items-center gap-2 mb-6 ml-1">
                <Clock className="w-5 h-5 text-zinc-500" />
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Recent Global Reports</h3>
             </div>
             
             {siteIssues.length === 0 && (
                <div className="bg-zinc-900/30 rounded-2xl border border-white/5 p-6 text-center text-zinc-500 text-sm">
                  No recent reports.
                </div>
             )}

             <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {[...siteIssues]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 10) // Limit to top 10 recent
                  .map((issue) => (
                    <div
                      key={issue.id}
                      className="p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/5 hover:bg-zinc-800/40 transition-all flex flex-col gap-3 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-bold text-white leading-snug group-hover:text-zinc-200 transition-colors">{issue.observation}</p>
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${
                            issue.status !== 'open' ? 'bg-zinc-800 text-zinc-400 border-white/5' :
                            issue.severity === 'CRITICAL'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {issue.status === 'open' ? issue.severity : 'RESOLVED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                         <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> L{issue.level} S{issue.section}</span>
                         <span className="bg-black/30 px-2 py-0.5 rounded text-zinc-400">{issue.issue_type}</span>
                      </div>
                    </div>
                  ))}
             </div>
          </div>
        </div>
      </GraphiteWrapper>
    </DashboardLayout>
  );
};


// 3. Profile — /dashboard/worker/profile
export const WorkerProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <GraphiteWrapper>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-800/80 rounded-lg border border-white/10">
                <UserCircle className="w-6 h-6 text-zinc-300" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Identity Record</h1>
            </div>
            <p className="text-zinc-400">Your secure cryptographic profile and metadata.</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-8">
           <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
             
             {/* Banner */}
             <div className="h-32 bg-gradient-to-br from-zinc-800 to-black border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             </div>

             <div className="px-8 sm:px-12 pb-12">
                <div className="flex flex-col items-center -mt-16 mb-8">
                  <div className="w-32 h-32 rounded-2xl bg-zinc-900 border-4 border-[#121214] flex items-center justify-center text-zinc-100 text-5xl font-extrabold shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                    <span className="relative z-10 group-hover:scale-110 transition-transform duration-500">{displayName(user).charAt(0).toUpperCase()}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight mt-5">{displayName(user)}</h3>
                  <div className="px-3 py-1 bg-zinc-800 rounded-md border border-white/10 text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest mt-3">
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
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assigned Mine</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.mine ? 'Assigned' : 'None assigned'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clearance Level</span>
                    <span className="text-sm font-mono text-emerald-400">Active</span>
                  </div>
                </div>

             </div>
           </div>
        </div>

      </GraphiteWrapper>
    </DashboardLayout>
  );
};
