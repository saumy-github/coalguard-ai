import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  const { currentUser, activeSubTab, setActiveSubTab, auditTrail, addToast } = useApp();

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
        icon: <Server className="w-4 h-4 text-emerald-400" />,
        status: "safe",
        statusLabel: "99.99% UPTIME"
      },
      {
        title: "Active Users",
        value: `${usersList.length + 44}`,
        subtext: "Across 24 Mine Locations",
        icon: <Users className="w-4 h-4 text-blue-400" />,
        status: "optimal",
        statusLabel: "ONLINE"
      },
      {
        title: "Data & Storage",
        value: "Healthy",
        subtext: "PostgreSQL & Redis Sync OK",
        icon: <Database className="w-4 h-4 text-purple-400" />,
        status: "safe",
        statusLabel: "SYNCED"
      },
      {
        title: "AI Safety Engine",
        value: "Ready",
        subtext: "Response Latency: 120ms",
        icon: <Cpu className="w-4 h-4 text-[#f6b994]" />,
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
            className="btn-bronze px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        }
      >
        {/* Core Infrastructure Nodes */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Microservice Health Metrics"
            subtitle="Core operational layers running on CoalGuard AI infrastructure."
            action={
              <button
                onClick={() => setActiveSubTab('system_health')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>View Full Health</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Telemetry Ingestion Node', latency: '24ms', load: '14%', status: 'optimal' },
              { name: 'AI Decision Engine', latency: '120ms', load: '32%', status: 'optimal' },
              { name: 'Redis Cache Cluster', latency: '4ms', load: '18%', status: 'optimal' },
              { name: 'Audit Security Node', latency: '45ms', load: '21%', status: 'optimal' }
            ].map((node, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white font-['Sora']">{node.name}</h4>
                  <StatusBadge status={node.status} />
                </div>
                <div className="flex justify-between text-xs font-mono text-[#9e8d85] pt-1">
                  <span>Latency: {node.latency}</span>
                  <span>Load: {node.load}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Logs Snapshot */}
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
          <SectionHeader
            title="Real-Time Audit Stream"
            subtitle="Immutable activity records captured across the system."
            action={
              <button
                onClick={() => setActiveSubTab('activity_logs')}
                className="text-xs font-mono text-[#f6b994] hover:underline flex items-center gap-1 font-bold"
              >
                <span>All Logs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="space-y-2">
            {auditTrail.slice(0, 3).map((a) => (
              <div key={a.blockNumber} className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-white">[{a.action}]</span>
                  <span className="text-[#d6c3b9] ml-2">{a.details}</span>
                  <p className="text-[10px] text-[#9e8d85] mt-0.5">{a.actor} ({a.actorRole}) • {a.timestamp}</p>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Component Health Check"
          subtitle="Real-time status for all system dependencies."
        />

        <div className="space-y-3">
          {[
            { component: 'Primary PostgreSQL Database Cluster', uptime: '99.99%', memory: '1.4 GB / 8.0 GB', status: 'Healthy' },
            { component: 'Redis In-Memory Session Cache', uptime: '100%', memory: '240 MB / 2.0 GB', status: 'Healthy' },
            { component: 'Underground Sensor WebSocket Stream', uptime: '99.95%', memory: '520 MB / 4.0 GB', status: 'Healthy' },
            { component: 'Gemini AI Integration Gateway', uptime: '99.98%', memory: '680 MB / 4.0 GB', status: 'Healthy' }
          ].map((c, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <h4 className="font-bold text-white font-['Sora']">{c.component}</h4>
                <p className="text-[#9e8d85] text-[11px] mt-0.5">Uptime: {c.uptime} • Memory: {c.memory}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Add User Form */}
        <div className="md:col-span-5 glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
          <SectionHeader
            title="Register New User"
            subtitle="Create an authorized operator account."
          />

          <form onSubmit={handleAddUser} className="space-y-3">
            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1 block">Full Name</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1 block">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              >
                <option value="field_worker">Underground Worker</option>
                <option value="safety_officer">Mine Safety Officer</option>
                <option value="corporate_management">Corporate Management</option>
                <option value="regulatory_authority">DGMS Regulatory Inspector</option>
                <option value="system_admin">System Administrator</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1 block">Organization / Unit</label>
              <input
                type="text"
                value={newUserOrg}
                onChange={(e) => setNewUserOrg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-bronze py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </form>
        </div>

        {/* Right: Active Users List */}
        <div className="md:col-span-7 glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
          <SectionHeader
            title="Authorized Operator Directory"
            subtitle="Showing registered system users and assigned roles."
          />

          <div className="space-y-2">
            {usersList.map((u) => (
              <div key={u.id} className="p-3 rounded-xl bg-[#181717] border border-[#353534] flex items-center justify-between text-xs font-mono">
                <div>
                  <h4 className="font-bold text-white font-['Sora']">{u.name}</h4>
                  <p className="text-[11px] text-[#9e8d85]">{u.role} • {u.org} ({u.id})</p>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Data Storage Schema & Status"
          subtitle="PostgreSQL relational tables and live cache status."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {[
            { table: 'sensors_telemetry', records: '2,482,100 rows', sync: 'Live Stream' },
            { table: 'incident_tickets', records: '1,420 rows', sync: 'Real-Time' },
            { table: 'dgms_compliance_audits', records: '384 rows', sync: 'Hourly' },
            { table: 'system_activity_ledger', records: '89,400 blocks', sync: 'Immutable' }
          ].map((t, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#181717] border border-[#353534] space-y-1">
              <h4 className="font-bold text-white">{t.table}</h4>
              <p className="text-[#9e8d85]">{t.records}</p>
              <p className="text-[#f6b994] font-bold text-[10px]">Sync Policy: {t.sync}</p>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-4">
        <SectionHeader
          title="Active Regulatory Model: CoalGuard Safety Copilot"
          subtitle="Model parameters and grounding corpus."
        />

        <div className="space-y-2.5 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex justify-between">
            <span className="text-[#9e8d85]">Grounding Corpus:</span>
            <span className="text-white font-bold">Coal Mines Regulations (CMR 2017) & Mines Act 1952</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex justify-between">
            <span className="text-[#9e8d85]">Embedding Dimension:</span>
            <span className="text-white">768-vector dense semantic index</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex justify-between">
            <span className="text-[#9e8d85]">Average Retrieval Time:</span>
            <span className="text-emerald-400 font-bold">92ms</span>
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
      <div className="glass-card rounded-2xl p-5 border border-[#51443d]/60 space-y-3">
        <SectionHeader
          title="System Audit Trail"
          subtitle="Cryptographically verified event entries."
        />

        <div className="space-y-2">
          {auditTrail.map((b) => (
            <div key={b.blockNumber} className="p-3.5 rounded-xl bg-[#181717] border border-[#353534] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div>
                <span className="text-[#f6b994] font-bold">Block #{b.blockNumber}</span>
                <span className="text-white font-bold ml-2">[{b.action}]</span>
                <p className="text-[#d6c3b9] mt-0.5">{b.details}</p>
                <p className="text-[10px] text-[#9e8d85] mt-0.5">Actor: {b.actor} ({b.actorRole}) • {b.timestamp}</p>
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4 text-xs font-mono">
        <SectionHeader title="Global Thresholds" />

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#181717] border border-[#353534]">
            <div>
              <p className="text-white font-bold">Methane (CH4) Alert Trigger</p>
              <p className="text-[#9e8d85] text-[10px]">Statutory DGMS maximum safe level</p>
            </div>
            <span className="text-[#f6b994] font-bold">1.25% LEL</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#181717] border border-[#353534]">
            <div>
              <p className="text-white font-bold">Air Velocity Minimum</p>
              <p className="text-[#9e8d85] text-[10px]">Minimum intake airway velocity</p>
            </div>
            <span className="text-white font-bold">0.5 m/s</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#181717] border border-[#353534]">
            <div>
              <p className="text-white font-bold">Carbon Monoxide Limit</p>
              <p className="text-[#9e8d85] text-[10px]">Continuous exposure ceiling</p>
            </div>
            <span className="text-white font-bold">50 PPM</span>
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
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[#353534]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#f6b994]/60 flex items-center justify-center text-white text-2xl font-extrabold font-['Sora'] shadow-lg">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Sora']">{currentUser?.name}</h3>
            <p className="text-xs font-mono text-[#f6b994]">{currentUser?.roleTitle}</p>
            <p className="text-[11px] font-mono text-[#9e8d85]">{currentUser?.organization}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Admin Security ID:</span>
            <span className="text-white font-bold">{currentUser?.employeeId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#353534]/50">
            <span className="text-[#9e8d85]">Access Level:</span>
            <span className="text-emerald-400 font-bold">ROOT_SUPER_ADMIN</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );

  switch (activeSubTab) {
    case 'system_health':
      return renderSystemHealth();
    case 'users_roles':
      return renderUsersRoles();
    case 'data_storage':
      return renderDataStorage();
    case 'ai_system':
      return renderAISystem();
    case 'activity_logs':
      return renderActivityLogs();
    case 'settings':
      return renderSettings();
    case 'profile':
      return renderProfile();
    case 'overview':
    default:
      return renderOverview();
  }
};
