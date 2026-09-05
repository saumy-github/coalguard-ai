import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  Clock,
  CheckSquare,
  ShieldCheck,
  AlertCircle,
  Camera,
  MapPin,
  Play,
  Radio,
  Activity,
  CheckCircle2,
  Send,
  User,
  HardHat,
  Bell,
  ChevronRight,
  Flame,
  Wind
} from 'lucide-react';

export const WorkerDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { activeSubTab, setActiveSubTab, addToast } = useUIStore();
  const { workerTasks, markTaskComplete, sensors, notifications } = useDashboardDataStore();

  // Problem Report Form State — issue_type/severity values match SiteIssueType/
  // SiteIssueSeverity in backend/src/models/site_issue.py exactly, since this
  // form submits directly to POST /site-issues (07-issue-collections-coding-plan.md
  // Phase 4). level/section are a static A/B/C select for now rather than a
  // GET /mine-levels-driven dropdown — that wiring is 05-maps-coding-plan.md's
  // Phase 3, deliberately not done here.
  const [reportTitle, setReportTitle] = useState('');
  const [reportIssueType, setReportIssueType] = useState('equipment_fault');
  const [reportLevel, setReportLevel] = useState('A');
  const [reportSection, setReportSection] = useState(1);
  const [reportSeverity, setReportSeverity] = useState('WARNING');
  const [reportDesc, setReportDesc] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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

  const handleShareLocation = () => {
    addToast('info', 'Location Shared', 'GPS & Beacon location (Sub-Level -320m Face 4B) shared with Safety Officer.');
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
      setActiveSubTab('report');
    } catch {
      addToast('error', 'Submission Failed', 'Could not submit the report — please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 1. Dashboard / Overview
  const renderOverview = () => {
    const completedCount = workerTasks.filter((t) => t.status === 'completed').length;

    const summaryCards = [
      {
        title: "Today's Shift",
        value: "Shift A",
        subtext: "06:00 - 14:00 IST",
        icon: <Clock className="w-5 h-5" />,
        status: "active",
        statusLabel: "ON DUTY"
      },
      {
        title: "My Tasks",
        value: `${completedCount}/${workerTasks.length}`,
        subtext: "Assigned for today",
        icon: <CheckSquare className="w-5 h-5" />,
        status: completedCount === workerTasks.length ? "optimal" : "warning",
        statusLabel: completedCount === workerTasks.length ? "ALL DONE" : "IN PROGRESS"
      },
      {
        title: "Safety Status",
        value: "Normal",
        subtext: "Area Gas & Air Safe",
        icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
        status: "safe",
        statusLabel: "SAFE"
      },
      {
        title: "Pending Reports",
        value: "0",
        subtext: "All items logged",
        icon: <AlertCircle className="w-5 h-5" />,
        status: "safe",
        statusLabel: "CLEAR"
      }
    ];

    return (
      <PageLayout
        title={`Good Morning, ${displayName(user)}`}
        subtitle="Your work schedule, task checklist, and safety overview for today."
        badge="Worker Dashboard"
        summaryCards={summaryCards}
        headerActions={
          <button
            onClick={() => setActiveSubTab('report')}
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>
        }
      >
        {/* Quick Actions Row */}
        <div className="space-y-4">
          <SectionHeader
            title="Quick Actions"
            subtitle="Essential field operations at your fingertips."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveSubTab('tasks')}
              className="glass-panel glass-panel-hover p-5 rounded-2xl text-left flex flex-col items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Start Inspection</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-1">Open task checklist</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('report')}
              className="glass-panel glass-panel-hover p-5 rounded-2xl text-left flex flex-col items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Report Problem</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-1">Log safety issue</p>
              </div>
            </button>

            <button
              onClick={handlePhotoUpload}
              className="glass-panel glass-panel-hover p-5 rounded-2xl text-left flex flex-col items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">Upload Photo</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-1">Attach inspection image</p>
              </div>
            </button>

            <button
              onClick={handleShareLocation}
              className="glass-panel glass-panel-hover p-5 rounded-2xl text-left flex flex-col items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors">Share Location</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-1">Send beacon signal</p>
              </div>
            </button>
          </div>
        </div>

        {/* Today's Assigned Tasks */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <SectionHeader
            title="My Tasks for This Shift"
            subtitle="Complete each safety check and confirm."
            badge={`${completedCount}/${workerTasks.length} Completed`}
          />

          <div className="space-y-3">
            {workerTasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl flex items-start justify-between gap-4 transition-all group ${isDone
                      ? 'bg-black/30 border border-amber-500/20 opacity-60'
                      : 'glass-panel glass-panel-hover border border-white/5'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => markTaskComplete(t.id)}
                      className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isDone
                          ? 'bg-amber-500 border-amber-400 text-[#0f0c09] shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'border-white/20 hover:border-amber-400/50 text-transparent'
                        }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      <p className="text-xs text-slate-300 font-mono mt-1">{t.desc}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {t.dueTime}</span>
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    status={isDone ? 'completed' : 'pending'}
                    label={isDone ? 'DONE' : 'PENDING'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Safety Sensor Status */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 mt-6 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-lime-500/10 blur-[100px] pointer-events-none"></div>
          <SectionHeader
            title="Local Environmental Status"
            subtitle="Real-time readings at Face 4B (Your Assigned Station)."
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Flame className="w-16 h-16" /></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Methane (CH4)</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white relative z-10">0.42%</p>
              <p className="text-xs font-mono text-amber-400 mt-1 relative z-10">Safe (&lt; 1.25%)</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Wind className="w-16 h-16" /></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Air Velocity</span>
                <Wind className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white relative z-10">2.1 m/s</p>
              <p className="text-xs font-mono text-amber-400 mt-1 relative z-10">Good Airflow</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Activity className="w-16 h-16" /></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Carbon Monoxide</span>
                <Activity className="w-4 h-4 text-lime-400" />
              </div>
              <p className="text-2xl font-bold text-white relative z-10">12 PPM</p>
              <p className="text-xs font-mono text-amber-400 mt-1 relative z-10">Safe (&lt; 50 PPM)</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><ShieldCheck className="w-16 h-16" /></div>
              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Oxygen (O2)</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white relative z-10">20.8%</p>
              <p className="text-xs font-mono text-amber-400 mt-1 relative z-10">Optimal (&gt; 19%)</p>
            </div>
          </div>
        </div>

      </PageLayout>
    );
  };

  // 2. My Tasks View
  const renderTasks = () => (
    <PageLayout
      title="My Assigned Tasks"
      subtitle="Shift safety checklist and scheduled inspection duties."
      badge="Checklist"
    >
      <div className="glass-panel rounded-3xl p-6 space-y-5 mt-4">
        <SectionHeader
          title="Daily Safety Duties"
          subtitle="Check off items as you verify them on the field."
        />

        <div className="space-y-4">
          {workerTasks.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${t.status === 'completed'
                  ? 'bg-black/40 border border-amber-500/20 opacity-75'
                  : 'glass-panel glass-panel-hover'
                }`}
            >
              <div>
                <h4 className="text-sm font-bold text-white">{t.title}</h4>
                <p className="text-sm text-slate-400 mt-1">{t.desc}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-slate-500">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t.location}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due: {t.dueTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {t.status === 'completed' ? (
                  <StatusBadge status="completed" label="COMPLETED" />
                ) : (
                  <button
                    onClick={() => markTaskComplete(t.id)}
                    className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 3. Report a Problem
  const renderReport = () => (
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
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-1 mt-4 disabled:opacity-50 disabled:hover:translate-y-0"
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
  );

  // 5. Notifications
  const renderNotifications = () => (
    <PageLayout
      title="Safety Notifications & Broadcasts"
      subtitle="Official alerts, shift handovers, and statutory safety announcements."
      badge="Alerts"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 mt-4">
        <SectionHeader
          title="Recent Notices"
          subtitle="Stay informed on mine status and safety drills."
        />

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4 hover:border-white/20 transition-all"
            >
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-1 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-white">{n.title}</h4>
                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{n.time}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 6. Profile
  const renderProfile = () => (
    <PageLayout
      title="Worker Profile"
      subtitle="Identity verification, emergency contacts, and assigned equipment."
      badge="Personal Record"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">

        {/* Identity Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader title="Employee Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-amber-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.user_type)}</p>
              <p className="text-xs text-slate-400 mt-1">{user?.organization}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-slate-300">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Employee ID</span>
              <span className="text-white font-bold bg-white/5 px-2 py-1 rounded">{user?.employeeId}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Badge Number</span>
              <span className="text-white">{user?.badgeNumber}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Assigned Mine</span>
              <span className="text-white">{user?.mineAssigned}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Shift Timing</span>
              <span className="text-white bg-amber-500/10 text-amber-400 px-2 py-1 rounded">{user?.shift}</span>
            </div>
          </div>
        </div>

        {/* Safety Equipment Checklist */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader title="Mandatory Safety Gear (PPE)" />

          <div className="space-y-3">
            {[
              { item: 'Smart Hard Hat with Cap-Lamp & Sensor', status: 'verified' },
              { item: 'Self-Contained Self-Rescuer (SCSR)', status: 'verified' },
              { item: 'Steel-Toe High-Ankle Safety Boots', status: 'verified' },
              { item: 'Dust Filtration Respirator (N95)', status: 'verified' },
              { item: 'RFID Undergound Beacon Band', status: 'verified' }
            ].map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-sm text-slate-300 font-medium">{p.item}</span>
                <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md tracking-widest uppercase shadow-sm">
                  ✓ Verified
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'tasks': return renderTasks();
    case 'report': return renderReport();
    case 'notifications': return renderNotifications();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
