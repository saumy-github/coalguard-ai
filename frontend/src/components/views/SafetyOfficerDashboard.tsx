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
  Clock,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { api } from '../../utils/api';
import { DgmsRagAssistant } from '../common/DgmsRagAssistant';


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
      icon: <ShieldAlert className="w-6 h-6" />,
      status: openSiteCount > 0 ? 'warning' : 'safe',
      statusLabel: openSiteCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Open Worker/PPE Issues',
      value: `${openPersonCount}`,
      subtext: 'Helmet, vest, unsafe practice',
      icon: <HardHat className="w-6 h-6" />,
      status: openPersonCount > 0 ? 'warning' : 'safe',
      statusLabel: openPersonCount > 0 ? 'ATTENTION' : 'CLEAR',
    },
    {
      title: 'Workers On-Site Today',
      value: `${todayAttendance.length}`,
      subtext: 'Biometric & geofence verified',
      icon: <Users className="w-6 h-6" />,
      status: 'safe',
      statusLabel: 'VERIFIED',
    },
  ];

  return (
    <DashboardLayout>
      <PageLayout
        title="Safety Command Center"
        subtitle="Real-time site and worker safety anomalies across your assigned mine."
        badge="Live Feed"
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
              className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Manage All Issues</span>
            </Link>
          </div>
        }
        attentionAlert={
          hasSevereOpenIssue ? (
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 shrink-0 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-100 tracking-tight">Critical severity anomaly detected</h4>
                <p className="text-sm text-red-200/80 mt-1.5 leading-relaxed font-mono">
                  Immediate action required. Review the Safety Issues queue for location and recommended mitigation.
                </p>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Recent Unresolved Issues */}
          <div className="lg:col-span-7 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6">
            <SectionHeader
              title="Recent Priority Issues"
              subtitle="Most severe and most recent open items demanding attention."
              action={
                <Link
                  to="/dashboard/safety/issues"
                  className="text-sm text-blue-400 hover:text-white font-bold flex items-center gap-1.5 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg"
                >
                  <span>View Queue</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <div className="space-y-4">
              {recentOpen.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                  <ShieldAlert className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-sm font-medium tracking-wide">No active safety alerts.</p>
                </div>
              )}
              {recentOpen.map((issue) => (
                <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
              ))}
            </div>
          </div>

          {/* Live On-Site Attendance Panel */}
          <div className="lg:col-span-5 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col h-full">
            <SectionHeader
              title="Active Workforce Roster"
              subtitle="Real-time biometric and GPS geofence verification."
            />
            
            <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-4 overflow-hidden flex flex-col">
              {todayAttendance.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm py-12">
                  <Users className="w-10 h-10 mx-auto opacity-30 mb-3" />
                  <p>No workers have clocked in on-site yet today.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {todayAttendance.map((record) => (
                    <div key={record.id} className="p-3.5 bg-zinc-900/80 rounded-xl border border-white/5 flex items-center justify-between gap-4 group hover:bg-zinc-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shadow-inner">
                          {record.worker_name?.slice(0, 2) || 'WK'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{record.worker_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-zinc-400">
                              ID: {record.worker_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{record.mine_name || 'ECL Sector'}</span>
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {record.distance_from_site_m ?? 0}m GPS
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
        title="Safety Anomalies Queue"
        subtitle="Comprehensive log of all site and worker/PPE issues at your mine, prioritized by severity."
        badge="Issue Command"
      >
        <div className="space-y-8">
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 min-h-[400px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Active Incident & Hazard Stream</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">Click any issue to inspect CCTV camera evidence, AI bounding boxes & DGMS statutory audit.</p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-white/5">
                {issues.length} Issues Tracked
              </span>
            </div>

            <div className="space-y-4">
              {issues.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-white/5 border-dashed rounded-2xl bg-black/20">
                  <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No safety issues reported.</p>
                  <p className="text-sm mt-1 font-mono">Your mine is currently operating safely.</p>
                </div>
              )}
              {issues.map((issue) => (
                <IssueRow key={`${issue.kind}-${issue.id}`} issue={issue} />
              ))}
            </div>
          </div>

          {/* Integrated DGMS Statutory Compliance Assistant */}
          <DgmsRagAssistant />
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// Dedicated DGMS Statutory Regulations Page — /dashboard/safety/regulations
export const SafetyRegulationsPage = () => {
  return (
    <DashboardLayout>
      <PageLayout
        title="DGMS Statutory Regulations & Legal Knowledge"
        subtitle="Real-time statutory compliance audit against Coal Mines Regulations 2017 (CMR) and DGMS Technical Circulars."
        badge="DGMS RAG Assistant"
      >
        <DgmsRagAssistant />
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/safety/profile
export const SafetyProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout
        title="Officer Identity Record"
        subtitle="Your secure cryptographic profile and metadata."
        badge="Officer Record"
      >
        <div className="max-w-2xl mx-auto mt-8">
           <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
             
             {/* Banner */}
             <div className="h-32 bg-gradient-to-br from-blue-900/40 to-black border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="absolute bottom-[-50%] right-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
             </div>

             <div className="px-8 sm:px-12 pb-12">
                <div className="flex flex-col items-center -mt-16 mb-8 relative z-10">
                  <div className="w-32 h-32 rounded-2xl bg-zinc-900 border-4 border-[#121214] flex items-center justify-center text-zinc-100 text-5xl font-extrabold shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none"></div>
                    <span className="relative z-10 group-hover:scale-110 transition-transform duration-500">{displayName(user).charAt(0).toUpperCase()}</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight mt-5">{displayName(user)}</h3>
                  <div className="px-3 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 text-xs font-mono font-bold text-blue-400 uppercase tracking-widest mt-3">
                    {userTypeLabel(user?.role)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.email || '—'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Phone</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.phone || '—'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assigned Mine</span>
                    <span className="text-sm font-mono text-zinc-200">{user?.mine ? 'Assigned' : 'None assigned'}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clearance Status</span>
                    <span className="text-sm font-mono text-blue-400 font-bold">ACTIVE COMMAND</span>
                  </div>
                </div>

             </div>
           </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
