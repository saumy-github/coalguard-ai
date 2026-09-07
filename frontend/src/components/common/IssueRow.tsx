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
  <div className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-3">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        {issue.kind === 'Person' ? (
          <HardHat className="w-4 h-4 text-orange-400" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        )}
        <h4 className="text-sm font-bold text-white">{issue.issue_type.replace(/_/g, ' ')}</h4>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={normalizeSeverity(issue.severity)} label={issue.severity.toUpperCase()} />
        <StatusBadge status={issue.status === 'open' ? 'action_required' : 'resolved'} label={issue.status.toUpperCase()} />
      </div>
    </div>
    <p className="text-sm text-slate-300">{issue.observation}</p>
    <div className="flex items-center gap-4 text-xs font-mono text-slate-500 flex-wrap">
      {showMine && <span>Mine: {issue.mine_id.slice(-6)}</span>}
      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Level {issue.level}, Section {issue.section}</span>
      <span>Source: {issue.source}</span>
      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(issue.created_at).toLocaleString()}</span>
    </div>
    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs font-mono text-amber-300">
      {issue.recommended_action}
    </div>
  </div>
);
