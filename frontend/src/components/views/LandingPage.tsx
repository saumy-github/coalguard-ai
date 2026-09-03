import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, 
  Sparkles, 
  Activity, 
  Map, 
  CheckCircle2, 
  ArrowRight, 
  Award, 
  HardHat, 
  Building2, 
  Landmark, 
  Sliders, 
  Radio, 
  FileCheck,
  AlertTriangle,
  Play
} from 'lucide-react';

const SootParticles = () => {
  // Generate an array of 40 particles with random positions, sizes, and animation delays
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 5 + 5}s`, // 5s to 10s
    animationDelay: `-${Math.random() * 10}s`, // Negative delay so they start already falling
    width: `${Math.random() * 5 + 2}px`,
    height: `${Math.random() * 5 + 2}px`,
    opacity: Math.random() * 0.4 + 0.1
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[2.5rem]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-[#1a1511] border border-white/5 rounded-sm"
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

export const LandingPage = () => {
  const navigate = useNavigate();

  const roleCards = [
    {
      role: 'field_worker',
      title: 'Worker',
      designation: 'Underground Operations & Strata Control',
      org: 'BCCL (Moonidih)',
      icon: <HardHat className="w-6 h-6 text-amber-400" />,
      desc: 'Mobile-first shift tasks, gas sensor alerts, voice problem reporting, and safety status.',
      color: 'border-amber-500/30 hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]'
    },
    {
      role: 'safety_officer',
      title: 'Mine Safety Officer',
      designation: 'Pit-Head Command & Ventilation Control',
      org: 'ECL (Sector 7G)',
      icon: <Activity className="w-6 h-6 text-amber-400" />,
      desc: 'Live multi-gas monitoring, mine map, incident action assignment, and evacuation broadcast.',
      color: 'border-amber-500/30 hover:border-amber-400/80 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]'
    },
    {
      role: 'corporate_management',
      title: 'Corporate Management',
      designation: 'Enterprise Strategy & ESG Governance',
      org: 'Coal India Ltd (HQ)',
      icon: <Building2 className="w-6 h-6 text-stone-400" />,
      desc: 'Pan-India 24 mines overview, daily production vs environmental quotas, and AI risk forecasts.',
      color: 'border-stone-500/30 hover:border-stone-400/80 hover:shadow-[0_0_20px_rgba(96,165,250,0.15)]'
    },
    {
      role: 'regulatory_authority',
      title: 'Regulatory Authority',
      designation: 'Directorate General of Mines Safety (DGMS)',
      org: 'Ministry of Labour',
      icon: <Landmark className="w-6 h-6 text-purple-400" />,
      desc: 'District compliance ratings, surprise inspection records, and statutory notice history.',
      color: 'border-purple-500/30 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(192,132,252,0.15)]'
    },
    {
      role: 'system_admin',
      title: 'System Admin',
      designation: 'System Infrastructure & Security',
      org: 'CoalGuard AI Core',
      icon: <Sliders className="w-6 h-6 text-orange-400" />,
      desc: 'System health, database status, user access management, and activity audit logs.',
      color: 'border-orange-500/30 hover:border-orange-400/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]'
    },
    {
      role: 'sih_evaluator',
      title: 'SIH Demo',
      designation: 'Smart India Hackathon Evaluation',
      org: 'AICTE / Ministry of Coal',
      icon: <Award className="w-6 h-6 text-rose-400" />,
      desc: '60-second interactive guided demo showing incident detection to AI resolution.',
      color: 'border-rose-500/50 bg-rose-500/5 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 animate-fade-in-up relative">
      
      {/* Background ambient glows */}
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

          {/* Key Quick CTAs */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={() => {
                window.scrollTo(0, 0);
                navigate('/login');
              }}
              className="btn-primary-earth px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Launch 60-Second Demo</span>
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
              Select a persona below to experience their tailored dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roleCards.map((card) => (
            <div
              key={card.role}
              onClick={() => {
                window.scrollTo(0, 0);
                navigate('/login');
              }}
              className={`glass-panel rounded-3xl p-6 border ${card.color} cursor-pointer transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    {card.org}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-amber-500/80 font-mono mt-1 mb-3">
                  {card.designation}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  {card.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm font-semibold text-slate-300 group-hover:text-amber-400 transition-colors">
                <span>Enter Workspace</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

