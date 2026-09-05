import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../lib/userDisplay';
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
  Mic,
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
  const { workerTasks, markTaskComplete, addTicket, sensors, notifications } = useDashboardDataStore();

  // Problem Report Form State
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Gas Leakage');
  const [reportLocation, setReportLocation] = useState('Face 4B South (Seam IV)');
  const [reportSeverity, setReportSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [reportDesc, setReportDesc] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  const handleVoiceRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setReportDesc('Voice note transcribed: Unusual gas smell detected near Face 4B auxiliary fan.');
      addToast('info', 'Voice Transcribed', 'Speech converted to report text.');
    }, 1500);
  };

  const handlePhotoUpload = () => {
    setHasPhoto(true);
    addToast('success', 'Photo Attached', 'Worksite photo attached to report.');
  };

  const handleShareLocation = () => {
    addToast('info', 'Location Shared', 'GPS & Beacon location (Sub-Level -320m Face 4B) shared with Safety Officer.');
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;

    addTicket({
      title: reportTitle,
      description: reportDesc || 'Reported by field worker during shift inspection.',
      category: reportCategory,
      severity: reportSeverity,
      location: reportLocation,
      reportedBy: `${displayName(user)} (Field Team)`
    });

    setReportTitle('');
    setReportDesc('');
    setHasPhoto(false);
    setActiveSubTab('tasks');
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
              <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Category</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none custom-select"
              >
                <option value="Gas Leakage">Gas Leakage</option>
                <option value="Roof & Strata">Roof & Strata</option>
                <option value="Ventilation">Ventilation Issue</option>
                <option value="Electrical Safety">Electrical Defect</option>
                <option value="Equipment Failure">Equipment Failure</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Severity</label>
              <select
                value={reportSeverity}
                onChange={(e) => setReportSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none custom-select"
              >
                <option value="low">Low (Minor issue)</option>
                <option value="medium">Medium (Requires check)</option>
                <option value="high">High (Urgent check)</option>
                <option value="critical">Critical (Immediate danger)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 mb-2 block uppercase tracking-wider">Location</label>
            <input
              type="text"
              required
              value={reportLocation}
              onChange={(e) => setReportLocation(e.target.value)}
              placeholder="e.g. Sub-Level -320m, Crosscut 9"
              className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600"
            />
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

          {/* Quick Voice / Photo Helpers */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleVoiceRecord}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all ${isRecording
                  ? 'bg-red-500/20 text-red-400 animate-pulse border-red-500/50'
                  : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                }`}
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'text-red-400' : 'text-slate-400'}`} />
              <span>{isRecording ? 'Listening...' : 'Voice Input'}</span>
            </button>

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
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform hover:-translate-y-1 mt-4"
          >
            <Send className="w-5 h-5" />
            <span>Submit Report to Command Center</span>
          </button>

        </form>
      </div>
    </PageLayout>
  );

  // 4. Mine Map
  const renderMap = () => (
    <PageLayout
      title="Mine Safety Map"
      subtitle="Subterranean view showing worker locations, sensors, and emergency refuge chambers."
      badge="Interactive Map"
    >
      <div className="glass-panel rounded-3xl p-8 space-y-6 mt-4">
        <SectionHeader
          title="Sector 7G - Subterranean Level -320m"
          subtitle="Showing active extractors, escape routes, and ventilation shafts."
        />

        {/* Visual Map Canvas Representation */}
        <div className="relative w-full h-96 sm:h-[28rem] rounded-3xl bg-[#08080a] border border-white/10 overflow-hidden flex items-center justify-center p-6 shadow-inner">

          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Ambient Glows */}
          <div className="absolute top-10 right-20 w-40 h-40 bg-amber-500/20 blur-[60px] rounded-full"></div>
          <div className="absolute bottom-10 left-20 w-40 h-40 bg-orange-500/20 blur-[60px] rounded-full"></div>

          {/* Mine Shaft Visuals */}
          <div className="relative z-10 w-full max-w-2xl h-full flex flex-col justify-between py-6">

            {/* Surface Level */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-sm font-bold text-white tracking-wide">Surface Level (0m) - Pit-Head Intake Fan</span>
              <StatusBadge status="optimal" label="FAN RUNNING" />
            </div>

            {/* Shaft line */}
            <div className="w-1.5 bg-amber-500/30 h-16 mx-auto rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />

            {/* Level -150m */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-sm font-mono text-slate-300">Level -150m: Main Return Airway</span>
              <span className="text-sm font-mono font-bold text-amber-400">Clear</span>
            </div>

            {/* Shaft line */}
            <div className="w-1.5 bg-amber-500/30 h-16 mx-auto rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />

            {/* Sub-Level -320m (Active Face) */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-md">
              <div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping shadow-[0_0_10px_#10b981]" />
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    Sub-Level -320m: Face 4B (Your Assigned Station)
                  </h4>
                </div>
                <p className="text-xs font-mono text-emerald-100/70 mt-2">
                  14 Workers Active • Refuge Chamber 9 Available (200m East)
                </p>
              </div>

              <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 tracking-widest shadow-inner">
                SAFE ZONE
              </span>
            </div>

          </div>

        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400 pt-2 bg-white/5 p-4 rounded-xl border border-white/5">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#10b981]" /> Active Worker Station
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> Fresh Air Refuge Base
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_#22d3ee]" /> Multi-Gas Sensor Node
          </span>
        </div>

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
    case 'map': return renderMap();
    case 'notifications': return renderNotifications();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
