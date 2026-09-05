import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { displayName, userTypeLabel } from '../../lib/userDisplay';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import {
  Sliders,
  Activity,
  Users,
  Database,
  Cpu,
  ListTree,
  Settings,
  User,
  CheckCircle2,
  Server,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  Lock,
  ChevronRight
} from 'lucide-react';

export const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { activeSubTab, setActiveSubTab, addToast } = useUIStore();
  const { auditTrail } = useDashboardDataStore();

  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('field_worker');
  const [newUserOrg, setNewUserOrg] = useState('ECL (Sector 7G)');

  const [usersList, setUsersList] = useState([
    { id: 'USR-01', name: 'abc_name', role: 'Mine Safety Officer', org: 'ECL', status: 'active' },
    { id: 'USR-02', name: 'Rajesh Soren', role: 'Underground Worker', org: 'BCCL', status: 'active' },
    { id: 'USR-03', name: 'Dr. Amitabh Sen', role: 'Corporate Exec', org: 'CIL HQ', status: 'active' },
    { id: 'USR-04', name: 'Shri Vikramaditya Roy', role: 'DGMS Inspector', org: 'DGMS', status: 'active' }
  ]);

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const newUser = {
      id: `USR-0${usersList.length + 1}`,
      name: newUserName,
      role: newUserRole,
      org: newUserOrg,
      status: 'active'
    };

    setUsersList([...usersList, newUser]);
    setNewUserName('');
    addToast('success', 'User Registered', `${newUserName} added to access control list.`);
  };

  // 1. Dashboard Overview
  const renderOverview = () => {
    const summaryCards = [
      {
        title: "System Status",
        value: "Healthy",
        subtext: "All 12 Microservices Online",
        icon: <Server className="w-5 h-5 text-amber-400" />,
        status: "safe",
        statusLabel: "99.99% UPTIME"
      },
      {
        title: "Active Users",
        value: `${usersList.length + 44}`,
        subtext: "Across 24 Mine Locations",
        icon: <Users className="w-5 h-5 text-blue-400" />,
        status: "optimal",
        statusLabel: "ONLINE"
      },
      {
        title: "Data & Storage",
        value: "Healthy",
        subtext: "PostgreSQL & Redis Sync OK",
        icon: <Database className="w-5 h-5 text-lime-400" />,
        status: "safe",
        statusLabel: "SYNCED"
      },
      {
        title: "AI Safety Engine",
        value: "Ready",
        subtext: "Response Latency: 120ms",
        icon: <Cpu className="w-5 h-5 text-orange-400" />,
        status: "safe",
        statusLabel: "OPTIMAL"
      }
    ];

    return (
      <PageLayout
        title="System Administration & Infrastructure"
        subtitle="Manage cloud microservices, user roles, database synchronization, and security telemetry."
        badge="System Admin"
        summaryCards={summaryCards}
        headerActions={
          <button
            onClick={() => setActiveSubTab('users_roles')}
            className="btn-primary-earth px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        }
      >
        {/* Core Infrastructure Nodes */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-[80px] rounded-full pointer-events-none"></div>

          <SectionHeader
            title="Microservice Health Metrics"
            subtitle="Core operational layers running on CoalGuard AI infrastructure."
            action={
              <button
                onClick={() => setActiveSubTab('system_health')}
                className="text-sm text-amber-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>View Full Health</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
            {[
              { name: 'Telemetry Ingestion Node', latency: '24ms', load: '14%', status: 'optimal' },
              { name: 'AI Decision Engine', latency: '120ms', load: '32%', status: 'optimal' },
              { name: 'Redis Cache Cluster', latency: '4ms', load: '18%', status: 'optimal' },
              { name: 'Audit Security Node', latency: '45ms', load: '21%', status: 'optimal' }
            ].map((node, idx) => (
              <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-3 group">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-wide">{node.name}</h4>
                  <StatusBadge status={node.status} />
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
                  <span>Latency: <span className="text-white">{node.latency}</span></span>
                  <span>Load: <span className="text-white">{node.load}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Logs Snapshot */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-6">
          <SectionHeader
            title="Real-Time Audit Stream"
            subtitle="Immutable activity records captured across the system."
            action={
              <button
                onClick={() => setActiveSubTab('activity_logs')}
                className="text-sm text-orange-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>All Logs</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            }
          />

          <div className="space-y-3">
            {auditTrail.slice(0, 3).map((a) => (
              <div key={a.blockNumber} className="glass-panel glass-panel-hover p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm font-mono group">
                <div>
                  <span className="font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded">[{a.action}]</span>
                  <span className="text-slate-300 ml-3">{a.details}</span>
                  <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">{a.actor} ({a.actorRole}) • {a.timestamp}</p>
                </div>
                <StatusBadge status="verified_closed" label="VERIFIED" />
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  };

  // 2. System Health
  const renderSystemHealth = () => (
    <PageLayout
      title="System Health & Diagnostic Telemetry"
      subtitle="Detailed server status, database connections, and memory allocation."
      badge="Diagnostics"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Component Health Check"
          subtitle="Real-time status for all system dependencies."
        />

        <div className="space-y-4">
          {[
            { component: 'Primary PostgreSQL Database Cluster', uptime: '99.99%', memory: '1.4 GB / 8.0 GB', status: 'Healthy' },
            { component: 'Redis In-Memory Session Cache', uptime: '100%', memory: '240 MB / 2.0 GB', status: 'Healthy' },
            { component: 'Underground Sensor WebSocket Stream', uptime: '99.95%', memory: '520 MB / 4.0 GB', status: 'Healthy' },
            { component: 'Gemini AI Integration Gateway', uptime: '99.98%', memory: '680 MB / 4.0 GB', status: 'Healthy' }
          ].map((c, idx) => (
            <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-mono group">
              <div>
                <h4 className="font-bold text-white text-base tracking-wide group-hover:text-orange-400 transition-colors">{c.component}</h4>
                <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Uptime: <span className="text-amber-400">{c.uptime}</span> • Memory: <span className="text-white">{c.memory}</span></p>
              </div>
              <StatusBadge status="safe" label={c.status.toUpperCase()} />
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 3. Users & Roles
  const renderUsersRoles = () => (
    <PageLayout
      title="Users & Role-Based Access Control (RBAC)"
      subtitle="Manage operator accounts, assign permission tiers, and enforce authentication policies."
      badge="User Management"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">

        {/* Left: Add User Form */}
        <div className="md:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border-orange-500/20 space-y-6 relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-orange-500/10 blur-[60px] pointer-events-none"></div>

          <SectionHeader
            title="Register New User"
            subtitle="Create an authorized operator account."
          />

          <form onSubmit={handleAddUser} className="space-y-5 relative z-10">
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
              >
                <option value="field_worker">Underground Worker</option>
                <option value="safety_officer">Mine Safety Officer</option>
                <option value="corporate_management">Corporate Management</option>
                <option value="regulatory_authority">DGMS Regulatory Inspector</option>
                <option value="system_admin">System Administrator</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Organization / Unit</label>
              <input
                type="text"
                value={newUserOrg}
                onChange={(e) => setNewUserOrg(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary-earth py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </form>
        </div>

        {/* Right: Active Users List */}
        <div className="md:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <SectionHeader
            title="Authorized Operator Directory"
            subtitle="Showing registered system users and assigned roles."
          />

          <div className="space-y-3">
            {usersList.map((u) => (
              <div key={u.id} className="glass-panel glass-panel-hover p-4 rounded-2xl flex items-center justify-between text-sm font-mono group">
                <div>
                  <h4 className="font-bold text-white tracking-wide text-base">{u.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{u.role} • {u.org} <span className="text-orange-400">({u.id})</span></p>
                </div>
                <StatusBadge status="safe" label="ACTIVE" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );

  // 4. Data & Storage
  const renderDataStorage = () => (
    <PageLayout
      title="Database & Data Storage Management"
      subtitle="Verify table integrity, backup schedules, and cache invalidation."
      badge="Storage"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="Data Storage Schema & Status"
          subtitle="PostgreSQL relational tables and live cache status."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm font-mono">
          {[
            { table: 'sensors_telemetry', records: '2,482,100 rows', sync: 'Live Stream' },
            { table: 'incident_tickets', records: '1,420 rows', sync: 'Real-Time' },
            { table: 'dgms_compliance_audits', records: '384 rows', sync: 'Hourly' },
            { table: 'system_activity_ledger', records: '89,400 blocks', sync: 'Immutable' }
          ].map((t, idx) => (
            <div key={idx} className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-2 group">
              <h4 className="font-bold text-white text-base tracking-wide">{t.table}</h4>
              <p className="text-slate-400">{t.records}</p>
              <p className="text-orange-400 font-bold text-xs uppercase tracking-widest pt-2 border-t border-white/10 mt-2 inline-block group-hover:border-orange-500/30 transition-colors">Sync Policy: {t.sync}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 5. AI System
  const renderAISystem = () => (
    <PageLayout
      title="AI Model & Knowledge Base Configuration"
      subtitle="Manage retrieval sources, regulation embeddings, and query latency."
      badge="AI System"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 blur-[80px] pointer-events-none"></div>

        <SectionHeader
          title="Active Regulatory Model: CoalGuard Safety Copilot"
          subtitle="Model parameters and grounding corpus."
        />

        <div className="space-y-3 text-sm font-mono relative z-10">
          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
            <span className="text-slate-400 uppercase tracking-widest text-xs">Grounding Corpus</span>
            <span className="text-white font-bold bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">Coal Mines Regulations (CMR 2017) & Mines Act 1952</span>
          </div>
          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
            <span className="text-slate-400 uppercase tracking-widest text-xs">Embedding Dimension</span>
            <span className="text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">768-vector dense semantic index</span>
          </div>
          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
            <span className="text-slate-400 uppercase tracking-widest text-xs">Average Retrieval Time</span>
            <span className="text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">92ms</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  // 6. Activity Logs
  const renderActivityLogs = () => (
    <PageLayout
      title="System Activity & Security Logs"
      subtitle="Complete chronological audit records of all user actions and system events."
      badge="Activity Logs"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 mt-4">
        <SectionHeader
          title="System Audit Trail"
          subtitle="Cryptographically verified event entries."
        />

        <div className="space-y-4">
          {auditTrail.map((b) => (
            <div key={b.blockNumber} className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm font-mono group">
              <div>
                <span className="text-lime-400 font-bold bg-lime-500/10 px-2 py-1 rounded border border-lime-500/20 uppercase tracking-wider text-xs mr-3">Block #{b.blockNumber}</span>
                <span className="text-white font-bold tracking-wide">[{b.action}]</span>
                <p className="text-slate-300 mt-2 bg-black/20 p-3 rounded-xl border border-white/5">{b.details}</p>
                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Actor: <span className="text-slate-300">{b.actor}</span> ({b.actorRole}) • {b.timestamp}</p>
              </div>
              <StatusBadge status="verified_closed" label="VERIFIED" />
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );

  // 7. Settings
  const renderSettings = () => (
    <PageLayout
      title="Platform Settings & Configurations"
      subtitle="Global system parameters, alert thresholds, and security rules."
      badge="Settings"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-3xl mx-auto space-y-6 mt-4 text-sm font-mono">
        <SectionHeader title="Global Thresholds" />

        <div className="space-y-4">
          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between group">
            <div>
              <p className="text-white font-bold text-base">Methane (CH4) Alert Trigger</p>
              <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Statutory DGMS maximum safe level</p>
            </div>
            <span className="text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">1.25% LEL</span>
          </div>

          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between group">
            <div>
              <p className="text-white font-bold text-base">Air Velocity Minimum</p>
              <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Minimum intake airway velocity</p>
            </div>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">0.5 m/s</span>
          </div>

          <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex items-center justify-between group">
            <div>
              <p className="text-white font-bold text-base">Carbon Monoxide Limit</p>
              <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Continuous exposure ceiling</p>
            </div>
            <span className="text-rose-400 font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">50 PPM</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  // 8. Profile
  const renderProfile = () => (
    <PageLayout
      title="System Administrator Profile"
      subtitle="Master root credentials and security privileges."
      badge="Root Admin"
    >
      <div className="glass-panel rounded-3xl p-8 max-w-2xl mx-auto space-y-6 mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
          <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            {displayName(user).charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
            <p className="text-sm font-mono text-purple-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.user_type)}</p>
            <p className="text-xs text-slate-400 mt-1">{user?.organization}</p>
          </div>
        </div>

        <div className="space-y-4 text-sm font-mono text-slate-300 relative z-10">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Admin Security ID</span>
            <span className="text-white font-bold bg-white/5 px-2 py-1 rounded">{user?.employeeId}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-slate-500 uppercase text-xs tracking-wider">Access Level</span>
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">ROOT_SUPER_ADMIN</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'system_health': return renderSystemHealth();
    case 'users_roles': return renderUsersRoles();
    case 'data_storage': return renderDataStorage();
    case 'ai_system': return renderAISystem();
    case 'activity_logs': return renderActivityLogs();
    case 'settings': return renderSettings();
    case 'profile': return renderProfile();
    case 'overview':
    default: return renderOverview();
  }
};
