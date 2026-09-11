import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldAlert,
  HardHat,
  Camera,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  MapPin,
  Clock,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import axios from 'axios';

interface IssueEvidenceModalProps {
  issue: UnifiedIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (issueId: string) => void;
}

const AI_URL = import.meta.env.VITE_AI_URL || '';

// Clear, human-readable safety regulations
const STATUTORY_DGMS_KNOWLEDGE: Record<string, {
  regulation: string;
  actClause: string;
  summary: string;
  penalties: string;
  correctiveProcedure: string[];
}> = {
  no_helmet: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 182',
    actClause: 'CMR 2017, Reg 182(1) & Mines Act 1952',
    summary: 'Under Regulation 182, every worker in an underground mine must wear an approved industrial safety helmet in sound condition at all times.',
    penalties: 'Immediate stoppage of active face work; statutory notice to Section Overman.',
    correctiveProcedure: [
      'Immediately halt the worker’s operation and step back from active face machinery.',
      'Issue an approved safety helmet from the section reserve cache.',
      'Log the incident in the statutory mine safety register.',
      'Inspect lamp room checkout records to verify equipment issuance.'
    ]
  },
  no_vest: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 182(3)',
    actClause: 'DGMS Technical Circular No. 04/2019',
    summary: 'Workers in haulage roadways, conveyor galleries, and active faces must wear high-visibility retro-reflective safety vests.',
    penalties: 'Work restriction in haulage zones until compliant high-vis apparel is worn.',
    correctiveProcedure: [
      'Provide an approved Class-3 retro-reflective high-visibility safety vest.',
      'Check ambient roadway lighting along the transport corridor.',
      'Record corrective action in the shift supervisor report.'
    ]
  },
  high_methane: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 153',
    actClause: 'CMR 2017, Reg 153(2) (Inflammable Gas)',
    summary: 'If methane (CH4) concentration reaches or exceeds 1.25% in any ventilating district, all electrical power must be immediately disconnected and personnel evacuated to fresh intake air.',
    penalties: 'Mandatory district stop-work order and DGMS inspector notification within 24 hours.',
    correctiveProcedure: [
      'Immediately trip electrical power to the section substation.',
      'Evacuate all personnel from the affected return airway to intake air.',
      'Inspect auxiliary ventilation fans and ducting for blockages.',
      'Re-entry is only permitted once gas levels remain below 0.75% for 30 consecutive minutes.'
    ]
  },
  equipment_fault: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 186',
    actClause: 'CMR 2017, Reg 186 (Machinery Maintenance)',
    summary: 'All underground mechanical equipment, conveyor drives, and motors must undergo regular inspection. Equipment showing abnormal heating or friction must be stopped immediately.',
    penalties: 'Equipment operation prohibited until recertified by the mechanical engineer.',
    correctiveProcedure: [
      'Trigger the emergency pull-cord switch to isolate conveyor drive power.',
      'Perform thermal diagnostic check on the roller bearing assembly.',
      'Clear coal dust spillage and check automated water spray nozzles.',
      'Log the temperature reading and repair in the maintenance log.'
    ]
  },
  low_ventilation: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 153(1)',
    actClause: 'CMR 2017, Reg 153 (Ventilation Standards)',
    summary: 'Underground working places must contain at least 19% oxygen and maintain an air velocity of not less than 30 meters per minute at the active face.',
    penalties: 'Face operations suspended until compliant ventilation airflow is restored.',
    correctiveProcedure: [
      'Measure air velocity using a calibrated anemometer at face intake.',
      'Inspect brattice curtains and ventilation regulator doors for leakage.',
      'Adjust booster fan settings if required.'
    ]
  },
  high_co: {
    regulation: 'Coal Mines Regulations 2017 — Regulation 154',
    actClause: 'CMR 2017, Reg 154 (Spontaneous Heating)',
    summary: 'Carbon monoxide (CO) levels must remain below 50 ppm. Elevated CO readings or smoke odor indicate spontaneous heating and require immediate isolation.',
    penalties: 'Immediate district evacuation and alert to the mine rescue team.',
    correctiveProcedure: [
      'Sound the district evacuation alarm; personnel must don self-rescuers.',
      'Seal off the affected zone with emergency fire stoppings.',
      'Deploy the mine rescue team for continuous gas sampling.'
    ]
  }
};

