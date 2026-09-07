import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { fetchCombinedIssues, normalizeSeverity, type UnifiedIssue } from '../../utils/safetyIssues';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { IssueRow } from '../common/IssueRow';
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  HardHat,
  ChevronRight,
  Users,
  CheckCircle2,
  MapPin,
  Clock
} from 'lucide-react';
import { api } from '../../utils/api';


function useCombinedIssues() {
  const [issues, setIssues] = useState<UnifiedIssue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIssues(await fetchCombinedIssues());
      } catch {
        // Non-critical — page just shows nothing if this fails.
      }
    };
    load();
  }, []);

  return issues;
}

// 1. Dashboard Overview — /dashboard/safety
export const SafetyOverviewPage = () => {
  const issues = useCombinedIssues();
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const { data } = await api.get<any[]>('/attendance/today');
        if (Array.isArray(data)) {
          setTodayAttendance(data);
        }
      } catch {
        // Non-critical
      }
    };
    loadAttendance();
  }, []);

  const openIssues = issues.filter((issue) => issue.status === 'open');
  const openSiteCount = openIssues.filter((issue) => issue.kind === 'Site').length;
  const openPersonCount = openIssues.filter((issue) => issue.kind === 'Person').length;
  const hasSevereOpenIssue = openIssues.some((issue) => normalizeSeverity(issue.severity) !== 'low' && normalizeSeverity(issue.severity) !== 'medium');
  const recentOpen = openIssues.slice(0, 3);

  const summaryCards = [
    {
      title: 'Open Site Issues',
      value: `${openSiteCount}`,
      subtext: 'Gas, ventilation, equipment',
      icon: <ShieldAlert className="w-5 h-5" />,
      status: openSiteCount > 0 ? 'warning' : 'safe',
      statusLabel: openSiteCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Open Worker/PPE Issues',
      value: `${openPersonCount}`,
      subtext: 'Helmet, vest, unsafe practice',
      icon: <HardHat className="w-5 h-5" />,
      status: openPersonCount > 0 ? 'warning' : 'safe',
      statusLabel: openPersonCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Workers On-Site Today',
      value: `${todayAttendance.length}`,
      subtext: 'Biometric & geofence verified',
      icon: <Users className="w-5 h-5" />,
      status: 'safe',
      statusLabel: 'VERIFIED',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="Mine Safety Dashboard"
        subtitle="Real-time site and worker safety issues across your assigned mine."
        badge="Safety Command"
        summaryCards={summaryCards}
        headerActions={
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/attendance/kiosk"
              className="btn-glass px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-300"
            >
              <Users className="w-4 h-4" />
              <span>Attendance Kiosk</span>
            </Link>
            <Link
              to="/dashboard/safety/issues"
              className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>View Safety Issues</span>
            </Link>
          </div>
        }
        attentionAlert={
          hasSevereOpenIssue ? (
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-rose-100 tracking-tight">High/critical severity issue open</h4>
                <p className="text-sm text-rose-200/80 mt-1.5 leading-relaxed">
                  At least one open issue needs immediate attention — see the Safety Issues queue for details.
                </p>
              </div>
            </div>
          ) : undefined
        }
      >
        {/* Recent Unresolved Issues */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mb-8">
          <SectionHeader
            title="Recent Unresolved Issues"
            subtitle="Most severe and most recent open items."
            action={
              <Link
                to="/dashboard/safety/issues"
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View Full Queue</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            }
          />
          <div className="space-y-4">
            {recentOpen.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No open issues right now.</p>
            )}
            {recentOpen.map((issue) => (
              <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
            ))}
          </div>
        </div>

        {/* Live On-Site Attendance Panel */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="On-Site Shift Attendance"
            subtitle="Workers physically verified on-site via facial recognition and GPS geofence."
          />
          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No workers have clocked in on-site yet today.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {todayAttendance.map((record) => (
                <div key={record.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-xs uppercase">
                      {record.worker_name?.slice(0, 2) || 'WK'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{record.worker_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          ID: {record.worker_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>{record.mine_name || 'ECL Sector 7G'}</span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-green-400 bg-green-950/60 border border-green-700/60 px-2 py-1 rounded-lg">
                      {record.distance_from_site_m ?? 0}m (Geofence OK)
                    </span>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};


// 2. Safety Issues — /dashboard/safety/issues — full combined queue
export const SafetyIssuesPage = () => {
  const issues = useCombinedIssues();

  return (
    <DashboardLayout>
      <PageLayout
        title="Safety Issues Queue"
        subtitle="All site and worker/PPE safety issues at your mine, most severe and most recent first."
        badge="Issue Command"
      >
        <div className="space-y-4 mt-4">
          {issues.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 text-center text-sm text-slate-400">
              No safety issues reported yet.
            </div>
          )}
          {issues.map((issue) => (
            <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
          ))}
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/safety/profile — read-only, sourced only from
// GET /auth/me's real fields (research/saumy/09-changes-5-sep.md Decision #10,
// same treatment as Worker).
export const SafetyProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Safety Officer Profile"
        subtitle="Your account identity, as recorded by the system."
        badge="Officer Record"
      >
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-linear-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-emerald-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Email</span>
              <span className="text-white">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-white">{user?.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-slate-500 uppercase text-xs tracking-wider">Assigned Mine</span>
              <span className="text-white">{user?.mine ? 'Assigned' : 'None assigned'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
