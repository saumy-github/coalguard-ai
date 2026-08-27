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
  const { loginAsRole, setActiveView } = useApp();

  const [selectedRole, setSelectedRole] = useState('safety_officer');
  const [customName, setCustomName] = useState('abc_name');
  const [employeeId, setEmployeeId] = useState('MSO-7820');
  const [password, setPassword] = useState('••••••••••••');

  const roleOptions = [
    { key: 'field_worker', title: 'Worker', org: 'BCCL (Moonidih)', icon: <HardHat className="w-4 h-4 text-amber-400" /> },
    { key: 'safety_officer', title: 'Mine Safety Officer', org: 'ECL (Sector 7G)', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
    { key: 'corporate_management', title: 'Corporate Exec', org: 'Coal India Ltd (HQ)', icon: <Building2 className="w-4 h-4 text-blue-400" /> },
    { key: 'regulatory_authority', title: 'DGMS Regulatory', org: 'Ministry of Labour', icon: <Landmark className="w-4 h-4 text-purple-400" /> },
    { key: 'system_admin', title: 'System Admin', org: 'CoalGuard AI Core', icon: <Sliders className="w-4 h-4 text-cyan-400" /> },
    { key: 'sih_evaluator', title: 'SIH Demo', org: 'AICTE / MoC Panel', icon: <Award className="w-4 h-4 text-[#f6b994]" /> }
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-[#51443d]/60 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8d5d3e] to-[#4c270c] border border-[#e9c176]/50 flex items-center justify-center mx-auto shadow-lg">
          <ShieldAlert className="w-6 h-6 text-[#ffe3d3]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Sora'] tracking-tight">
          Operator Sign In
        </h1>
        <p className="text-xs sm:text-sm text-[#d6c3b9] font-mono max-w-md mx-auto">
          Enter your name and select your operational role to access the corresponding dashboard.
        </p>
      </div>

      {/* Main Form Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Role Selection Grid */}
        <div className="md:col-span-5 space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#9e8d85] block">
            Select Your Role
          </label>
          <div className="space-y-2">
            {roleOptions.map((r) => {
              const isSelected = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-[#8d5d3e]/30 border-[#f6b994] text-white shadow-lg font-bold'
                      : 'bg-[#181717] border-[#353534] text-[#d6c3b9] hover:bg-[#252423] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#252423]">
                      {r.icon}
                    </div>
                    <div>
                      <p className="font-bold text-white">{r.title}</p>
                      <p className="text-[10px] text-[#9e8d85]">{r.org}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#f6b994] animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Login Credentials Form */}
        <div className="md:col-span-7">
          <form
            onSubmit={handleLoginSubmit}
            className="glass-card rounded-2xl p-6 border border-[#51443d]/60 space-y-4 shadow-xl"
          >
            
            {/* Custom Name */}
            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">
                Your Full Name (Display on Profile)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9e8d85] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">
                Employee / Badge Number
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. MSO-7820"
                className="w-full px-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-mono text-[#d6c3b9] mb-1.5 block">
                Security Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9e8d85] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141415] border border-[#353534] text-white text-xs font-mono focus:outline-none focus:border-[#f6b994]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-bronze py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Trust badge */}
            <div className="pt-3 border-t border-[#353534]/60 flex items-center justify-center gap-2 text-[11px] font-mono text-[#9e8d85]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compliant with DGMS Safety Regulations (CMR 2017)</span>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
