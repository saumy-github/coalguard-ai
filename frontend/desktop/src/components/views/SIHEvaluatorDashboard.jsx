import React, { useState } from 'react';
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
  Volume2
} from 'lucide-react';

export const SIHEvaluatorDashboard = () => {
  const { 
    currentUser, 
    activeSubTab, 
    setActiveSubTab, 
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

  const startAutoDemo = () => {
    setIsPlayingAutoDemo(true);
    setCurrentStep(1);
    simulateHazard();
    addToast('info', 'Step 1 of 4', 'Simulating Methane Spike in Face 4B...');

    setTimeout(() => {
      setCurrentStep(2);
      addToast('info', 'Step 2 of 4', 'AI Safety Assistant analyzing CMR 2017 Reg 153...');
    }, 2500);

    setTimeout(() => {
      setCurrentStep(3);
      resolveTicket('TCK-2026-089', 'Auxiliary ventilation boosted to 100%. Methane normalized.');
      addToast('success', 'Step 3 of 4', 'Corrective action resolved and verified.');
    }, 5000);

    setTimeout(() => {
      setCurrentStep(4);
      setIsPlayingAutoDemo(false);
      addToast('success', 'Demo Complete', 'Full incident resolution recorded in audit trail!');
    }, 7500);
  };

  // 1. Main Demo Dashboard
  const renderOverview = () => {
    const summaryCards = [
      {
        title: "1. Incident Status",
        value: isHazardSimulated ? "Warning" : "Safe",
        subtext: isHazardSimulated ? "Methane 1.42% Detected" : "Normal Baseline (0.42%)",
        icon: <Flame className="w-4 h-4 text-amber-400" />,
        status: isHazardSimulated ? "critical" : "safe",
        statusLabel: isHazardSimulated ? "ALERT TRIGGERED" : "CLEAR"
      },
      {
        title: "2. AI Recommendation",
        value: "CMR Reg 153",
        subtext: "Auxiliary Fan to 100%",
        icon: <Sparkles className="w-4 h-4 text-[#f6b994]" />,
        status: "safe",
        statusLabel: "AI READY"
      },
      {
        title: "3. DGMS Compliance",
        value: "100% Compliant",
        subtext: "Standard protocol followed",
        icon: <FileCheck className="w-4 h-4 text-emerald-400" />,
        status: "optimal",
        statusLabel: "VERIFIED"
      },
      {
        title: "4. Audit History",
        value: "Immutable",
        subtext: "Encrypted log created",
        icon: <History className="w-4 h-4 text-blue-400" />,
        status: "safe",
        statusLabel: "RECORDED"
      }
    ];

    return (
      <PageLayout
        title="Smart India Hackathon (SIH 2026) Interactive Demo"
        subtitle="Experience how CoalGuard AI detects a dangerous underground methane spike, provides instant AI safety guidance, and secures regulatory compliance in 60 seconds."
        badge="SIH 2026 Evaluation"
        summaryCards={summaryCards}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={startAutoDemo}
              disabled={isPlayingAutoDemo}
              className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isPlayingAutoDemo ? 'Running Walkthrough...' : 'Run 60-Sec Auto Demo'}</span>
            </button>

            {isHazardSimulated && (
              <button
                onClick={resetHazard}
                className="px-3.5 py-2 rounded-xl bg-[#252423] hover:bg-[#353534] text-xs font-mono text-white border border-[#353534] transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        }
      >
        {/* 4-Step Interactive Flow */}
        <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-6">
          <SectionHeader
            title="The 4-Step Incident Lifecycle"
            subtitle="Click any step below to test individual features interactively."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Step 1 */}
            <div
              onClick={() => {
                setCurrentStep(1);
                simulateHazard();
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                currentStep === 1
                  ? 'bg-[#251e18] border-[#f6b994] shadow-lg'
                  : 'bg-[#181717] border-[#353534] hover:border-[#8d5d3e]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded">
                  STEP 1
                </span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">1. Safety Incident</h4>
              <p className="text-[11px] text-[#9e8d85] font-mono mt-1">
                Trigger sensor spike in Face 4B (CH4 exceeds 1.25%).
              </p>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setCurrentStep(2)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                currentStep === 2
                  ? 'bg-[#251e18] border-[#f6b994] shadow-lg'
                  : 'bg-[#181717] border-[#353534] hover:border-[#8d5d3e]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded">
                  STEP 2
                </span>
                <Sparkles className="w-4 h-4 text-[#f6b994]" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">2. AI Analysis</h4>
              <p className="text-[11px] text-[#9e8d85] font-mono mt-1">
                AI cross-checks CMR 2017 and suggests fan boost.
              </p>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => {
                setCurrentStep(3);
                resolveTicket('TCK-2026-089', 'Ventilation boosted to 100%. Normalized.');
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                currentStep === 3
                  ? 'bg-[#251e18] border-[#f6b994] shadow-lg'
                  : 'bg-[#181717] border-[#353534] hover:border-[#8d5d3e]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded">
                  STEP 3
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">3. Corrective Action</h4>
              <p className="text-[11px] text-[#9e8d85] font-mono mt-1">
                Safety Officer executes action & resolves ticket.
              </p>
            </div>

            {/* Step 4 */}
            <div
              onClick={() => setCurrentStep(4)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                currentStep === 4
                  ? 'bg-[#251e18] border-[#f6b994] shadow-lg'
                  : 'bg-[#181717] border-[#353534] hover:border-[#8d5d3e]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded">
                  STEP 4
                </span>
                <History className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-white font-['Sora']">4. Immutable History</h4>
              <p className="text-[11px] text-[#9e8d85] font-mono mt-1">
                DGMS audit log permanently saved with timestamp.
              </p>
            </div>

          </div>

          {/* Active Step Details Panel */}
          <div className="p-5 rounded-2xl bg-[#141415] border border-[#51443d]/50 space-y-3">
            {currentStep === 1 && (
              <div>
                <h4 className="text-sm font-bold text-white font-['Sora'] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Step 1: Subterranean Sensor Spike Detection
                </h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1 leading-relaxed">
                  When sensor SN-MTH-01 detects Methane at 1.42% (exceeding the DGMS 1.25% limit), an automated high-priority alert is immediately broadcasted to the Mine Safety Officer and Underground Workers.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={simulateHazard}
                    className="btn-bronze px-3 py-1.5 rounded-lg text-xs font-mono font-bold"
                  >
                    Simulate Spike Now
                  </button>
                  <button
                    onClick={() => broadcastEvacuation('Face 4B Workers: Move to Safe Refuge Station immediately.')}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800 text-xs font-mono font-bold"
                  >
                    Broadcast Evacuation
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h4 className="text-sm font-bold text-white font-['Sora'] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#f6b994]" />
                  Step 2: AI Safety Regulation Retrieval (CMR 2017)
                </h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1 leading-relaxed">
                  The AI Assistant instantly queries the statutory knowledge base and cites <strong>Coal Mines Regulations 2017, Regulation 153 (Ventilation)</strong>: "Increase auxiliary fan to 100% capacity and move miners 150m upwind to Fresh Air Base."
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h4 className="text-sm font-bold text-white font-['Sora'] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Step 3: Verification & Closure of Corrective Action
                </h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1 leading-relaxed">
                  The Mine Safety Officer logs the engineering correction. The sensor readings return to safe levels (0.42%) and the system marks the incident ticket as resolved.
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h4 className="text-sm font-bold text-white font-['Sora'] flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  Step 4: Immutable Audit Record Created
                </h4>
                <p className="text-xs text-[#d6c3b9] font-mono mt-1 leading-relaxed">
                  Every step is permanently preserved in the verifiable audit trail, guaranteeing transparent, tamper-evident oversight for DGMS regulatory inspectors.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Explore Other Roles */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Explore Real Dashboards for All 5 Stakeholder Roles"
            subtitle="Click any role to see their live interface."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { role: 'field_worker', name: 'Worker', icon: <HardHat className="w-4 h-4 text-amber-400" /> },
              { role: 'safety_officer', name: 'Safety Officer', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
              { role: 'corporate_management', name: 'Corporate Exec', icon: <Building2 className="w-4 h-4 text-blue-400" /> },
              { role: 'regulatory_authority', name: 'DGMS Regulator', icon: <Landmark className="w-4 h-4 text-purple-400" /> },
              { role: 'system_admin', name: 'System Admin', icon: <Sparkles className="w-4 h-4 text-cyan-400" /> }
            ].map((r) => (
              <button
                key={r.role}
                onClick={() => loginAsRole(r.role)}
                className="p-3 rounded-xl bg-[#181717] hover:bg-[#252423] border border-[#353534] hover:border-[#f6b994] transition-all text-left flex items-center gap-2.5 group"
              >
                <div className="p-1.5 rounded-lg bg-[#252423]">
                  {r.icon}
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white font-['Sora'] group-hover:text-[#f6b994]">
                    {r.name}
                  </h5>
                  <p className="text-[10px] text-[#9e8d85] font-mono">Open View →</p>
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
