import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  const { 
    currentUser, 
    activeSubTab, 
    setActiveSubTab, 
    workerTasks, 
    markTaskComplete, 
    addTicket, 
    sensors,
    notifications,
    addToast 
  } = useApp();

  // Problem Report Form State
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Gas Leakage');
  const [reportLocation, setReportLocation] = useState('Face 4B South (Seam IV)');
  const [reportSeverity, setReportSeverity] = useState('high');
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
      reportedBy: `${currentUser?.name || 'Worker'} (Field Team)`
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
        icon: <Clock className="w-4 h-4" />,
        status: "active",
        statusLabel: "ON DUTY"
      },
      {
        title: "My Tasks",
        value: `${completedCount}/${workerTasks.length}`,
        subtext: "Assigned for today",
        icon: <CheckSquare className="w-4 h-4" />,
        status: completedCount === workerTasks.length ? "optimal" : "warning",
        statusLabel: completedCount === workerTasks.length ? "ALL DONE" : "IN PROGRESS"
      },
      {
        title: "Safety Status",
        value: "Normal",
        subtext: "Area Gas & Air Safe",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        status: "safe",
        statusLabel: "SAFE"
      },
      {
        title: "Pending Reports",
        value: "0",
        subtext: "All items logged",
        icon: <AlertCircle className="w-4 h-4" />,
        status: "safe",
        statusLabel: "CLEAR"
      }
    ];

    return (
      <PageLayout
        title={`Good Morning, ${currentUser?.name || 'Worker'}`}
        subtitle="Your work schedule, task checklist, and safety overview for today."
        badge="Worker Dashboard"
        summaryCards={summaryCards}
        headerActions={
          <button
            onClick={() => setActiveSubTab('report')}
            className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Report a Problem</span>
          </button>
        }
      >
        {/* Quick Actions Row */}
        <div className="space-y-3">
          <SectionHeader
            title="Quick Actions"
            subtitle="Essential field operations at your fingertips."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveSubTab('tasks')}
              className="glass-card p-4 rounded-xl border border-[#51443d]/60 hover:border-[#f6b994] text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#252423] flex items-center justify-center text-[#f6b994] mb-2 group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">Start Inspection</h4>
              <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">Open task checklist</p>
            </button>

            <button
              onClick={() => setActiveSubTab('report')}
              className="glass-card p-4 rounded-xl border border-[#51443d]/60 hover:border-amber-400 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#252423] flex items-center justify-center text-amber-400 mb-2 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">Report a Problem</h4>
              <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">Log safety issue</p>
            </button>

            <button
              onClick={handlePhotoUpload}
              className="glass-card p-4 rounded-xl border border-[#51443d]/60 hover:border-blue-400 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#252423] flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">Upload Photo</h4>
              <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">Attach inspection image</p>
            </button>

            <button
              onClick={handleShareLocation}
              className="glass-card p-4 rounded-xl border border-[#51443d]/60 hover:border-emerald-400 text-left transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#252423] flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">Share Location</h4>
              <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">Send beacon signal</p>
            </button>
          </div>
        </div>

        {/* Today's Assigned Tasks */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
          <SectionHeader
            title="My Tasks for This Shift"
            subtitle="Complete each safety check and confirm."
            badge={`${completedCount}/${workerTasks.length} Completed`}
          />

          <div className="space-y-2">
            {workerTasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    isDone
                      ? 'bg-[#18201a] border-emerald-500/30 opacity-75'
                      : 'bg-[#181717] border-[#353534] hover:border-[#8d5d3e]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => markTaskComplete(t.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'border-[#51443d] hover:border-[#f6b994] text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className={`text-xs font-bold font-['Sora'] ${isDone ? 'line-through text-[#9e8d85]' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-[#d6c3b9] font-mono mt-0.5">{t.desc}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[#9e8d85]">
                        <span>📍 {t.location}</span>
                        <span>⏰ Due: {t.dueTime}</span>
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
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
          <SectionHeader
            title="Local Environmental Status"
            subtitle="Real-time readings at Face 4B (Your Assigned Station)."
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#9e8d85]">Methane (CH4)</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-xl font-bold font-['Sora'] text-white">0.42%</p>
              <p className="text-[10px] font-mono text-emerald-400 mt-1">Safe (Limit: 1.25%)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#9e8d85]">Air Velocity</span>
                <Wind className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-xl font-bold font-['Sora'] text-white">2.1 m/s</p>
              <p className="text-[10px] font-mono text-emerald-400 mt-1">Good Airflow</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#9e8d85]">Carbon Monoxide</span>
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-xl font-bold font-['Sora'] text-white">12 PPM</p>
              <p className="text-[10px] font-mono text-emerald-400 mt-1">Safe (&lt; 50 PPM)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-[#9e8d85]">Oxygen (O2)</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl font-bold font-['Sora'] text-white">20.8%</p>
              <p className="text-[10px] font-mono text-emerald-400 mt-1">Optimal (&gt; 19%)</p>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Daily Safety Duties"
          subtitle="Check off items as you verify them on the field."
        />

        <div className="space-y-3">
          {workerTasks.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white font-['Sora']">{t.title}</h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-0.5">{t.desc}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-[#9e8d85]">
                  <span>Location: {t.location}</span>
                  <span>Due Time: {t.dueTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.status === 'completed' ? (
                  <StatusBadge status="completed" label="COMPLETED" />
                ) : (
                  <button
                    onClick={() => markTaskComplete(t.id)}
                    className="btn-bronze px-4 py-1.5 rounded-lg text-xs font-mono font-bold"
                  >
                    Mark as Done
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-5">
        <SectionHeader
          title="New Incident Report"
          subtitle="Fill in the details or use voice recording."
        />

        <form onSubmit={handleReportSubmit} className="space-y-4">
          
          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">
              What is the problem?
            </label>
            <input
              type="text"
              required
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g. Unusual gas odor near Face 4B fan"
              className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Category</label>
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              >
                <option value="Gas Leakage">Gas Leakage</option>
                <option value="Roof & Strata">Roof & Strata</option>
                <option value="Ventilation">Ventilation Issue</option>
                <option value="Electrical Safety">Electrical Defect</option>
                <option value="Equipment Failure">Equipment Failure</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Severity</label>
              <select
                value={reportSeverity}
                onChange={(e) => setReportSeverity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              >
                <option value="low">Low (Minor issue)</option>
                <option value="medium">Medium (Requires check)</option>
                <option value="high">High (Urgent check)</option>
                <option value="critical">Critical (Immediate danger)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Location</label>
            <input
              type="text"
              required
              value={reportLocation}
              onChange={(e) => setReportLocation(e.target.value)}
              placeholder="e.g. Sub-Level -320m, Crosscut 9"
              className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">Description / Notes</label>
            <textarea
              rows={3}
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Provide any additional details or observations..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />
          </div>

          {/* Quick Voice / Photo Helpers */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleVoiceRecord}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse border-red-400'
                  : 'bg-[#252423] text-[#d6c3b9] hover:text-white border-[#353534]'
              }`}
            >
              <Mic className="w-4 h-4 text-red-400" />
              <span>{isRecording ? 'Listening...' : 'Voice Input'}</span>
            </button>

            <button
              type="button"
              onClick={handlePhotoUpload}
              className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border transition-all ${
                hasPhoto
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50'
                  : 'bg-[#252423] text-[#d6c3b9] hover:text-white border-[#353534]'
              }`}
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>{hasPhoto ? 'Photo Attached ✓' : 'Add Photo'}</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full btn-bronze py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <Send className="w-4 h-4" />
            <span>Send Report to Command Center</span>
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Sector 7G - Subterranean Level -320m"
          subtitle="Showing active extractors, escape routes, and ventilation shafts."
        />

        {/* Visual Map Canvas Representation */}
        <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-[#0e0e0f] border border-[#353534] overflow-hidden flex items-center justify-center p-4">
          
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#252423_1px,transparent_1px),linear-gradient(to_bottom,#252423_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />

          {/* Mine Shaft Visuals */}
          <div className="relative z-10 w-full max-w-xl h-full flex flex-col justify-between py-6">
            
            {/* Surface Level */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1b1b]/80 border border-[#51443d]/50">
              <span className="text-xs font-mono font-bold text-white">Surface Level (0m) - Pit-Head Intake Fan</span>
              <StatusBadge status="optimal" label="FAN RUNNING" />
            </div>

            {/* Shaft line */}
            <div className="w-1 bg-[#8d5d3e]/50 h-16 mx-auto" />

            {/* Level -150m */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1c1b1b]/80 border border-[#353534]">
              <span className="text-xs font-mono text-[#d6c3b9]">Level -150m: Main Return Airway</span>
              <span className="text-xs font-mono text-emerald-400">Clear</span>
            </div>

            {/* Shaft line */}
            <div className="w-1 bg-[#8d5d3e]/50 h-16 mx-auto" />

            {/* Sub-Level -320m (Active Face) */}
            <div className="p-4 rounded-xl bg-[#251e18] border border-[#8d5d3e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h4 className="text-xs font-bold text-white font-['Sora']">
                    Sub-Level -320m: Face 4B (Your Assigned Station)
                  </h4>
                </div>
                <p className="text-[11px] font-mono text-[#d6c3b9] mt-0.5">
                  14 Workers Active • Refuge Chamber 9 Available (200m East)
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                SAFE ZONE
              </span>
            </div>

          </div>

        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#9e8d85] pt-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active Worker Station
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f6b994]" /> Fresh Air Refuge Base
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Multi-Gas Sensor Node
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
        <SectionHeader
          title="Recent Notices"
          subtitle="Stay informed on mine status and safety drills."
        />

        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex items-start gap-3"
            >
              <Bell className="w-4 h-4 text-[#f6b994] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white font-['Sora']">{n.title}</h4>
                  <span className="text-[10px] font-mono text-[#9e8d85]">{n.time}</span>
                </div>
                <p className="text-xs font-mono text-[#d6c3b9] mt-0.5">{n.message}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Identity Card */}
        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
          <SectionHeader title="Employee Details" />

          <div className="flex items-center gap-4 pb-4 border-b border-[#353534]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#f6b994]/60 flex items-center justify-center text-white text-2xl font-extrabold font-['Sora'] shadow-lg">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'W'}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Sora']">{currentUser?.name}</h3>
              <p className="text-xs font-mono text-[#f6b994]">{currentUser?.roleTitle}</p>
              <p className="text-[11px] font-mono text-[#9e8d85]">{currentUser?.organization}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#353534]/50">
              <span className="text-[#9e8d85]">Employee ID:</span>
              <span className="text-white font-bold">{currentUser?.employeeId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#353534]/50">
              <span className="text-[#9e8d85]">Badge Number:</span>
              <span className="text-white">{currentUser?.badgeNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#353534]/50">
              <span className="text-[#9e8d85]">Assigned Mine:</span>
              <span className="text-white">{currentUser?.mineAssigned}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#353534]/50">
              <span className="text-[#9e8d85]">Shift Timing:</span>
              <span className="text-white">{currentUser?.shift}</span>
            </div>
          </div>
        </div>

        {/* Safety Equipment Checklist */}
        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
          <SectionHeader title="Mandatory Safety Gear (PPE)" />

          <div className="space-y-2.5 text-xs font-mono">
            {[
              { item: 'Smart Hard Hat with Cap-Lamp & Gas Sensor', status: 'verified' },
              { item: 'Self-Contained Self-Rescuer (SCSR 30-min O2)', status: 'verified' },
              { item: 'Steel-Toe High-Ankle Safety Boots', status: 'verified' },
              { item: 'Dust Filtration Respirator (N95)', status: 'verified' },
              { item: 'RFID Undergound Beacon Smart-Band', status: 'verified' }
            ].map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#181717] border border-[#353534]">
                <span className="text-[#d6c3b9]">{p.item}</span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded">
                  VERIFIED ✓
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'tasks':
      return renderTasks();
    case 'report':
      return renderReport();
    case 'map':
      return renderMap();
    case 'notifications':
      return renderNotifications();
    case 'profile':
      return renderProfile();
    case 'overview':
    default:
      return renderOverview();
  }
};
