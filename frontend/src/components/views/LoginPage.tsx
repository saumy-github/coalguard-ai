import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, 
  HardHat, 
  Activity, 
  Building2, 
  Landmark, 
  Sliders, 
  Award, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { DEMO_USERS } from '../../data/mockData';

export const LoginPage = () => {
  const { loginAsRole, setActiveView, preSelectedRole } = useApp();

  const [selectedRole, setSelectedRole] = useState(preSelectedRole || 'safety_officer');
  
  // Initialize with the data of the preSelectedRole
  const initialDemoUser = DEMO_USERS[preSelectedRole] || DEMO_USERS['safety_officer'];
  const [customName, setCustomName] = useState(initialDemoUser.name);
  const [employeeId, setEmployeeId] = useState(initialDemoUser.employeeId);
  const [password, setPassword] = useState('••••••••••••');

  const roleOptions = [
    { key: 'field_worker', title: 'Worker', org: 'BCCL (Moonidih)', icon: <HardHat className="w-5 h-5 text-amber-400" />, color: 'amber' },
    { key: 'safety_officer', title: 'Mine Safety Officer', org: 'ECL (Sector 7G)', icon: <Activity className="w-5 h-5 text-amber-400" />, color: 'emerald' },
    { key: 'corporate_management', title: 'Corporate Exec', org: 'Coal India Ltd (HQ)', icon: <Building2 className="w-5 h-5 text-blue-400" />, color: 'blue' },
    { key: 'regulatory_authority', title: 'DGMS Regulatory', org: 'Ministry of Labour', icon: <Landmark className="w-5 h-5 text-purple-400" />, color: 'purple' },
    { key: 'system_admin', title: 'System Admin', org: 'CoalGuard AI Core', icon: <Sliders className="w-5 h-5 text-orange-400" />, color: 'cyan' },
    { key: 'sih_evaluator', title: 'SIH Demo', org: 'AICTE / MoC Panel', icon: <Award className="w-5 h-5 text-fuchsia-400" />, color: 'fuchsia' }
  ];

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      setCustomName(demo.name);
      setEmployeeId(demo.employeeId);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    loginAsRole(selectedRole, customName);
  };

  const activeRoleOption = roleOptions.find(r => r.key === selectedRole);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 relative">
      
      {/* Top Header Card */}
      <div className="glass-panel rounded-[2rem] p-8 sm:p-10 border border-white/10 text-center space-y-4 relative overflow-hidden">
        {/* Dynamic Glow based on selected role */}
        <div className={`absolute -top-32 -left-32 w-64 h-64 bg-${activeRoleOption?.color}-500/10 blur-[100px] pointer-events-none transition-colors duration-700`}></div>
        <div className={`absolute -bottom-32 -right-32 w-64 h-64 bg-${activeRoleOption?.color}-500/10 blur-[100px] pointer-events-none transition-colors duration-700`}></div>

        <div className={`w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.05)] relative z-10 transition-colors duration-500`}>
          <ShieldAlert className={`w-8 h-8 text-${activeRoleOption?.color}-400`} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight relative z-10">
          Operator <span className={`text-${activeRoleOption?.color}-400 transition-colors duration-500`}>Sign In</span>
        </h1>
        <p className="text-sm text-slate-400 font-mono max-w-lg mx-auto relative z-10 leading-relaxed">
          Enter your credentials and select your operational role to access the CoalGuard AI secure dashboard.
        </p>
      </div>

      {/* Main Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Role Selection Grid */}
        <div className="lg:col-span-6 space-y-4">
          <label className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 block ml-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roleOptions.map((r) => {
              const isSelected = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key)}
                  className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group ${
                    isSelected
                      ? `bg-${r.color}-500/10 border-${r.color}-500/50 shadow-[0_0_20px_rgba(0,0,0,0.2)] scale-[1.02]`
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {isSelected && (
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${r.color}-500/20 blur-[40px] rounded-full`}></div>
                  )}
                  
                  <div className="flex w-full items-center justify-between mb-4 relative z-10">
                    <div className={`p-2.5 rounded-xl transition-colors duration-300 ${isSelected ? `bg-${r.color}-500/20` : 'bg-black/40 group-hover:bg-black/60'}`}>
                      {r.icon}
                    </div>
                    {isSelected && (
                      <span className={`w-2.5 h-2.5 rounded-full bg-${r.color}-400 animate-pulse shadow-[0_0_10px_currentColor]`} />
                    )}
                  </div>
                  
                  <div className="relative z-10 w-full">
                    <p className={`font-bold text-sm tracking-wide mb-1 transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{r.title}</p>
                    <p className={`text-[10px] font-mono uppercase tracking-widest transition-colors duration-300 ${isSelected ? `text-${r.color}-300/70` : 'text-slate-500'}`}>{r.org}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Login Credentials Form */}
        <div className="lg:col-span-6">
          <form
            onSubmit={handleLoginSubmit}
            className={`glass-panel rounded-3xl p-8 border border-white/10 space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500`}
          >
            {/* Form Glow */}
            <div className={`absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-${activeRoleOption?.color}-500 to-transparent opacity-50`}></div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Authentication</h2>
              <p className="text-xs text-slate-400 font-mono">Secure access via Zero Trust Network</p>
            </div>
            
            {/* Custom Name */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                Your Full Name
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${activeRoleOption ? `text-${activeRoleOption.color}-400/50 group-focus-within:text-${activeRoleOption.color}-400` : 'text-slate-500'}`}>
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter your name"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none transition-all duration-300 focus:bg-black/60 focus:border-${activeRoleOption?.color}-500/50 focus:shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
                />
              </div>
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                Employee Badge
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${activeRoleOption ? `text-${activeRoleOption.color}-400/50 group-focus-within:text-${activeRoleOption.color}-400` : 'text-slate-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. MSO-7820"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none transition-all duration-300 focus:bg-black/60 focus:border-${activeRoleOption?.color}-500/50 focus:shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                Security Passcode
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${activeRoleOption ? `text-${activeRoleOption.color}-400/50 group-focus-within:text-${activeRoleOption.color}-400` : 'text-slate-500'}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm tracking-[0.2em] font-mono focus:outline-none transition-all duration-300 focus:bg-black/60 focus:border-${activeRoleOption?.color}-500/50 focus:shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:-translate-y-0.5 bg-${activeRoleOption?.color}-600 hover:bg-${activeRoleOption?.color}-500 shadow-[0_0_20px_rgba(0,0,0,0.2)]`}
                style={{
                  // Fallback for dynamic tailwind classes if they aren't generated
                  backgroundColor: activeRoleOption?.color === 'amber' ? '#d97706' : 
                                  activeRoleOption?.color === 'emerald' ? '#059669' : 
                                  activeRoleOption?.color === 'blue' ? '#2563eb' : 
                                  activeRoleOption?.color === 'purple' ? '#9333ea' : 
                                  activeRoleOption?.color === 'cyan' ? '#0891b2' : 
                                  activeRoleOption?.color === 'fuchsia' ? '#c026d3' : '#059669'
                }}
              >
                <span>Authorize Access</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Trust badge */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-2.5 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-amber-500/70" />
              <span>Compliant with DGMS (CMR 2017)</span>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
