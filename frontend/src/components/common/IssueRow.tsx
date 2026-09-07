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
  <div className="glass-panel glass-panel-hover p-6 space-y-3">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        {issue.kind === 'Person' ? (
          <HardHat className="w-4 h-4 text-ember" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-ember" />
        )}
        <h4 className="text-sm font-medium text-obsidian">{issue.issue_type.replace(/_/g, ' ')}</h4>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={normalizeSeverity(issue.severity)} label={issue.severity.toUpperCase()} />
        <StatusBadge status={issue.status === 'open' ? 'action_required' : 'resolved'} label={issue.status.toUpperCase()} />
      </div>
    </div>
    <p className="text-sm text-obsidian/70">{issue.observation}</p>
    <div className="flex items-center gap-4 text-xs text-obsidian/50 flex-wrap">
      {showMine && <span>Mine: {issue.mine_id.slice(-6)}</span>}
      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Level {issue.level}, Section {issue.section}</span>
      <span>Source: {issue.source}</span>
      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(issue.created_at).toLocaleString()}</span>
    </div>
    <div className="p-4 rounded-2xl bg-pumice text-sm text-obsidian/80">
      {issue.recommended_action}
    </div>
  </div>
);
