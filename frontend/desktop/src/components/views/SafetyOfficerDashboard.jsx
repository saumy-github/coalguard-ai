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
  Volume2
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
        icon: <Activity className="w-4 h-4" />,
        status: isHazardSimulated ? "critical" : "safe",
        statusLabel: isHazardSimulated ? "ALERT" : "OPTIMAL"
      },
      {
        title: "Active Incidents",
        value: `${activeIncidentsCount}`,
        subtext: "Reported across mine",
        icon: <AlertTriangle className="w-4 h-4" />,
        status: activeIncidentsCount > 0 ? "warning" : "safe",
        statusLabel: activeIncidentsCount > 0 ? "ATTENTION" : "CLEAR"
      },
      {
        title: "Open Actions",
        value: `${openActionsCount}`,
        subtext: "Require resolution",
        icon: <CheckSquare className="w-4 h-4" />,
        status: openActionsCount > 0 ? "warning" : "safe",
        statusLabel: openActionsCount > 0 ? "ACTION NEEDED" : "CLEAR"
      },
      {
        title: "Compliance Score",
        value: "94.2%",
        subtext: "DGMS Audit Standard",
        icon: <Sparkles className="w-4 h-4" />,
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
          <div className="flex items-center gap-2">
            {!isHazardSimulated ? (
              <button
                onClick={simulateHazard}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all flex items-center gap-2"
              >
                <Flame className="w-4 h-4" />
                <span>Simulate Gas Alert</span>
              </button>
            ) : (
              <button
                onClick={resetHazard}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset to Safe</span>
              </button>
            )}

            <button
              onClick={() => broadcastEvacuation('All personnel in Face 4B: Move to Fresh Air Base immediately.')}
              className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-mono font-bold transition-all flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Broadcast Alert</span>
            </button>
          </div>
        }
      >
        {/* Urgent Action Callout if Hazard Simulated */}
        {isHazardSimulated && (
          <div className="glass-card rounded-2xl p-5 border border-red-500/50 bg-red-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white font-['Sora']">
                  High Methane Alert (1.42%) in Face 4B Return Incline
                </h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1">
                  Exceeds safe 1.25% threshold. AI suggests increasing auxiliary ventilation and moving workers to Fresh Air Base.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveSubTab('incidents')}
                className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold"
              >
                View Incident Ticket
              </button>
            </div>
          </div>
        )}

        {/* Live Gas Telemetry Summary */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Live Multi-Gas Monitoring"
            subtitle="Key sensor nodes across subterranean levels."
            action={
              <button
                onClick={() => setActiveSubTab('monitoring')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>View All Sensors</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sensors.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-['Sora']">{s.location}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-[#141415] border border-[#353534]/50">
                    <p className="text-[10px] text-[#9e8d85]">Methane (CH4)</p>
                    <p className={`text-base font-bold ${s.methaneLEL > 1.25 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {s.methaneLEL}%
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#141415] border border-[#353534]/50">
                    <p className="text-[10px] text-[#9e8d85]">Air Velocity</p>
                    <p className="text-base font-bold text-white">{s.ventilationVelocityMS} m/s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents and Actions */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Incidents & Actions Needed"
            subtitle="Active safety tickets awaiting verification or closure."
            action={
              <button
                onClick={() => setActiveSubTab('incidents')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Manage Incidents</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="space-y-2.5">
            {tickets.slice(0, 2).map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-white font-['Sora']">{t.title}</h4>
                    <StatusBadge status={t.severity} />
                  </div>
                  <p className="text-xs text-[#d6c3b9] font-mono mt-1">{t.description}</p>
                  <p className="text-[10px] text-[#9e8d85] font-mono mt-1">
                    📍 {t.location} • Assigned: {t.assignedTo} • {t.createdAt}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {t.status === 'action_required' ? (
                    <button
                      onClick={() => resolveTicket(t.id, 'Ventilation speed increased to 100%. Gas levels normalized.')}
                      className="btn-bronze px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold"
                    >
                      Resolve Action
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="All Subterranean Sensor Nodes"
          subtitle="Showing live readings for Methane, Carbon Monoxide, Oxygen, Dust, and Airflow."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensors.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-xl bg-[#181717] border border-[#353534] space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white font-['Sora']">{s.location}</h4>
                  <p className="text-[11px] text-[#9e8d85] font-mono">{s.type} • Tag: {s.sensorTag}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {/* 4-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 rounded-lg bg-[#141415] border border-[#353534]">
                  <span className="text-[10px] text-[#9e8d85]">Methane (CH4)</span>
                  <p className={`text-sm font-bold ${s.methaneLEL > 1.25 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.methaneLEL}%
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141415] border border-[#353534]">
                  <span className="text-[10px] text-[#9e8d85]">CO (PPM)</span>
                  <p className="text-sm font-bold text-white">{s.carbonMonoxidePPM} PPM</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141415] border border-[#353534]">
                  <span className="text-[10px] text-[#9e8d85]">Air Velocity</span>
                  <p className="text-sm font-bold text-white">{s.ventilationVelocityMS} m/s</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141415] border border-[#353534]">
                  <span className="text-[10px] text-[#9e8d85]">Oxygen (O2)</span>
                  <p className="text-sm font-bold text-emerald-400">{s.oxygenPercent}%</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#353534]/60 flex items-center justify-between text-xs font-mono">
                <span className="text-[#9e8d85]">Battery: {s.batteryPercent}% • Ping: {s.lastPing}</span>
                <button
                  onClick={() => handleCalibrate(s.id)}
                  disabled={calibratingId === s.id}
                  className="text-xs text-[#f6b994] hover:underline font-bold"
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Sector 7G Deep Coalfield (Raniganj)"
          subtitle="Showing Sub-Levels 0m, -150m, -320m, and -450m."
        />

        {/* Visual Map */}
        <div className="relative w-full h-96 rounded-2xl bg-[#0e0e0f] border border-[#353534] overflow-hidden p-6 flex flex-col justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#252423_1px,transparent_1px),linear-gradient(to_bottom,#252423_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />

          {/* Levels */}
          <div className="relative z-10 flex items-center justify-between p-3 rounded-xl bg-[#1a1919] border border-[#51443d]/50">
            <span className="text-xs font-mono font-bold text-white">Level 0m (Surface Intake & Winding House)</span>
            <span className="text-xs font-mono text-emerald-400">Fan Speed: 5.4 m/s</span>
          </div>

          <div className="relative z-10 flex items-center justify-between p-3 rounded-xl bg-[#1a1919] border border-[#353534]">
            <span className="text-xs font-mono text-[#d6c3b9]">Level -150m (Main Return Airway Incline #2)</span>
            <span className="text-xs font-mono text-white">Sensor SN-AIR-08: Normal</span>
          </div>

          <div className={`relative z-10 p-4 rounded-xl border flex items-center justify-between transition-all ${
            isHazardSimulated ? 'bg-red-950/30 border-red-500 text-white' : 'bg-[#251e18] border-[#8d5d3e] text-white'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isHazardSimulated ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                <h4 className="text-xs font-bold font-['Sora']">
                  Sub-Level -320m (Active Face 4B - Coal Extraction)
                </h4>
              </div>
              <p className="text-[11px] font-mono text-[#d6c3b9] mt-0.5">
                14 Workers Assigned • Strata Support Active • Refuge Chamber 9 Clear
              </p>
            </div>
            <span className="text-xs font-mono font-bold">
              {isHazardSimulated ? '⚠️ ALERT: Methane 1.42%' : '✓ Safe Status'}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-between p-3 rounded-xl bg-[#1a1919] border border-[#353534]">
            <span className="text-xs font-mono text-[#9e8d85]">Sub-Level -450m (Goaf Isolation Seal #3)</span>
            <span className="text-xs font-mono text-[#9e8d85]">Seal Intact</span>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="All Safety Tickets"
          subtitle="Showing open, in-progress, and resolved items."
        />

        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-xl bg-[#181717] border border-[#353534] space-y-3 shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#f6b994]">{t.id}</span>
                  <h4 className="text-sm font-bold text-white font-['Sora']">{t.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.severity} />
                  <StatusBadge status={t.status} />
                </div>
              </div>

              <p className="text-xs text-[#d6c3b9] font-mono leading-relaxed">{t.description}</p>

              {/* AI Suggested Action */}
              <div className="p-3 rounded-lg bg-[#201d1b] border border-[#8d5d3e]/40 text-xs font-mono">
                <p className="text-[10px] text-[#f6b994] font-bold uppercase mb-1">
                  💡 AI Suggested Action & DGMS Reference
                </p>
                <p className="text-[#d6c3b9] whitespace-pre-line">{t.aiSuggestedAction}</p>
                <p className="text-[10px] text-[#9e8d85] mt-1">{t.dgmsRegulationRef}</p>
              </div>

              {t.correctiveActionTaken && (
                <div className="p-2.5 rounded-lg bg-[#142018] border border-emerald-500/40 text-xs font-mono text-emerald-300">
                  <span className="font-bold">Action Taken: </span>
                  {t.correctiveActionTaken}
                </div>
              )}

              <div className="pt-2 border-t border-[#353534]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <span className="text-[#9e8d85]">Reported: {t.createdAt} • Assigned: {t.assignedTo}</span>
                {t.status === 'action_required' && (
                  <button
                    onClick={() => resolveTicket(t.id, 'Action verified by Chief Safety Officer. Normal operations resumed.')}
                    className="btn-bronze px-4 py-1.5 rounded-lg text-xs font-mono font-bold"
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Inspection Records"
          subtitle="Pre-shift and daily statutory audits."
        />

        <div className="space-y-4">
          {inspections.map((insp) => (
            <div key={insp.id} className="p-5 rounded-xl bg-[#181717] border border-[#353534] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white font-['Sora']">{insp.location}</h4>
                  <p className="text-xs font-mono text-[#9e8d85]">{insp.inspectorName} • {insp.date} ({insp.shift})</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">{insp.score}/100 Score</span>
                  <StatusBadge status={insp.status} />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {insp.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#141415] text-xs font-mono">
                    <span className="text-[#d6c3b9]">{item.title}</span>
                    <span className={`text-[10px] font-bold ${item.status === 'pass' ? 'text-emerald-400' : 'text-red-400'}`}>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Ask Form */}
        <div className="md:col-span-6 glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Ask AI for Safety Guidance"
            subtitle="Type your query or choose a common question."
          />

          <form onSubmit={handleAskAi} className="space-y-3">
            <textarea
              rows={3}
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="e.g. What is the safety action if methane exceeds 1.25%?"
              className="w-full px-4 py-3 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
            />

            <button
              type="submit"
              disabled={isAskingAi}
              className="w-full btn-bronze py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAskingAi ? 'Searching Regulations...' : 'Ask AI Safety Assistant'}</span>
            </button>
          </form>

          {/* Quick Questions */}
          <div className="space-y-2 pt-2 border-t border-[#353534]/60">
            <p className="text-[11px] font-mono text-[#9e8d85] uppercase">Frequently Asked</p>
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
                className="w-full text-left p-2.5 rounded-lg bg-[#1a1919] hover:bg-[#252423] border border-[#353534] text-xs font-mono text-[#d6c3b9] hover:text-[#f6b994] transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Right: AI Answer Card */}
        <div className="md:col-span-6 glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Safety Guidance Response"
            subtitle="Plain-English explanation with regulation citations."
          />

          {aiResponse ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-[#201d1b] border border-[#8d5d3e] text-xs font-mono">
                <span className="text-[10px] font-bold text-[#f6b994] uppercase">Regulation Reference</span>
                <p className="text-white font-bold mt-0.5">{aiResponse.regulationCited}</p>
                <p className="text-[#d6c3b9] mt-1">{aiResponse.dgmsActClause}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-white font-['Sora'] mb-1">Recommended Action:</h5>
                <ul className="space-y-1.5 text-xs font-mono text-[#d6c3b9]">
                  {aiResponse.actionProtocol.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#f6b994] font-bold">{idx + 1}.</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-[#353534]/60 text-[10px] font-mono text-[#9e8d85]">
                Confidence: {aiResponse.confidence}% • Source: {aiResponse.retrievalSource}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs font-mono text-[#9e8d85]">
              Select a question on the left or type your query to receive AI safety advice.
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Verified Safety Activity Log"
          subtitle="Chronological timeline of shift handovers, alerts, and corrective actions."
        />

        <div className="space-y-3">
          {auditTrail.map((b) => (
            <div
              key={b.blockNumber}
              className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#f6b994]">Log #{b.blockNumber}</span>
                  <h4 className="text-xs font-bold text-white font-['Sora']">{b.action}</h4>
                </div>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1">{b.details}</p>
                <p className="text-[10px] text-[#9e8d85] font-mono mt-0.5">
                  Actor: {b.actor} ({b.actorRole}) • {b.timestamp}
                </p>
              </div>

              <StatusBadge status="verified_closed" label="VERIFIED" />
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[#353534]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#f6b994]/60 flex items-center justify-center text-white text-2xl font-extrabold font-['Sora'] shadow-lg">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Sora']">{currentUser?.name}</h3>
            <p className="text-xs font-mono text-[#f6b994]">{currentUser?.roleTitle}</p>
            <p className="text-[11px] font-mono text-[#9e8d85]">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Officer Badge:</span>
            <span className="text-white font-bold">{currentUser?.badgeNumber}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Assigned Mine:</span>
            <span className="text-white">{currentUser?.mineAssigned}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Department:</span>
            <span className="text-white">{currentUser?.department}</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'monitoring':
      return renderMonitoring();
    case 'map':
      return renderMap();
    case 'incidents':
      return renderIncidents();
    case 'inspections':
      return renderInspections();
    case 'ai_assistant':
      return renderAIAssistant();
    case 'reports_history':
      return renderReportsHistory();
    case 'profile':
      return renderProfile();
    case 'overview':
    default:
      return renderOverview();
  }
};