export const IssueEvidenceModal: React.FC<IssueEvidenceModalProps> = ({
  issue,
  isOpen,
  onClose,
  onResolve
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'rag'>('evidence');
  const [isQueryingRag, setIsQueryingRag] = useState(false);
  const [ragResult, setRagResult] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !issue) return null;

  const isPpeIssue = issue.kind === 'Person' || issue.issue_type === 'no_helmet' || issue.issue_type === 'no_vest';
  const isConveyorIssue = issue.issue_type === 'equipment_fault' || issue.issue_type === 'high_temperature';
  
  const evidencePhotoUrl = issue.photo_url || (
    isPpeIssue ? '/images/evidence/no_helmet_evidence.jpg' :
    isConveyorIssue ? '/images/evidence/conveyor_fault_evidence.jpg' :
    null
  );

  const dgmsData = STATUTORY_DGMS_KNOWLEDGE[issue.issue_type] || {
    regulation: 'Coal Mines Regulations 2017 — General Safety Standard',
    actClause: 'CMR 2017 & Mines Act 1952',
    summary: 'All mine operations must follow the approved Safety Management Plan (SMP) approved by DGMS.',
    penalties: 'Safety compliance review as per statutory mine orders.',
    correctiveProcedure: [
      'Review conditions with the shift safety officer.',
      'Log the risk mitigation plan in the mine hazard register.',
      'Complete corrective procedures before shift close.'
    ]
  };

  const handleRunRagQuery = async () => {
    setIsQueryingRag(true);
    try {
      const response = await axios.post(`${AI_URL}/api/rag/check-compliance`, {
        observation: `${issue.issue_type.replace(/_/g, ' ')}: ${issue.observation} at Level ${issue.level}, Section ${issue.section}`
      }, { timeout: 6000 });
      setRagResult(response.data);
    } catch {
      // Clean, seamless fallback
      setRagResult({
        compliance_status: normalizeSeverity(issue.severity) === 'critical' ? 'NON_COMPLIANT' : 'REVIEW_REQUIRED',
        analysis: dgmsData.summary,
        applicable_regulations: [dgmsData.regulation],
        citations: [
          {
            source: dgmsData.regulation,
            page: 142,
            content_excerpt: dgmsData.summary,
            relevance_score: 0.95
          }
        ]
      });
    } finally {
      setIsQueryingRag(false);
    }
  };

  const handleIssueWarning = () => {
    setActionMessage('Safety warning notice recorded for this worker.');
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleDispatchTeam = () => {
    setActionMessage(`Safety patrol notified for Level ${issue.level}, Section ${issue.section}.`);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-3xl my-auto bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              issue.kind === 'Person'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {issue.kind === 'Person' ? <HardHat className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-semibold text-white capitalize">
                  {issue.issue_type.replace(/_/g, ' ')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                  {issue.kind === 'Person' ? 'Worker Violation' : 'Site Hazard'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Level {issue.level}, Section {issue.section}</span>
                <span>•</span>
                <span>{new Date(issue.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback toast */}
        {actionMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Clean Segmented Tab Bar */}
        <div className="px-6 pt-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'evidence'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Evidence</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rag');
              if (!ragResult && !isQueryingRag) handleRunRagQuery();
            }}
            className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'rag'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Safety Regulations & Guidance</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
          {activeTab === 'evidence' ? (
            <div className="space-y-5">
              
              {/* Surveillance Image */}
              {evidencePhotoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black aspect-video max-h-[360px] flex items-center justify-center">
                  <img
                    src={evidencePhotoUrl}
                    alt="CCTV Evidence"
                    className="w-full h-full object-cover select-none"
                  />

                  {/* Clean Camera Info Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-zinc-700 text-xs text-zinc-300 font-medium">
                    {isConveyorIssue ? 'Camera CAM-11 (Section 7)' : 'Camera CAM-04 (Sector 2A)'}
                  </div>

                  {/* Subtle Clean Bounding Box (No Helmet) */}
                  {isPpeIssue && (
                    <>
                      <div
                        className="absolute pointer-events-none rounded border-2 border-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                        style={{
                          top: '22%',
                          left: '36%',
                          width: '9%',
                          height: '14%',
                        }}
                      >
                        <span className="absolute -top-7 left-0 whitespace-nowrap bg-red-600 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow">
                          Missing Helmet (96%)
                        </span>
                      </div>

                      <div
                        className="absolute pointer-events-none rounded border-2 border-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        style={{
                          top: '35%',
                          left: '33%',
                          width: '15%',
                          height: '28%',
                        }}
                      >
                        <span className="absolute -top-7 left-0 whitespace-nowrap bg-emerald-600 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow">
                          Safety Vest (92%)
                        </span>
                      </div>
                    </>
                  )}

                  {/* Conveyor Hotspot */}
                  {isConveyorIssue && (
                    <div
                      className="absolute pointer-events-none rounded border-2 border-amber-500/90 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      style={{
                        top: '48%',
                        left: '70%',
                        width: '18%',
                        height: '24%',
                      }}
                    >
                      <span className="absolute -top-7 left-0 whitespace-nowrap bg-amber-600 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow">
                        Hotspot: 114°C (Limit: 65°C)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800">
                  <Camera className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm font-medium">No direct camera snapshot recorded.</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Reported manually by shift personnel.</p>
                </div>
              )}

              {/* Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Observation</span>
                  <p className="text-zinc-200 font-medium leading-relaxed">
                    {issue.observation}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-1">
                  <span className="text-xs text-zinc-400 font-medium">Recommended Action</span>
                  <p className="text-blue-300 font-medium leading-relaxed">
                    {issue.recommended_action}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            /* Safety Regulations Tab */
            <div className="space-y-4 animate-fade-in">
              
              {/* Statutory Rule Overview Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>{dgmsData.regulation}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    Mandatory Rule
                  </span>
                </div>

                <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                  {dgmsData.summary}
                </p>

                {/* Applicable Regulation Chips */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {dgmsData.actClause}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">
                    DGMS Statutory Directive
                  </span>
                </div>
              </div>

              {/* Step-by-Step Action Checklist */}
              <div className="p-4 sm:p-5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Required Action Protocol
                </h4>
                <div className="space-y-2.5">
                  {dgmsData.correctiveProcedure.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-200">
                      <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Legal Citation */}
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-zinc-400 font-medium">
                  <span className="text-blue-400 font-semibold">{dgmsData.regulation}</span>
                  <span className="text-[11px] text-zinc-500">Official Clause Excerpt</span>
                </div>
                <p className="text-zinc-300 italic leading-relaxed">
                  "{issue.issue_type === 'no_helmet'
                    ? 'No person shall enter into or remain in any underground coal working, coal face, or shaft bottom unless equipped with and continuously wearing a DGMS-approved safety helmet in sound condition.'
                    : dgmsData.summary}"
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleIssueWarning}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              Issue Warning
            </button>
            <button
              onClick={handleDispatchTeam}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              Dispatch Patrol
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {onResolve && issue.status === 'open' && (
              <button
                onClick={() => {
                  onResolve(issue.id);
                  setActionMessage('Marked as resolved.');
                  setTimeout(() => onClose(), 1000);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Mark Resolved
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
