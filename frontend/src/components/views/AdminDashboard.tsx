import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api } from '../../utils/api';
import { ROLES, type UserType } from '../../utils/userTypes';
import { fetchMines, type Mine } from '../../utils/regulatoryReports';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Dropdown } from '../common/Dropdown';
import { UserPlus, MapPin } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserType;
  full_name: string | null;
  is_guest: boolean;
  active: boolean;
  mine_ids: string[];
}

interface MineAssignment {
  id: string;
  user_id: string;
  mine_id: string;
  role: string;
  active: boolean;
}

// Only these roles are mine-scoped via a real MineAssignment (Decision #12) —
// Regulator's scope is derived (Phase 7), Admin's is global.
const MINE_SCOPED_ROLES: UserType[] = ['worker', 'safety_officer', 'corporate_manager'];

function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  const reload = async () => {
    try {
      const { data } = await api.get<AdminUser[]>('/users');
      setUsers(data);
    } catch {
      // Non-critical — pages just show empty state if this fails.
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { users, reload };
}

function useAdminMines() {
  const [mines, setMines] = useState<Mine[]>([]);

  const reload = async () => {
    try {
      setMines(await fetchMines());
    } catch {
      // Non-critical — pages just show empty state if this fails.
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { mines, reload };
}

// 1. Users — /dashboard/admin/users — real directory + provisioning form.
export const AdminUsersPage = () => {
  const { users, reload: reloadUsers } = useAdminUsers();
  const { mines } = useAdminMines();

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserType>('worker');
  const [newUserMineId, setNewUserMineId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isMineScoped = MINE_SCOPED_ROLES.includes(newUserRole);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
    if (isMineScoped && !newUserMineId) {
      setError('Select a mine for this role.');
      return;
    }

    try {
      await api.post('/users', {
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        mine_id: isMineScoped ? newUserMineId : undefined,
      });
      await reloadUsers();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Could not create the user.');
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Users & Provisioning"
        subtitle="Create accounts through the same delegated hierarchy every role uses — Admin may create any role."
        badge="User Management"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader title="Register New User" subtitle="Create an authorized operator account." />

            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Role</label>
                <Dropdown
                  value={newUserRole}
                  onChange={(v) => setNewUserRole(v as UserType)}
                  options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                />
              </div>

              {isMineScoped && (
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Mine</label>
                  <Dropdown
                    value={newUserMineId}
                    onChange={setNewUserMineId}
                    options={mines.map((mine) => ({ value: mine.id, label: mine.name }))}
                    placeholder="Select a mine..."
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                type="submit"
                className="w-full btn-primary-earth py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader title="Authorized Operator Directory" subtitle="Every registered user and their mine assignments." />
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="glass-panel glass-panel-hover p-4 rounded-2xl flex items-center justify-between text-sm font-mono">
                  <div>
                    <h4 className="font-bold text-white tracking-wide text-base">{u.full_name || u.email || u.phone || 'Unnamed'}</h4>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                      {userTypeLabel(u.role)} • {u.email || u.phone || 'no contact'} • {u.mine_ids.length} mine(s)
                    </p>
                  </div>
                  <StatusBadge status={u.active ? 'safe' : 'critical'} label={u.active ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Mines — /dashboard/admin/mines — mine registry.
export const AdminMinesPage = () => {
  const { mines, reload } = useAdminMines();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/mines', {
      name,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });
    setName('');
    setLat('');
    setLng('');
    await reload();
  };

  return (
    <DashboardLayout>
      <PageLayout title="Mine Registry" subtitle="Every mine known to the platform." badge="Mine Registry">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader title="Register New Mine" />
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Mine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
              <button type="submit" className="w-full btn-primary-earth py-3.5 rounded-xl text-sm font-bold">
                Register Mine
              </button>
            </form>
          </div>

          <div className="md:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <SectionHeader title="All Mines" />
            {mines.map((mine) => (
              <div key={mine.id} className="glass-panel glass-panel-hover p-4 rounded-2xl flex items-center justify-between text-sm font-mono">
                <span className="font-bold text-white">{mine.name}</span>
                {mine.lat !== null && mine.lng !== null && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {mine.lat.toFixed(4)}, {mine.lng.toFixed(4)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Access — /dashboard/admin/access — role changes + mine assignment management.
export const AdminAccessPage = () => {
  const { users, reload: reloadUsers } = useAdminUsers();
  const { mines } = useAdminMines();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleDraft, setRoleDraft] = useState<UserType>('worker');
  const [assignMineId, setAssignMineId] = useState('');
  const [assignments, setAssignments] = useState<MineAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const loadAssignments = async (userId: string) => {
    if (!userId) {
      setAssignments([]);
      return;
    }
    const { data } = await api.get<MineAssignment[]>('/mine-assignments', { params: { user_id: userId } });
    setAssignments(data);
  };

  const selectUser = async (userId: string) => {
    setSelectedUserId(userId);
    setError(null);
    const user = users.find((u) => u.id === userId);
    if (user) setRoleDraft(user.role);
    await loadAssignments(userId);
  };

  const handleChangeRole = async () => {
    if (!selectedUserId) return;
    setError(null);
    try {
      await api.patch(`/users/${selectedUserId}/role`, { role: roleDraft });
      await reloadUsers();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Could not change role.');
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId || !assignMineId) return;
    await api.post('/mine-assignments', { user_id: selectedUserId, mine_id: assignMineId });
    setAssignMineId('');
    await Promise.all([loadAssignments(selectedUserId), reloadUsers()]);
  };

  const handleRevoke = async (assignmentId: string) => {
    await api.delete(`/mine-assignments/${assignmentId}`);
    await Promise.all([loadAssignments(selectedUserId), reloadUsers()]);
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Access Management"
        subtitle="Change a user's role, or grant/revoke their mine assignments directly."
        badge="Access"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <SectionHeader title="Select a User" />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={`w-full text-left p-3 rounded-xl text-sm font-mono transition-colors ${
                    selectedUserId === u.id ? 'bg-orange-500/20 border border-orange-500/40 text-white' : 'bg-black/20 border border-white/5 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {u.full_name || u.email || u.phone} — <span className="text-slate-500">{userTypeLabel(u.role)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            {!selectedUser ? (
              <p className="text-sm text-slate-400">Select a user to manage their role and mine assignments.</p>
            ) : (
              <>
                <SectionHeader title={selectedUser.full_name || selectedUser.email || 'User'} subtitle="Role and mine assignments" />

                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Role</label>
                  <div className="flex items-center gap-3">
                    <Dropdown
                      value={roleDraft}
                      onChange={(v) => setRoleDraft(v as UserType)}
                      options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                      className="flex-1"
                    />
                    <button onClick={handleChangeRole} className="btn-primary-earth px-5 py-3 rounded-xl text-sm font-bold shrink-0">
                      Update
                    </button>
                  </div>
                  {error && <p className="text-sm text-rose-400">{error}</p>}
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">Mine Assignments</label>
                  {assignments.length === 0 && <p className="text-sm text-slate-500">No active mine assignments.</p>}
                  {assignments.map((a) => {
                    const mine = mines.find((m) => m.id === a.mine_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 text-sm font-mono">
                        <span className="text-slate-300">{mine?.name ?? a.mine_id}</span>
                        <button onClick={() => handleRevoke(a.id)} className="text-xs text-rose-400 hover:text-rose-300 font-bold">
                          Revoke
                        </button>
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-3 pt-2">
                    <Dropdown
                      value={assignMineId}
                      onChange={setAssignMineId}
                      options={mines.map((mine) => ({ value: mine.id, label: mine.name }))}
                      placeholder="Select a mine to assign..."
                      className="flex-1"
                    />
                    <button onClick={handleAddAssignment} className="btn-primary-earth px-5 py-3 rounded-xl text-sm font-bold shrink-0">
                      Assign
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 4. Profile — /dashboard/admin/profile — read-only, sourced only from
// GET /auth/me's real fields, same treatment as every other role.
export const AdminProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout title="Admin Profile" subtitle="Your account identity, as recorded by the system." badge="Root Admin">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-white/10 relative z-10">
            <div className="w-20 h-20 rounded-[1.25rem] bg-linear-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-3xl font-extrabold shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-purple-400 mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
              {user?.is_guest && <p className="text-xs text-slate-400 mt-1">Guest session</p>}
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
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
