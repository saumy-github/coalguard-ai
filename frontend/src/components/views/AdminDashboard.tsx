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
  active: boolean;
  mine: string | null;
  mines: string[];
}

const SINGLE_MINE_ROLES: UserType[] = ['worker', 'safety_officer'];
const MULTI_MINE_ROLES: UserType[] = ['corporate_manager', 'regulator'];

function mineSummary(u: AdminUser, mines: Mine[]): string {
  if (SINGLE_MINE_ROLES.includes(u.role)) {
    const mine = mines.find((m) => m.id === u.mine);
    return u.mine ? mine?.name ?? 'Assigned' : 'No mine assigned';
  }
  if (MULTI_MINE_ROLES.includes(u.role)) {
    return `${u.mines.length} mine(s)`;
  }
  return '—';
}

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

// Users — /dashboard/admin/users — directory, provisioning, role changes,
// and mine assignment. New accounts start mine-less; assign a mine after.
export const AdminUsersPage = () => {
  const { users, reload: reloadUsers } = useAdminUsers();
  const { mines } = useAdminMines();

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserType>('worker');
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleDraft, setRoleDraft] = useState<UserType>('worker');
  const [mineDraft, setMineDraft] = useState('');
  const [minesDraft, setMinesDraft] = useState<string[]>([]);
  const [manageError, setManageError] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;

    try {
      await api.post('/users', {
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      await reloadUsers();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(detail || 'Could not create the user.');
    }
  };

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    setManageError(null);
    const user = users.find((u) => u.id === userId);
    if (user) {
      setRoleDraft(user.role);
      setMineDraft(user.mine ?? '');
      setMinesDraft(user.mines);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUserId) return;
    setManageError(null);
    try {
      await api.patch(`/users/${selectedUserId}/role`, { role: roleDraft });
      await reloadUsers();
      // Backend resets the profile on role change — mirror that locally.
      setMineDraft('');
      setMinesDraft([]);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setManageError(detail || 'Could not change role.');
    }
  };

  const handleSaveMine = async () => {
    if (!selectedUserId) return;
    setManageError(null);
    try {
      await api.patch(`/users/${selectedUserId}/mine`, { mine_id: mineDraft || null });
      await reloadUsers();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setManageError(detail || 'Could not update mine.');
    }
  };

  const toggleMine = (mineId: string) => {
    setMinesDraft((current) =>
      current.includes(mineId) ? current.filter((id) => id !== mineId) : [...current, mineId]
    );
  };

  const handleSaveMines = async () => {
    if (!selectedUserId) return;
    setManageError(null);
    try {
      await api.patch(`/users/${selectedUserId}/mines`, { mine_ids: minesDraft });
      await reloadUsers();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setManageError(detail || 'Could not update mines.');
    }
  };

  return (
    <DashboardLayout>
      <PageLayout
        title="Users & Provisioning"
        subtitle="Create accounts through the same delegated hierarchy every role uses — Admin may create any role. New accounts start mine-less; assign a mine below afterward."
        badge="User Management"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          <div className="md:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <SectionHeader title="Register New User" subtitle="Create an authorized operator account." />

            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Role</label>
                <Dropdown
                  value={newUserRole}
                  onChange={(v) => setNewUserRole(v as UserType)}
                  options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                />
              </div>

              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
                />
              </div>

              {createError && <p className="text-sm text-ember">{createError}</p>}

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
            <SectionHeader title="Authorized Operator Directory" subtitle="Click a user to manage their role and mine(s)." />
            <div className="space-y-3">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={`w-full text-left glass-panel glass-panel-hover p-4 rounded-2xl flex items-center justify-between text-sm font-mono transition-colors ${
                    selectedUserId === u.id ? 'border border-ember/40' : ''
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-obsidian tracking-wide text-base">{u.full_name || u.email || u.phone || 'Unnamed'}</h4>
                    <p className="text-xs text-obsidian/60 mt-1 uppercase tracking-widest">
                      {userTypeLabel(u.role)} • {u.email || u.phone || 'no contact'} • {mineSummary(u, mines)}
                    </p>
                  </div>
                  <StatusBadge status={u.active ? 'safe' : 'critical'} label={u.active ? 'ACTIVE' : 'INACTIVE'} />
                </button>
              ))}
            </div>
          </div>

          {selectedUser && (
            <div className="md:col-span-12 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
              <SectionHeader
                title={`Manage ${selectedUser.full_name || selectedUser.email || 'User'}`}
                subtitle="Role and mine scope for this account."
              />

              <div className="space-y-3">
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest block">Role</label>
                <div className="flex items-center gap-3">
                  <Dropdown
                    value={roleDraft}
                    onChange={(v) => setRoleDraft(v as UserType)}
                    options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                    className="flex-1"
                  />
                  <button onClick={handleChangeRole} className="btn-primary-earth px-5 py-3 rounded-xl text-sm font-bold shrink-0">
                    Update Role
                  </button>
                </div>
              </div>

              {SINGLE_MINE_ROLES.includes(selectedUser.role) && (
                <div className="space-y-3 pt-4 border-t border-obsidian/10">
                  <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest block">Mine</label>
                  <div className="flex items-center gap-3">
                    <Dropdown
                      value={mineDraft}
                      onChange={setMineDraft}
                      options={mines.map((mine) => ({ value: mine.id, label: mine.name }))}
                      placeholder="No mine assigned"
                      className="flex-1"
                    />
                    <button onClick={handleSaveMine} className="btn-primary-earth px-5 py-3 rounded-xl text-sm font-bold shrink-0">
                      Save
                    </button>
                  </div>
                </div>
              )}

              {MULTI_MINE_ROLES.includes(selectedUser.role) && (
                <div className="space-y-3 pt-4 border-t border-obsidian/10">
                  <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest block">Mines</label>
                  <div className="space-y-2">
                    {mines.map((mine) => (
                      <label key={mine.id} className="flex items-center gap-3 text-sm text-obsidian/70 font-mono">
                        <input
                          type="checkbox"
                          checked={minesDraft.includes(mine.id)}
                          onChange={() => toggleMine(mine.id)}
                          className="accent-orange-500"
                        />
                        {mine.name}
                      </label>
                    ))}
                  </div>
                  <button onClick={handleSaveMines} className="btn-primary-earth px-5 py-3 rounded-xl text-sm font-bold">
                    Save Mines
                  </button>
                </div>
              )}

              {manageError && <p className="text-sm text-ember">{manageError}</p>}
            </div>
          )}
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
                <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Mine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-obsidian/60 uppercase tracking-widest mb-2 block">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-pumice border border-obsidian/10 text-obsidian text-sm font-mono focus:outline-none focus:border-ember/50"
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
                <span className="font-bold text-obsidian">{mine.name}</span>
                {mine.lat !== null && mine.lng !== null && (
                  <span className="text-xs text-obsidian/60 flex items-center gap-1">
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

// 3. Profile — /dashboard/admin/profile — read-only, sourced only from
// GET /auth/me's real fields, same treatment as every other role.
export const AdminProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout title="Admin Profile" subtitle="Your account identity, as recorded by the system." badge="Root Admin">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 max-w-xl mx-auto mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-plasma-violet/10 rounded-full blur-[80px] pointer-events-none"></div>

          <SectionHeader title="Account Details" />

          <div className="flex items-center gap-5 pb-6 border-b border-obsidian/10 relative z-10">
            <div className="w-20 h-20 rounded-full bg-ember flex items-center justify-center text-chalk text-3xl font-display">
              {displayName(user).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-obsidian tracking-tight">{displayName(user)}</h3>
              <p className="text-sm font-mono text-plasma-violet mt-1 uppercase tracking-wider">{userTypeLabel(user?.role)}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm font-mono text-obsidian/70 relative z-10">
            <div className="flex justify-between items-center py-2 border-b border-obsidian/10">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Email</span>
              <span className="text-obsidian">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-obsidian/10">
              <span className="text-obsidian/50 uppercase text-xs tracking-wider">Phone</span>
              <span className="text-obsidian">{user?.phone || '—'}</span>
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
