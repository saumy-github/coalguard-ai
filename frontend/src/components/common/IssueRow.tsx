import React, { useState } from 'react';
import { normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import { StatusBadge } from './StatusBadge';
import { ShieldAlert, HardHat, MapPin, Clock, Camera, Sparkles, ChevronRight, Eye } from 'lucide-react';
import { IssueEvidenceModal } from './IssueEvidenceModal';

interface IssueRowProps {
  issue: UnifiedIssue;
  showMine?: boolean;
  onResolve?: (issueId: string) => void;
}

export const IssueRow = ({ issue, showMine, onResolve }: IssueRowProps) => {
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  const hasPhotoEvidence = Boolean(
    issue.photo_url ||
    issue.issue_type === 'no_helmet' ||
    issue.issue_type === 'no_vest' ||
    issue.issue_type === 'equipment_fault'
  );

  return (
    <>
      <div 
        onClick={() => setIsEvidenceModalOpen(true)}
        className="hover-3d-lift bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-[1.5rem] space-y-4 hover:bg-zinc-800/40 hover:border-white/10 transition-all duration-300 shadow-lg group cursor-pointer relative overflow-hidden"
      >
        {/* Top subtle highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              issue.kind === 'Person' 
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {issue.kind === 'Person' ? (
                <HardHat className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white tracking-tight capitalize group-hover:text-blue-400 transition-colors">
                  {issue.issue_type.replace(/_/g, ' ')}
                </h4>
                {hasPhotoEvidence && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Photo Evidence</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Category: <strong className="text-zinc-300 font-medium">{issue.kind === 'Person' ? 'Worker / PPE Issue' : 'Site Environment Issue'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={normalizeSeverity(issue.severity)} label={issue.severity.toUpperCase()} />
            <StatusBadge status={issue.status === 'open' ? 'action_required' : 'resolved'} label={issue.status.toUpperCase()} />
          </div>
        </div>
        
        <p className="text-sm text-zinc-300 leading-relaxed font-sans">
          {issue.observation}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
          {showMine && <span className="bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-700/50">Mine: {issue.mine_id.slice(-6)}</span>}
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" /> Level {issue.level}, Section {issue.section}</span>
          <span className="flex items-center gap-1.5">Source: <span className="capitalize text-zinc-300 font-medium">{issue.source}</span></span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400" /> {new Date(issue.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2 shadow-inner flex-1">
            <span className="text-blue-400 font-semibold shrink-0">Action:</span>
            <span className="line-clamp-1">{issue.recommended_action}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEvidenceModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white border border-zinc-700/60 transition-all flex items-center gap-2 shrink-0"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Details & Regulations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Evidence and RAG Inspection Modal */}
      <IssueEvidenceModal
        issue={issue}
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        onResolve={onResolve}
      />
    </>
  );
};
