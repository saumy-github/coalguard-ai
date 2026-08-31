import React from 'react';
import { useApp } from '../../context/AppContext';
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

export const LandingPage = () => {
  const { loginAsRole, setActiveView } = useApp();

  const roleCards = [
    {
      role: 'field_worker',
      title: 'Worker',
      designation: 'Underground Operations & Strata Control',
      org: 'BCCL (Moonidih)',
      icon: <HardHat className="w-6 h-6 text-amber-400" />,
      desc: 'Mobile-first shift tasks, gas sensor alerts, voice problem reporting, and safety status.',
      color: 'border-amber-500/40 hover:border-amber-400'
    },
    {
      role: 'safety_officer',
      title: 'Mine Safety Officer',
      designation: 'Pit-Head Command & Ventilation Control',
      org: 'ECL (Sector 7G)',
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      desc: 'Live multi-gas monitoring, mine map, incident action assignment, and evacuation broadcast.',
      color: 'border-emerald-500/40 hover:border-emerald-400'
    },
    {
      role: 'corporate_management',
      title: 'Corporate Management',
      designation: 'Enterprise Strategy & ESG Governance',
      org: 'Coal India Ltd (HQ)',
      icon: <Building2 className="w-6 h-6 text-blue-400" />,
      desc: 'Pan-India 24 mines overview, daily production vs environmental quotas, and AI risk forecasts.',
      color: 'border-blue-500/40 hover:border-blue-400'
    },
    {
      role: 'regulatory_authority',
      title: 'Regulatory Authority',
      designation: 'Directorate General of Mines Safety (DGMS)',
      org: 'Ministry of Labour',
      icon: <Landmark className="w-6 h-6 text-purple-400" />,
      desc: 'District compliance ratings, surprise inspection records, and statutory notice history.',
      color: 'border-purple-500/40 hover:border-purple-400'
    },
    {
      role: 'system_admin',
      title: 'System Admin',
      designation: 'System Infrastructure & Security',
      org: 'CoalGuard AI Core',
      icon: <Sliders className="w-6 h-6 text-cyan-400" />,
      desc: 'System health, database status, user access management, and activity audit logs.',
      color: 'border-cyan-500/40 hover:border-cyan-400'
    },
    {
      role: 'sih_evaluator',
      title: 'SIH Demo',
      designation: 'Smart India Hackathon Evaluation',
      org: 'AICTE / Ministry of Coal',
      icon: <Award className="w-6 h-6 text-[#f6b994]" />,
      desc: '60-second interactive guided demo showing incident detection to AI resolution.',
      color: 'border-[#f6b994] bg-[#8d5d3e]/15'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Hero Section */}
      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-[#51443d]/70 text-center relative overflow-hidden bg-gradient-to-b from-[#1c1b1b] to-[#121213] shadow-2xl">
        
        {/* Subtle background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#8d5d3e]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8d5d3e]/20 border border-[#8d5d3e]/50 text-xs font-mono text-[#f6b994] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart India Hackathon 2026 Innovation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-['Sora'] tracking-tight leading-tight">
            COAL<span className="text-[#f6b994]">GUARD</span> AI
          </h1>

          <p className="text-base sm:text-lg text-[#d6c3b9] font-mono leading-relaxed">
            A simple, smart mine safety and compliance platform. Connects workers, safety officers, corporate management, and regulators into one easy-to-use system.
          </p>

          {/* Key Quick CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => loginAsRole('sih_evaluator')}
              className="btn-bronze px-6 py-3 rounded-xl text-sm font-mono font-bold flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch 60-Second Demo</span>
            </button>

            <button
              onClick={() => setActiveView('login')}
              className="px-6 py-3 rounded-xl bg-[#252423] hover:bg-[#353534] border border-[#51443d] text-sm font-mono font-bold text-white transition-all flex items-center gap-2"
            >
              <span>Operator Login</span>
              <ArrowRight className="w-4 h-4 text-[#f6b994]" />
            </button>
          </div>

        </div>

      </div>

      {/* 4 Pillars of Simplicity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/40">
          <div className="w-10 h-10 rounded-xl bg-[#252423] border border-[#51443d] flex items-center justify-center text-emerald-400 mb-3">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white font-['Sora'] mb-1">1. Live Monitoring</h3>
          <p className="text-xs text-[#9e8d85] font-mono leading-relaxed">
            Continuous tracking of methane, air speed, dust, and roof pressure with instant alert thresholds.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/40">
          <div className="w-10 h-10 rounded-xl bg-[#252423] border border-[#51443d] flex items-center justify-center text-[#f6b994] mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white font-['Sora'] mb-1">2. AI Safety Assistant</h3>
          <p className="text-xs text-[#9e8d85] font-mono leading-relaxed">
            Instant recommendations based on official safety regulations (CMR 2017) explained in plain English.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/40">
          <div className="w-10 h-10 rounded-xl bg-[#252423] border border-[#51443d] flex items-center justify-center text-blue-400 mb-3">
            <Map className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white font-['Sora'] mb-1">3. Mine Map</h3>
          <p className="text-xs text-[#9e8d85] font-mono leading-relaxed">
            Clear visual layout of underground shafts, workers, active sensors, and emergency escape routes.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#51443d]/40">
          <div className="w-10 h-10 rounded-xl bg-[#252423] border border-[#51443d] flex items-center justify-center text-purple-400 mb-3">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white font-['Sora'] mb-1">4. Activity History</h3>
          <p className="text-xs text-[#9e8d85] font-mono leading-relaxed">
            Complete, transparent record of every safety event, action taken, and regulatory inspection.
          </p>
        </div>

      </div>

      {/* Select a Role to Explore */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#353534]/60">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-['Sora']">
              Explore by Role
            </h2>
            <p className="text-xs text-[#9e8d85] font-mono">
              Click any role below to open their tailored dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleCards.map((card) => (
            <div
              key={card.role}
              onClick={() => loginAsRole(card.role)}
              className={`glass-card rounded-2xl p-5 border ${card.color} cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between group shadow-lg`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-[#252423] border border-[#51443d]/60 group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#f6b994] bg-[#8d5d3e]/20 px-2 py-0.5 rounded border border-[#8d5d3e]/40">
                    {card.org}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-['Sora'] group-hover:text-[#f6b994] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-[#9e8d85] font-mono mb-2">
                  {card.designation}
                </p>
                <p className="text-xs text-[#d6c3b9] font-mono leading-relaxed mb-4">
                  {card.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-[#353534]/60 flex items-center justify-between text-xs font-mono text-[#f6b994] font-bold">
                <span>Enter as {card.title}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
