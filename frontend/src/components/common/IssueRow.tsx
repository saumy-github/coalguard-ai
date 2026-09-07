import { normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import { StatusBadge } from './StatusBadge';
import { ShieldAlert, HardHat, MapPin, Clock } from 'lucide-react';

interface IssueRowProps {
  issue: UnifiedIssue;
  // Corporate's queue merges multiple mines (Decision #11) so each row needs
  // to say which one; Safety Officer's queue is always exactly one mine
  // (their own), so showing it there would just be noise.
  showMine?: boolean;
}

export const IssueRow = ({ issue, showMine }: IssueRowProps) => (
  <div className="hover-3d-lift bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-[1.5rem] space-y-4 hover:bg-zinc-800/40 transition-all duration-300 shadow-lg group">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl border ${issue.kind === 'Person' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
          {issue.kind === 'Person' ? (
            <HardHat className="w-5 h-5" />
          ) : (
            <ShieldAlert className="w-5 h-5" />
          )}
        </div>
        <h4 className="text-base font-bold text-white tracking-tight">{issue.issue_type.replace(/_/g, ' ')}</h4>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={normalizeSeverity(issue.severity)} label={issue.severity.toUpperCase()} />
        <StatusBadge status={issue.status === 'open' ? 'action_required' : 'resolved'} label={issue.status.toUpperCase()} />
      </div>
    </div>
    
    <p className="text-sm text-zinc-300 leading-relaxed pl-1">{issue.observation}</p>
    
    <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 flex-wrap pl-1">
      {showMine && <span className="bg-black/30 px-2 py-1 rounded-md border border-white/5">Mine: {issue.mine_id.slice(-6)}</span>}
      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> L{issue.level}, S{issue.section}</span>
      <span className="flex items-center gap-1.5">Source: {issue.source}</span>
      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(issue.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
    </div>
    
    <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-xs font-mono text-zinc-400 flex items-start gap-2 shadow-inner">
      <span className="text-blue-400 font-bold uppercase tracking-widest shrink-0">Action:</span>
      <span>{issue.recommended_action}</span>
    </div>
  </div>
);
