import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ROLES, DASHBOARD_PATH_BY_ROLE, type UserType } from '../../utils/userTypes';
import {
  Sparkles,
  Activity,
  Map,
  ArrowRight,
  HardHat,
  Building2,
  Landmark,
  Sliders,
  FileCheck,
  Play
} from 'lucide-react';

const SootParticles = () => {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 5 + 5}s`,
    animationDelay: `-${Math.random() * 10}s`,
    width: `${Math.random() * 6 + 3}px`,
    height: `${Math.random() * 6 + 3}px`,
    opacity: Math.random() * 0.6 + 0.25
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-stone-500/20 border border-white/10 rounded-sm"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            opacity: p.opacity,
            top: '-20px',
            animation: `soot-fall ${p.animationDuration} linear ${p.animationDelay} infinite`
          }}
        />
      ))}
    </div>
  );
};

// research/lld.md §3's 5 roles, sourced from lib/userTypes so this can't drift
// from Sidebar/Header again the way the old 6/7-role list did.
const ROLE_DISPLAY: Record<UserType, { icon: React.ReactNode; org: string; desc: string; color: string }> = {
  worker: {
    icon: <HardHat className="w-6 h-6 text-amber-400" />,
    org: 'BCCL (Moonidih)',
    desc: 'Mobile-first shift tasks, gas sensor alerts, voice problem reporting, and safety status.',
    color: 'border-amber-500/30 hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]'
  },
  mine_safety_officer: {
    icon: <Activity className="w-6 h-6 text-amber-400" />,
    org: 'ECL (Sector 7G)',
    desc: 'Live multi-gas monitoring, mine map, incident action assignment, and evacuation broadcast.',
    color: 'border-amber-500/30 hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]'
  },
  corporate_management: {
    icon: <Building2 className="w-6 h-6 text-stone-400" />,
    org: 'Coal India Ltd (HQ)',
    desc: 'Pan-India mines overview, daily production vs environmental quotas, and AI risk forecasts.',
    color: 'border-stone-500/30 hover:border-stone-400/80 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)]'
  },
  regulatory_authority: {
    icon: <Landmark className="w-6 h-6 text-purple-400" />,
    org: 'Ministry of Labour',
    desc: 'District compliance ratings, surprise inspection records, and statutory notice history.',
    color: 'border-purple-500/30 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(192,132,252,0.15)]'
  },
  admin: {
    icon: <Sliders className="w-6 h-6 text-orange-400" />,
    org: 'CoalGuard AI Core',
    desc: 'System health, database status, user access management, and activity audit logs.',
    color: 'border-orange-500/30 hover:border-orange-400/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]'
  }
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const loginAsGuest = useAuthStore((state) => state.loginAsGuest);
  const addToast = useUIStore((state) => state.addToast);

  const handleGuestLogin = async (userType: UserType) => {
    window.scrollTo(0, 0);
    try {
      await loginAsGuest(userType);
      navigate(DASHBOARD_PATH_BY_ROLE[userType]);
    } catch {
      addToast('error', 'Guest Login Failed', 'Could not start a guest session. Try again in a moment.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 animate-fade-in-up relative">

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>

      {/* Hero Section */}
      <div className="glass-panel rounded-[2.5rem] p-8 sm:p-16 text-center relative overflow-hidden shadow-2xl border border-white/10 bg-tech-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0c09]/40 to-[#0f0c09]/90 pointer-events-none z-0"></div>
        <SootParticles />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400 font-semibold backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart India Hackathon 2026 Innovation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
            COAL<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">GUARD</span> AI
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
            A simple, smart mine safety and compliance platform. Connects workers, safety officers, corporate management, and regulators into one unified, intelligent system.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={() => handleGuestLogin('mine_safety_officer')}
              className="btn-primary-earth px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Explore as Guest</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="btn-glass px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <span>Operator Login</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* 4 Pillars of Simplicity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="glass-panel glass-panel-hover rounded-3xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Live Monitoring</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Continuous tracking of methane, air speed, dust, and roof pressure with instant alert thresholds.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-3xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">AI Safety Assistant</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Instant recommendations based on official safety regulations (CMR 2017) explained in plain English.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-3xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Mine Map</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Clear visual layout of underground shafts, workers, active sensors, and emergency escape routes.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover rounded-3xl p-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Activity History</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Complete, transparent record of every safety event, action taken, and regulatory inspection.
          </p>
        </div>

      </div>

      {/* Select a Role to Explore */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Explore by Role
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Continue as a guest for any role — pre-seeded demo data, no password required.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLES.map((role) => {
            const display = ROLE_DISPLAY[role.userType];
            return (
              <button
                key={role.userType}
                onClick={() => handleGuestLogin(role.userType)}
                className={`text-left glass-panel glass-panel-hover rounded-3xl p-6 border ${display.color} cursor-pointer transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                      {display.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      {display.org}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-xs text-amber-500/80 font-mono mt-1 mb-3">
                    {role.subtitle}
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {display.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm font-semibold text-slate-300 group-hover:text-amber-400 transition-colors">
                  <span>Continue as Guest</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
