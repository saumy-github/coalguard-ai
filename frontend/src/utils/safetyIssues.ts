import { api } from './api';

// PersonIssue carries no recommended-action field of its own (backend/src/
// models/person_issue.py keeps it minimal, unlike SiteIssue) — this is
// presentation-only, derived client-side from issue_type. Mirrors the same
// lookup used in WorkerDashboard.tsx's personal-issue warning.
const PERSON_ISSUE_ACTION: Record<string, string> = {
  no_helmet: 'Direct the worker to put on a helmet immediately.',
  no_vest: 'Direct the worker to put on a high-visibility vest immediately.',
  other: 'Investigate and follow standard safety procedure.',
};

// SiteIssue severity is "NORMAL/WARNING/CRITICAL" (ai_engine's RiskLevel
// vocabulary); PersonIssue severity is "low/medium/high/critical". Normalizing
// both onto one scale is what makes a single severity-first sort/badge
// possible across the two collections.
export function normalizeSeverity(raw: string): 'critical' | 'high' | 'medium' | 'low' {
  const upper = raw.toUpperCase();
  if (upper === 'CRITICAL') return 'critical';
  if (upper === 'WARNING' || upper === 'HIGH') return 'high';
  if (upper === 'MEDIUM') return 'medium';
  return 'low';
}

const SEVERITY_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

interface SiteIssueRecord {
  id: string;
  mine_id: string;
  level: string;
  section: number;
  issue_type: string;
  source: string;
  observation: string;
  severity: string;
  recommended_action: string | null;
  status: string;
  created_at: string;
}

interface PersonIssueRecord {
  id: string;
  mine_id: string;
  level: string;
  section: number;
  issue_type: string;
  source: string;
  observation: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface UnifiedIssue {
  id: string;
  kind: 'Site' | 'Person';
  mine_id: string;
  level: string;
  section: number;
  issue_type: string;
  source: string;
  observation: string;
  severity: string;
  recommended_action: string;
  status: string;
  created_at: string;
}

// Shared by SafetyOverviewPage and SafetyIssuesPage (research/saumy/
// 10-frontend-coding-plan.md Phase 4/5) so both read the exact same merge/sort
// logic — no drift between the two views of the same two collections.
export async function fetchCombinedIssues(): Promise<UnifiedIssue[]> {
  const [site, person] = await Promise.all([
    api.get<SiteIssueRecord[]>('/site-issues'),
    api.get<PersonIssueRecord[]>('/person-issues'),
  ]);

  const combined: UnifiedIssue[] = [
    ...site.data.map((issue) => ({
      id: issue.id,
      kind: 'Site' as const,
      mine_id: issue.mine_id,
      level: issue.level,
      section: issue.section,
      issue_type: issue.issue_type,
      source: issue.source,
      observation: issue.observation,
      severity: issue.severity,
      recommended_action: issue.recommended_action || 'No recommended action recorded.',
      status: issue.status,
      created_at: issue.created_at,
    })),
    ...person.data.map((issue) => ({
      id: issue.id,
      kind: 'Person' as const,
      mine_id: issue.mine_id,
      level: issue.level,
      section: issue.section,
      issue_type: issue.issue_type,
      source: issue.source,
      observation: issue.observation,
      severity: issue.severity,
      recommended_action: PERSON_ISSUE_ACTION[issue.issue_type] ?? PERSON_ISSUE_ACTION.other,
      status: issue.status,
      created_at: issue.created_at,
    })),
  ];

  return combined.sort((a, b) => {
    const rankDiff = SEVERITY_RANK[normalizeSeverity(b.severity)] - SEVERITY_RANK[normalizeSeverity(a.severity)];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
