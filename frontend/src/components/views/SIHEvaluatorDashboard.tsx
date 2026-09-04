import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Award, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  FileCheck, 
  History, 
  Play, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert, 
  Activity, 
  HardHat, 
  Building2, 
  Landmark, 
  Volume2,
  AlertTriangle,
  MessageSquare,
  FileCode2
} from 'lucide-react';

export const SIHEvaluatorDashboard = () => {
  const { 
    currentUser, 
    activeSubTab, 
    setActiveSubTab,
    setActiveView, 
    isHazardSimulated, 
    simulateHazard, 
    resetHazard, 
    resolveTicket, 
    broadcastEvacuation,
    loginAsRole,
    addToast 
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPlayingAutoDemo, setIsPlayingAutoDemo] = useState(false);
  const sectionRef = useRef(null);

  // Scroll to top when the page loads
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, 100);
  }, []);

  const startAutoDemo = () => {
    setIsPlayingAutoDemo(true);
    setCurrentStep(1);
    
    // Use setTimeout to ensure DOM has updated before calculating offset
    setTimeout(() => {
      if (sectionRef.current) {
        const yOffset = -100; // Account for sticky header height
        const element = sectionRef.current;
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);

    simulateHazard(true); // Pass true to suppress toasts

    // Increased delays so new users have time to read and understand the steps
    setTimeout(() => {
      setCurrentStep(2);
    }, 6000);

    setTimeout(() => {
      setCurrentStep(3);
      resolveTicket('TCK-2026-089', 'Auxiliary ventilation boosted to 100%. Methane normalized.', true); // Pass true to suppress toasts
    }, 12000);

    setTimeout(() => {
      setCurrentStep(4);
    }, 18000);

    setTimeout(() => {
      setIsPlayingAutoDemo(false);
    }, 24000);
  };

  // 1. Main Demo Dashboard
  const renderOverview = () => {
    const summaryCards = [
      {
        title: "1. Incident Status",
        value: isHazardSimulated ? "Warning" : "Safe",
        subtext: isHazardSimulated ? "Methane 1.42% Detected" : "Normal Baseline (0.42%)",
        icon: <Flame className="w-5 h-5 text-amber-400" />,
        status: isHazardSimulated ? "warning" : "safe",
        statusLabel: isHazardSimulated ? "ALERT TRIGGERED" : "CLEAR"
      },
      {
        title: "2. AI Recommendation",
        value: "CMR Reg 153",
        subtext: "Auxiliary Fan to 100%",
        icon: <Sparkles className="w-5 h-5 text-orange-400" />,
        status: "safe",
        statusLabel: "AI READY"
      },
      {
        title: "3. DGMS Compliance",
        value: "100% Compliant",
        subtext: "Standard protocol followed",
        icon: <FileCheck className="w-5 h-5 text-lime-400" />,
        status: "safe",
        statusLabel: "VERIFIED"
      },
      {
        title: "4. Audit History",
        value: "Immutable",
        subtext: "Encrypted log created",
        icon: <History className="w-5 h-5 text-stone-400" />,
        status: "safe",
        statusLabel: "RECORDED"
      }
    ];

    return (
      <PageLayout
        title="Smart India Hackathon (SIH 2026) Interactive Demo"
        subtitle="Experience how CoalGuard AI detects a dangerous underground methane spike, provides instant AI safety guidance, and secures regulatory compliance in 60 seconds."
        badge="SIH Evaluator"
        summaryCards={summaryCards}
        headerActions={
          <div className="flex items-center gap-3">
            <button
              onClick={startAutoDemo}
              disabled={isPlayingAutoDemo}
              className="btn-primary-earth px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPlayingAutoDemo ? 'Running Walkthrough...' : 'Run 60-Sec Auto Demo'}</span>
            </button>

            {isHazardSimulated && (
              <button
                onClick={resetHazard}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-mono text-white border border-white/10 transition-all flex items-center gap-2 shadow-inner"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Demo</span>
              </button>
            )}
          </div>
        }
      >
        {/* 4-Step Interactive Flow */}
        <div ref={sectionRef} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-8 mt-6 relative overflow-hidden scroll-mt-24">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none"></div>

          <SectionHeader
            title="The 4-Step Incident Lifecycle"
            subtitle="Click any step below to test individual features interactively."
          />

          <div className="relative z-10 pt-4">
            {/* Connecting Progress Line (Shifted above cards) */}
            <div className="absolute top-0 left-4 right-4 h-1 bg-white/10 rounded-full hidden lg:block overflow-hidden">
               <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-lime-500 opacity-50 transition-all duration-700" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Step 1 */}
              <div
                onClick={() => {
                  setCurrentStep(1);
                  simulateHazard();
                }}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  currentStep === 1
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] transform scale-105 z-10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${currentStep === 1 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 bg-black/40'}`}>
                    STEP 1
                  </span>
                  <Flame className={`w-5 h-5 ${currentStep === 1 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">1. Safety Incident</h4>
                <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">
                  Trigger sensor spike in Face 4B (CH4 exceeds 1.25%).
                </p>
              </div>

              {/* Step 2 */}
              <div
                onClick={() => setCurrentStep(2)}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  currentStep === 2
                    ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)] transform scale-105 z-10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${currentStep === 2 ? 'text-orange-400 bg-orange-500/20' : 'text-slate-400 bg-black/40'}`}>
                    STEP 2
                  </span>
                  <Sparkles className={`w-5 h-5 ${currentStep === 2 ? 'text-orange-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">2. AI Analysis</h4>
                <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">
                  AI cross-checks CMR 2017 and suggests fan boost.
                </p>
              </div>

              {/* Step 3 */}
              <div
                onClick={() => {
                  setCurrentStep(3);
                  resolveTicket('TCK-2026-089', 'Ventilation boosted to 100%. Normalized.');
                }}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  currentStep === 3
                    ? 'bg-lime-500/10 border-lime-500/50 shadow-[0_0_30px_rgba(132,204,22,0.2)] transform scale-105 z-10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${currentStep === 3 ? 'text-lime-400 bg-lime-500/20' : 'text-slate-400 bg-black/40'}`}>
                    STEP 3
                  </span>
                  <CheckCircle2 className={`w-5 h-5 ${currentStep === 3 ? 'text-lime-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">3. Corrective Action</h4>
                <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">
                  Safety Officer executes action & resolves ticket.
                </p>
              </div>

              {/* Step 4 */}
              <div
                onClick={() => setCurrentStep(4)}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  currentStep === 4
                    ? 'bg-stone-500/20 border-stone-500/50 shadow-[0_0_30px_rgba(120,113,108,0.2)] transform scale-105 z-10'
                    : 'bg-white/5 border-white/10 hover:border-white/20 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${currentStep === 4 ? 'text-stone-300 bg-stone-500/40' : 'text-slate-400 bg-black/40'}`}>
                    STEP 4
                  </span>
                  <History className={`w-5 h-5 ${currentStep === 4 ? 'text-stone-300 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <h4 className="text-sm font-bold text-white tracking-wide">4. Immutable History</h4>
                <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed">
                  DGMS audit log permanently saved with timestamp.
                </p>
              </div>

            </div>
          </div>

          {/* Active Step Details Panel */}
          <div className="p-8 rounded-3xl bg-black/60 border border-white/10 relative z-10 shadow-inner overflow-hidden min-h-[200px] flex items-center">
            
            {/* Ambient detail glow */}
            <div className={`absolute -inset-10 opacity-20 blur-3xl transition-all duration-700 ${
              currentStep === 1 ? 'bg-amber-500' :
              currentStep === 2 ? 'bg-orange-500' :
              currentStep === 3 ? 'bg-lime-500' : 'bg-stone-500'
            }`}></div>

            <div className="w-full relative z-10">
              {currentStep === 1 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                      <Flame className="w-6 h-6 text-amber-400" />
                      Step 1: Subterranean Sensor Spike Detection
                    </h4>
                    <p className="text-sm text-slate-300 font-mono leading-relaxed">
                      When sensor <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">SN-MTH-01</span> detects Methane at 1.42% (exceeding the DGMS 1.25% limit), an automated high-priority alert is immediately broadcasted to the Mine Safety Officer and Underground Workers.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={simulateHazard}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all flex items-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" /> Simulate Spike Now
                      </button>
                      <button
                        onClick={() => broadcastEvacuation('Face 4B Workers: Move to Safe Refuge Station immediately.')}
                        className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all flex items-center gap-2"
                      >
                        <Volume2 className="w-4 h-4" /> Broadcast Evacuation
                      </button>
                    </div>
                  </div>
                  
                  {/* Mock UI Preview */}
                  <div className="w-full md:w-80 shrink-0 p-4 rounded-2xl bg-[#1a1511] border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Live Sensor</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <h5 className="text-2xl font-bold text-white">1.42<span className="text-sm text-slate-400 ml-1">%</span></h5>
                        <p className="text-xs font-mono text-amber-400 mt-1 uppercase tracking-widest">Methane (CH4)</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Flame className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-orange-400" />
                      Step 2: AI Safety Regulation Retrieval
                    </h4>
                    <p className="text-sm text-slate-300 font-mono leading-relaxed">
                      The AI Assistant instantly queries the statutory knowledge base and cites <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/20">Coal Mines Regulations 2017, Regulation 153 (Ventilation)</strong>.
                    </p>
                    <p className="text-sm text-slate-400 italic">
                      "Increase auxiliary fan to 100% capacity and move miners 150m upwind to Fresh Air Base."
                    </p>
                  </div>

                  {/* Mock UI Preview */}
                  <div className="w-full md:w-80 shrink-0 p-4 rounded-2xl bg-[#1a1511] border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.15)] flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                      </div>
                      <span className="text-xs font-bold text-orange-400">CoalGuard AI Copilot</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl rounded-tl-none border border-white/10 text-xs font-mono text-slate-300 leading-relaxed">
                      <span className="text-orange-300 font-bold block mb-1">CMR 2017 Reg 153 Match:</span>
                      1. Increase auxiliary fan to 100% capacity.<br/>
                      2. Move miners 150m upwind to Fresh Air Base.<br/>
                      3. Log corrective action in DGMS register.
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-lime-400" />
                      Step 3: Verification & Closure of Corrective Action
                    </h4>
                    <p className="text-sm text-slate-300 font-mono leading-relaxed">
                      The Mine Safety Officer logs the engineering correction. The sensor readings return to safe levels (0.42%) and the system marks the incident ticket as resolved.
                    </p>
                  </div>

                  {/* Mock UI Preview */}
                  <div className="w-full md:w-80 shrink-0 p-4 rounded-2xl bg-[#1a1511] border border-lime-500/30 shadow-[0_0_20px_rgba(132,204,22,0.15)] flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <span className="text-xs font-mono text-slate-400">Ticket TCK-2026-089</span>
                      <StatusBadge status="safe" label="RESOLVED" />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-8 h-8 rounded-full bg-lime-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-lime-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Action Executed</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ventilation boosted to 100%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                      <History className="w-6 h-6 text-stone-300" />
                      Step 4: Immutable Audit Record Created
                    </h4>
                    <p className="text-sm text-slate-300 font-mono leading-relaxed">
                      Every step is permanently preserved in the verifiable audit trail, guaranteeing transparent, tamper-evident oversight for DGMS regulatory inspectors.
                    </p>
                  </div>

                  {/* Mock UI Preview */}
                  <div className="w-full md:w-80 shrink-0 p-4 rounded-2xl bg-[#1a1511] border border-stone-500/30 shadow-[0_0_20px_rgba(120,113,108,0.15)] flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1 text-stone-400 text-[10px] font-mono uppercase tracking-widest">
                      <FileCode2 className="w-3.5 h-3.5" /> Immutable Log Entry
                    </div>
                    <pre className="text-[9px] font-mono text-stone-300 bg-black/50 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
{`{
  "block": 849201,
  "timestamp": "2026-09-01T14:32:00Z",
  "actor": "O.Sharma (Safety Officer)",
  "action": "TICKET_RESOLVE",
  "details": "Ventilation boosted",
  "compliance": "CMR 2017 Reg 153",
  "hash": "0x7a8f9b...3d2e"
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Explore Other Roles */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Explore Real Dashboards for All 5 Stakeholder Roles"
            subtitle="Click any role to see their live interface."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
            {[
              { role: 'field_worker', name: 'Worker', icon: <HardHat className="w-5 h-5 text-amber-400" />, glow: 'group-hover:bg-amber-500/10', border: 'group-hover:border-amber-500/50', text: 'group-hover:text-amber-400' },
              { role: 'safety_officer', name: 'Safety Officer', icon: <Activity className="w-5 h-5 text-amber-400" />, glow: 'group-hover:bg-amber-500/10', border: 'group-hover:border-amber-500/50', text: 'group-hover:text-amber-400' },
              { role: 'corporate_management', name: 'Corporate Exec', icon: <Building2 className="w-5 h-5 text-stone-400" />, glow: 'group-hover:bg-stone-500/10', border: 'group-hover:border-stone-500/50', text: 'group-hover:text-stone-300' },
              { role: 'regulatory_authority', name: 'DGMS Regulator', icon: <Landmark className="w-5 h-5 text-lime-400" />, glow: 'group-hover:bg-lime-500/10', border: 'group-hover:border-lime-500/50', text: 'group-hover:text-lime-400' },
              { role: 'system_admin', name: 'System Admin', icon: <Sparkles className="w-5 h-5 text-orange-400" />, glow: 'group-hover:bg-orange-500/10', border: 'group-hover:border-orange-500/50', text: 'group-hover:text-orange-400' }
            ].map((r) => (
              <button
                key={r.role}
                onClick={() => setActiveView('login')}
                className={`p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 ${r.border} transition-all text-left flex flex-col items-center justify-center gap-3 group relative overflow-hidden`}
              >
                {/* Spotlight hover effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${r.glow}`}></div>
                
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 group-hover:scale-110 transition-transform shadow-lg relative z-10">
                  {r.icon}
                </div>
                <div className="text-center relative z-10">
                  <h5 className={`text-sm font-bold text-white transition-colors ${r.text}`}>
                    {r.name}
                  </h5>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Login →</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </PageLayout>
    );
  };

  // Sub-tabs redirect directly to interactive step or explore
  switch (activeSubTab) {
    case 'sih_incident':
    case 'sih_ai':
    case 'sih_compliance':
    case 'sih_history':
    case 'sih_explore':
    case 'overview':
    default:
      return renderOverview();
  }
};
