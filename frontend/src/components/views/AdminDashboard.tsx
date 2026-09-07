import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { displayName, userTypeLabel } from '../../utils/userDisplay';
import { api, API_URL } from '../../utils/api';
import { ROLES, type UserType } from '../../utils/userTypes';
import { fetchMines, type Mine } from '../../utils/regulatoryReports';
import { DashboardLayout } from '../layout/DashboardLayout';
import { PageLayout } from '../common/PageLayout';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';
import { Dropdown } from '../common/Dropdown';
import { UserPlus, MapPin, Search, Camera as CameraIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserType;
  full_name: string | null;
  active: boolean;
  mine: string | null;
  mines: string[];
  photo_url: string | null;
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
      // Non-critical
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
      // Non-critical
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { mines, reload };
}

// Users — /dashboard/admin/users
export const AdminUsersPage = () => {
  const { users, reload: reloadUsers } = useAdminUsers();
  const { mines } = useAdminMines();
  const [searchTerm, setSearchTerm] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserType>('worker');
  const [newUserPhoto, setNewUserPhoto] = useState<File | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleDraft, setRoleDraft] = useState<UserType>('worker');
  const [mineDraft, setMineDraft] = useState('');
  const [minesDraft, setMinesDraft] = useState<string[]>([]);
  const [managePhoto, setManagePhoto] = useState<File | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;

    try {
      const { data } = await api.post<AdminUser>('/users', {
        full_name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });

      if (newUserPhoto && SINGLE_MINE_ROLES.includes(newUserRole)) {
        const formData = new FormData();
        formData.append('file', newUserPhoto);
        try {
          await api.patch(`/users/${data.id}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // account still created — photo can be added later
        }
      }

      await reloadUsers();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhoto(null);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(detail || 'Could not create the user.');
    }
  };

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    setManageError(null);
    setManagePhoto(null);
    const user = users.find((u) => u.id === userId);
    if (user) {
      setRoleDraft(user.role);
      setMineDraft(user.mine ?? '');
      setMinesDraft(user.mines);
    }
  };

  const handleUploadManagePhoto = async () => {
    if (!selectedUserId || !managePhoto) return;
    setManageError(null);
    try {
      const formData = new FormData();
      formData.append('file', managePhoto);
      await api.patch(`/users/${selectedUserId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setManagePhoto(null);
      await reloadUsers();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setManageError(detail || 'Could not upload photo.');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUserId) return;
    setManageError(null);
    try {
      await api.patch(`/users/${selectedUserId}/role`, { role: roleDraft });
      await reloadUsers();
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

  const filteredUsers = users.filter((u) => {
    const nameMatch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <DashboardLayout>
      <PageLayout
        title="Access Provisioning"
        subtitle="Manage secure system access, role hierarchies, and mine assignments across the entire platform."
        badge="IAM System"
        headerActions={
          <Link
            to="/dashboard/attendance/kiosk"
            className="btn-glass px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-300"
          >
            <CameraIcon className="w-4 h-4" />
            <span>Attendance Kiosk</span>
          </Link>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          
          <div className="md:col-span-4 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6 h-fit">
            <SectionHeader title="Register Operator" subtitle="Provision a new identity." />

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Role</label>
                <div className="rounded-xl overflow-hidden shadow-inner">
                  <Dropdown
                    value={newUserRole}
                    onChange={(v) => setNewUserRole(v as UserType)}
                    options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                  />
                </div>
              </div>

              {SINGLE_MINE_ROLES.includes(newUserRole) && (
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 block">
                    Face Photo (for attendance)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewUserPhoto(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-orange-500/20 file:text-orange-300 file:text-xs file:font-bold hover:file:bg-orange-500/30"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. ramesh@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                />
              </div>

              {createError && <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{createError}</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all transform active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision Identity</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-8 flex flex-col gap-6">
            <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6 flex-1 flex flex-col min-h-[400px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <SectionHeader title="Operator Directory" subtitle="Manage access control and role bindings." />
                 <div className="relative -mt-6">
                   <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                   <input
                     type="text"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="Search operators..."
                     className="pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 w-full sm:w-64"
                   />
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {filteredUsers.length === 0 ? (
                   <p className="text-zinc-500 text-center py-8 font-mono text-sm">No identities match your search.</p>
                ) : (
                   filteredUsers.map((u) => (
                     <button
                       key={u.id}
                       onClick={() => selectUser(u.id)}
                       className={`w-full text-left p-4 rounded-xl flex items-center justify-between transition-all border ${
                         selectedUserId === u.id 
                           ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]' 
                           : 'bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         {u.photo_url ? (
                           <img
                             src={`${API_URL}${u.photo_url}`}
                             alt=""
                             className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                           />
                         ) : (
                           <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 shrink-0" />
                         )}
                         <div>
                           <h4 className="font-bold text-white tracking-wide text-base leading-snug">{u.full_name || u.email || u.phone || 'Unnamed'}</h4>
                           <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest font-bold">
                             <span className="text-blue-400">{userTypeLabel(u.role)}</span> • {u.email || u.phone || 'no contact'} • {mineSummary(u, mines)}
                           </p>
                         </div>
                       </div>
                       <StatusBadge status={u.active ? 'safe' : 'critical'} label={u.active ? 'ACTIVE' : 'INACTIVE'} />
                     </button>
                   ))
                )}
              </div>
            </div>

            {selectedUser && (
              <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6">
                <SectionHeader
                  title={`Manage ${selectedUser.full_name || selectedUser.email || 'User'}`}
                  subtitle="Role and scope for this identity."
                />

                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Authorization Level</label>
                  <div className="flex items-center gap-3">
                    <Dropdown
                      value={roleDraft}
                      onChange={(v) => setRoleDraft(v as UserType)}
                      options={ROLES.map((role) => ({ value: role.userType, label: role.title }))}
                      className="flex-1 bg-black/30 border-white/10"
                    />
                    <button onClick={handleChangeRole} className="px-6 py-3.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all shrink-0">
                      Update Role
                    </button>
                  </div>
                </div>

                {SINGLE_MINE_ROLES.includes(selectedUser.role) && (
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Assigned Mine</label>
                    <div className="flex items-center gap-3">
                      <Dropdown
                        value={mineDraft}
                        onChange={setMineDraft}
                        options={mines.map((mine) => ({ value: mine.id, label: mine.name }))}
                        placeholder="No assigned sector"
                        className="flex-1 bg-black/30 border-white/10"
                      />
                      <button onClick={handleSaveMine} className="px-6 py-3.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all shrink-0">
                        Commit
                      </button>
                    </div>
                  </div>
                )}

                {MULTI_MINE_ROLES.includes(selectedUser.role) && (
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Assigned Sectors</label>
                    <div className="space-y-3 p-4 bg-black/30 rounded-xl border border-white/5">
                      {mines.map((mine) => (
                        <label key={mine.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${minesDraft.includes(mine.id) ? 'bg-blue-500 border-blue-500' : 'border-white/20 bg-black/40'}`}>
                             {minesDraft.includes(mine.id) && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                          </div>
                          <span className="text-sm text-zinc-300 font-mono">{mine.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {manageError && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{manageError}</p>}
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 2. Mines — /dashboard/admin/mines
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
      <PageLayout title="System Mine Registry" subtitle="Manage physical assets and locations within the cryptographic ledger." badge="Asset Registry">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          
          <div className="md:col-span-4 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-6 h-fit">
            <SectionHeader title="Register Asset" />
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Asset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 shadow-inner"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-transform active:scale-95">
                Register Physical Asset
              </button>
            </form>
          </div>

          <div className="md:col-span-8 bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-6 sm:p-8 space-y-4">
            <SectionHeader title="Active Registry" />
            <div className="space-y-2">
              {mines.map((mine) => (
                <div key={mine.id} className="bg-black/20 hover:bg-black/40 border border-white/5 p-4 rounded-xl flex items-center justify-between text-sm transition-colors">
                  <span className="font-bold text-white tracking-wide">{mine.name}</span>
                  {mine.lat !== null && mine.lng !== null && (
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono bg-zinc-900/50 px-2 py-1 rounded border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" /> {mine.lat.toFixed(4)}, {mine.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              ))}
              {mines.length === 0 && (
                 <div className="text-center py-10 text-zinc-500 font-mono text-sm">No assets registered in the system.</div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};

// 3. Profile — /dashboard/admin/profile
export const AdminProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <PageLayout title="System Administrator Profile" subtitle="Your secure cryptographic profile and metadata." badge="Root Access">
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
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Clearance Level</span>
                    <span className="text-sm font-mono text-blue-400 font-bold">SYSTEM ROOT</span>
                  </div>
                </div>

             </div>
           </div>
        </div>
      </PageLayout>
    </DashboardLayout>
  );
};
