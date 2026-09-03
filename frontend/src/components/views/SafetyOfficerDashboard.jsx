import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Map,
  Sliders,
  Flame,
  Wind,
  FileText,
  History,
  User,
  RefreshCw,
  Radio,
  ArrowRight,
  ChevronRight,
  Send,
  CheckSquare,
  Volume2,
  MapPin,
  Clock
} from 'lucide-react';
import { AI_KNOWLEDGE_BASE } from '../../data/mockData';

export const SafetyOfficerDashboard = () => {
  const {
    currentUser,
    activeSubTab,
    setActiveSubTab,
    sensors,
    tickets,
    auditTrail,
    inspections,
    isHazardSimulated,
    simulateHazard,
    resetHazard,
    broadcastEvacuation,
    resolveTicket,
    addToast
  } = useApp();

  // AI Assistant Query state
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Calibrate Sensor simulation
  const [calibratingId, setCalibratingId] = useState(null);

  const handleCalibrate = (sensorId) => {
    setCalibratingId(sensorId);
    setTimeout(() => {
      setCalibratingId(null);
      addToast('success', 'Sensor Calibrated', `Sensor ${sensorId} zero-point recalibration complete.`);
    }, 1200);
  };

  const handleAskAi = (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setIsAskingAi(true);

    setTimeout(() => {
      setIsAskingAi(false);
      const queryLower = aiQuery.toLowerCase();
      if (queryLower.includes('methane') || queryLower.includes('gas') || queryLower.includes('ch4')) {
        setAiResponse(AI_KNOWLEDGE_BASE[0]);
      } else if (queryLower.includes('dust') || queryLower.includes('air')) {
        setAiResponse(AI_KNOWLEDGE_BASE[1]);
      } else {
        setAiResponse(AI_KNOWLEDGE_BASE[2]);
      }
    }, 800);
  };

  // 1. Dashboard Overview
  const renderOverview = () => {
    const activeIncidentsCount = tickets.filter((t) => t.status === 'action_required' || t.status === 'in_investigation').length;
    const openActionsCount = tickets.filter((t) => t.status === 'action_required').length;

    const summaryCards = [
      {
        title: "Safety Status",
        value: isHazardSimulated ? "Warning" : "Normal",
        subtext: isHazardSimulated ? "Face 4B Methane Spike" : "All 8 Sectors Safe",
        icon: <Activity className="w-5 h-5" />,
        status: isHazardSimulated ? "critical" : "safe",
        statusLabel: isHazardSimulated ? "ALERT" : "OPTIMAL"
      },
      {
        title: "Active Incidents",
        value: `${activeIncidentsCount}`,
        subtext: "Reported across mine",
        icon: <AlertTriangle className="w-5 h-5" />,
        status: activeIncidentsCount > 0 ? "warning" : "safe",
        statusLabel: activeIncidentsCount > 0 ? "ATTENTION" : "CLEAR"
      },
      {
        title: "Open Actions",
        value: `${openActionsCount}`,
        subtext: "Require resolution",
        icon: <CheckSquare className="w-5 h-5" />,
        status: openActionsCount > 0 ? "warning" : "safe",
        statusLabel: openActionsCount > 0 ? "ACTION NEEDED" : "CLEAR"
      },
      {
        title: "Compliance Score",
        value: "94.2%",
        subtext: "DGMS Audit Standard",
        icon: <Sparkles className="w-5 h-5" />,
        status: "safe",
        statusLabel: "CERTIFIED"
      }
    ];

    return (
      <PageLayout
        title="Mine Safety Dashboard"
        subtitle="Monitor real-time gas levels, assign corrective actions, and ensure statutory compliance."
        badge="Safety Command"
        summaryCards={summaryCards}
        headerActions={
          <div className="flex items-center gap-3">
            {!isHazardSimulated ? (
              <button
                onClick={simulateHazard}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                <Flame className="w-4 h-4" />
                <span>Simulate Alert</span>
              </button>
            ) : (
              <button
                onClick={resetHazard}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset to Safe</span>
              </button>
            )}

            <button
              onClick={() => broadcastEvacuation('All personnel in Face 4B: Move to Fresh Air Base immediately.')}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
            >
              <Volume2 className="w-4 h-4" />
              <span>Broadcast Evacuation</span>
            </button>
          </div>
        }
      >
        {/* Urgent Action Callout if Hazard Simulated */}
        {isHazardSimulated && (
          <div className="glass-panel rounded-3xl p-6 border-rose-500/50 bg-rose-500/10 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden animate-pulse-slow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[50px]"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-rose-100 tracking-tight">
                  High Methane Alert (1.42%) in Face 4B Return Incline
                </h4>
                <p className="text-sm text-rose-200/80 mt-1.5 leading-relaxed">
                  Exceeds safe 1.25% threshold. AI suggests increasing auxiliary ventilation and moving workers to Fresh Air Base.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 relative z-10">
              <button
                onClick={() => setActiveSubTab('incidents')}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all"
              >
                View Incident
              </button>
            </div>
          </div>
        )}

        {/* Live Gas Telemetry Summary */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Live Multi-Gas Monitoring"
            subtitle="Key sensor nodes across subterranean levels."
            action={
              <button
                onClick={() => setActiveSubTab('monitoring')}
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View All Sensors</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sensors.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">{s.location}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><Flame className="w-10 h-10" /></div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest relative z-10">Methane (CH4)</p>
                    <p className={`text-xl font-bold mt-1 relative z-10 ${s.methaneLEL > 1.25 ? 'text-rose-400' : 'text-amber-400'}`}>
                      {s.methaneLEL}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><Wind className="w-10 h-10" /></div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest relative z-10">Air Velocity</p>
                    <p className="text-xl font-bold text-white mt-1 relative z-10">{s.ventilationVelocityMS} m/s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents and Actions */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Incidents & Actions Needed"
            subtitle="Active safety tickets awaiting verification or closure."
            action={
              <button
                onClick={() => setActiveSubTab('incidents')}
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>Manage Incidents</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="space-y-4">
            {tickets.slice(0, 2).map((t) => (
              <div
                key={t.id}
                className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
              >
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-base font-bold text-white">{t.title}</h4>
                    <StatusBadge status={t.severity} />
                  </div>
                  <p className="text-sm text-slate-300 mt-2">{t.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {t.location}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Assigned: {t.assignedTo}</span>
                    <span>{t.createdAt}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {t.status === 'action_required' ? (
                    <button
                      onClick={() => resolveTicket(t.id, 'Ventilation speed increased to 100%. Gas levels normalized.')}
                      className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Resolve Action
                    </button>
                  ) : (
                    <StatusBadge status="resolved" label="RESOLVED" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </PageLayout>
    );
  };

  // 2. Live Monitoring
  const renderMonitoring = () => (
    <PageLayout
      title="Live Sensor & Environmental Monitoring"
      subtitle="Complete multi-gas readings, air velocity, dust monitors, and equipment status."
      badge="Telemetry"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="All Subterranean Sensor Nodes"
          subtitle="Showing live readings for Methane, Carbon Monoxide, Oxygen, Dust, and Airflow."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sensors.map((s) => (
            <div
              key={s.id}
              className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-5 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide">{s.location}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">{s.type} • Tag: {s.sensorTag}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {/* 4-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Methane</span>
                  <p className={`text-lg font-bold ${s.methaneLEL > 1.25 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {s.methaneLEL}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">CO (PPM)</span>
                  <p className="text-lg font-bold text-white">{s.carbonMonoxidePPM}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Airflow</span>
                  <p className="text-lg font-bold text-orange-400">{s.ventilationVelocityMS}</p>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Oxygen</span>
                  <p className="text-lg font-bold text-amber-400">{s.oxygenPercent}%</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Battery: {s.batteryPercent}% • Ping: {s.lastPing}</span>
                <button
                  onClick={() => handleCalibrate(s.id)}
                  disabled={calibratingId === s.id}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors"
                >
                  {calibratingId === s.id ? 'Calibrating...' : 'Calibrate Sensor'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 3. Mine Map
  const renderMap = () => (
    <PageLayout
      title="Subterranean Mine Topography"
      subtitle="Interactive 3D mine level map with workers, active sensors, and emergency refuge chambers."
      badge="Mine Map"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Sector 7G Deep Coalfield (Raniganj)"
          subtitle="Showing Sub-Levels 0m, -150m, -320m, and -450m."
        />

        {/* Visual Map */}
        <div className="relative w-full h-[32rem] rounded-3xl bg-[#08080a] border border-white/10 overflow-hidden p-8 flex flex-col justify-between shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]" />

          <div className="absolute top-20 right-20 w-48 h-48 bg-amber-500/10 blur-[80px] rounded-full"></div>
          {isHazardSimulated && (
            <div className="absolute bottom-32 left-32 w-64 h-64 bg-rose-500/20 blur-[100px] rounded-full animate-pulse-slow"></div>
          )}

          {/* Levels */}
          <div className="relative z-10 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-sm font-bold text-white tracking-wide">Level 0m (Surface Intake & Winding House)</span>
            <span className="text-sm font-mono text-orange-400 font-bold">Fan Speed: 5.4 m/s</span>
          </div>

          <div className="w-1.5 bg-amber-500/20 h-12 mx-auto rounded-full" />

          <div className="relative z-10 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-sm font-mono text-slate-300">Level -150m (Main Return Airway Incline #2)</span>
            <span className="text-sm font-mono text-amber-400 font-bold">Sensor SN-AIR-08: Normal</span>
          </div>

          <div className="w-1.5 bg-amber-500/20 h-12 mx-auto rounded-full" />

          <div className={`relative z-10 p-5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md shadow-lg ${isHazardSimulated ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'bg-amber-500/10 border-amber-500/30'
            }`}>
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${isHazardSimulated ? 'bg-rose-500 animate-ping shadow-[0_0_10px_#f43f5e]' : 'bg-amber-400 shadow-[0_0_10px_#10b981]'}`} />
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Sub-Level -320m (Active Face 4B - Coal Extraction)
                </h4>
              </div>
              <p className={`text-xs font-mono mt-2 ${isHazardSimulated ? 'text-rose-200/80' : 'text-emerald-100/70'}`}>
                14 Workers Assigned • Strata Support Active • Refuge Chamber 9 Clear
              </p>
            </div>
            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border tracking-widest uppercase ${isHazardSimulated ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
              }`}>
              {isHazardSimulated ? '⚠️ ALERT: Methane 1.42%' : '✓ Safe Status'}
            </span>
          </div>

          <div className="w-1.5 bg-amber-500/20 h-12 mx-auto rounded-full" />

          <div className="relative z-10 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-sm font-mono text-slate-400">Sub-Level -450m (Goaf Isolation Seal #3)</span>
            <span className="text-sm font-mono text-slate-500">Seal Intact</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  // 4. Incidents & Actions
  const renderIncidents = () => (
    <PageLayout
      title="Incidents & Corrective Actions"
      subtitle="Review safety tickets, assign field teams, and verify resolutions."
      badge="Incident Command"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="All Safety Tickets"
          subtitle="Showing open, in-progress, and resolved items."
        />

        <div className="space-y-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-2 py-1 rounded bg-black/40 text-xs font-mono font-bold text-slate-400 border border-white/5">{t.id}</span>
                  <h4 className="text-base font-bold text-white tracking-tight">{t.title}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.severity} />
                  <StatusBadge status={t.status} />
                </div>
              </div>

              <p className="text-sm text-slate-300 font-mono leading-relaxed">{t.description}</p>

              {/* AI Suggested Action */}
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-sm font-mono relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Sparkles className="w-12 h-12 text-orange-400" /></div>
                <p className="text-[11px] text-orange-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 relative z-10">
                  <Sparkles className="w-3.5 h-3.5" /> AI Suggested Action & DGMS Reference
                </p>
                <p className="text-slate-200 whitespace-pre-line relative z-10">{t.aiSuggestedAction}</p>
                <p className="text-[11px] text-slate-500 mt-2 relative z-10 block bg-black/20 p-2 rounded inline-block">{t.dgmsRegulationRef}</p>
              </div>

              {t.correctiveActionTaken && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm font-mono text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-400 uppercase text-xs tracking-wider block mb-1">Action Taken</span>
                    {t.correctiveActionTaken}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-500">
                <span className="flex items-center gap-4">
                  <span>Reported: {t.createdAt}</span>
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assigned: <span className="text-slate-300 font-bold">{t.assignedTo}</span></span>
                </span>
                {t.status === 'action_required' && (
                  <button
                    onClick={() => resolveTicket(t.id, 'Action verified by Chief Safety Officer. Normal operations resumed.')}
                    className="btn-primary-earth px-5 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 5. Inspections
  const renderInspections = () => (
    <PageLayout
      title="Daily Safety Inspections"
      subtitle="Shift inspection logs and statutory safety check records."
      badge="Inspections"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Inspection Records"
          subtitle="Pre-shift and daily statutory audits."
        />

        <div className="space-y-5">
          {inspections.map((insp) => (
            <div key={insp.id} className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4 group">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide">{insp.location}</h4>
                  <p className="text-xs font-mono text-slate-400 mt-1">{insp.inspectorName} • {insp.date} ({insp.shift})</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-sm font-mono font-bold text-amber-400">{insp.score}/100</span>
                  </div>
                  <StatusBadge status={insp.status} />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/10">
                {insp.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/40 text-sm font-mono border border-white/5 group-hover:border-white/10 transition-colors">
                    <span className="text-slate-300">{item.title}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md tracking-widest uppercase ${item.status === 'pass' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 6. AI Assistant
  const renderAIAssistant = () => (
    <PageLayout
      title="AI Safety Assistant"
      subtitle="Ask safety compliance questions and get instant advice based on Coal Mines Regulations (CMR 2017)."
      badge="AI Guidance"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">

        {/* Left: Ask Form */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Ask AI for Safety Guidance"
            subtitle="Type your query or choose a common question."
          />

          <form onSubmit={handleAskAi} className="space-y-4">
            <textarea
              rows={4}
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. What is the safety action if methane exceeds 1.25%?"
              className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 transition-all resize-none placeholder:text-slate-600"
            />

            <button
              type="submit"
              disabled={isAskingAi}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Sparkles className={`w-4 h-4 ${isAskingAi ? 'animate-spin' : ''}`} />
              <span>{isAskingAi ? 'Searching Regulations...' : 'Ask AI Safety Assistant'}</span>
            </button>
          </form>

          {/* Quick Questions */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Frequently Asked</p>
            {[
              'What is the methane threshold for evacuation?',
              'What are the dust limit rules for conveyor transfer?',
              'How often should flameproof electrical units be checked?'
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiQuery(q);
                  setIsAskingAi(true);
                  setTimeout(() => {
                    setIsAskingAi(false);
                    setAiResponse(AI_KNOWLEDGE_BASE[idx]);
                  }, 600);
                }}
                className="w-full text-left p-3.5 rounded-xl glass-panel glass-panel-hover border border-white/5 hover:border-orange-500/30 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Right: AI Answer Card */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Safety Guidance Response"
            subtitle="Plain-English explanation with regulation citations."
          />

          {aiResponse ? (
            <div className="space-y-6 animate-fade-in-up">
              <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-sm font-mono">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" /> Regulation Reference
                </span>
                <p className="text-white font-bold text-base">{aiResponse.regulationCited}</p>
                <p className="text-slate-300 mt-2 leading-relaxed">{aiResponse.dgmsActClause}</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                <h5 className="text-sm font-bold text-white font-['Sora'] mb-3 tracking-wide">Recommended Action:</h5>
                <ul className="space-y-3 text-sm font-mono text-slate-300">
                  {aiResponse.actionProtocol.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-cyan-400 font-bold bg-cyan-500/10 w-6 h-6 rounded flex items-center justify-center shrink-0">{idx + 1}</span>
                      <span className="mt-0.5 leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                <span>Confidence: <span className="text-emerald-400 font-bold">{aiResponse.confidence}%</span></span>
                <span>Source: {aiResponse.retrievalSource}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 px-6 border-2 border-dashed border-white/10 rounded-3xl text-sm font-mono text-slate-500 flex flex-col items-center">
              <Sparkles className="w-12 h-12 text-slate-700 mb-4" />
              <p>Select a question on the left or type your query to receive AI safety advice based on statutory regulations.</p>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );

  // 7. Reports & History
  const renderReportsHistory = () => (
    <PageLayout
      title="Reports & Activity History"
      subtitle="Shift safety summaries, audit logs, and compliance records."
      badge="History"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Verified Safety Activity Log"
          subtitle="Chronological timeline of shift handovers, alerts, and corrective actions."
        />

        <div className="space-y-4">
          {auditTrail.map((b) => (
            <div
              key={b.blockNumber}
              className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="px-2 py-1 rounded bg-black/40 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                    Log #{b.blockNumber}
                  </span>
                  <h4 className="text-sm font-bold text-white tracking-wide">{b.action}</h4>
                </div>
                <p className="text-sm text-slate-300 font-mono leading-relaxed">{b.details}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-slate-500">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Actor: <span className="text-slate-300">{b.actor}</span> ({b.actorRole})</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {b.timestamp}</span>
                </div>
              </div>

              <div className="shrink-0 mt-3 sm:mt-0">
                <StatusBadge status="verified_closed" label="VERIFIED LOG" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 8. Profile
  const renderProfile = () => (
    <PageLayout
      title="Safety Officer Profile"
      subtitle="Command credentials, sector assignments, and safety certifications."
      badge="Officer Record"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]"></div>

        <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
          <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{currentUser?.name}</h3>
            <p className="text-sm font-mono text-emerald-400 mt-1 uppercase tracking-wider">{currentUser?.roleTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Officer Badge</span>
            <span className="text-white font-bold bg-white/5 px-2 py-1 rounded">{currentUser?.badgeNumber}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Assigned Mine</span>
            <span className="text-white">{currentUser?.mineAssigned}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Department</span>
            <span className="text-white bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{currentUser?.department}</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'monitoring': return renderMonitoring();
    case 'map': return renderMap();
    case 'incidents': return renderIncidents();
    case 'inspections': return renderInspections();
    case 'ai_assistant': return renderAIAssistant();
    case 'reports_history': return renderReportsHistory();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
