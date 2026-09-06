import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Activity,
  Map,
  ArrowRight,
  FileCheck,
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

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16 animate-fade-in-up relative">

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>

      {/* Hero Section */}
      <div className="glass-panel rounded-[2.5rem] p-8 sm:p-16 text-center relative overflow-hidden shadow-2xl border border-white/10 bg-tech-grid">
        <div className="absolute inset-0 bg-linear-to-b from-[#0f0c09]/40 to-[#0f0c09]/90 pointer-events-none z-0"></div>
        <SootParticles />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400 font-semibold backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart India Hackathon 2026 Innovation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
            COAL<span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-orange-400">GUARD</span> AI
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
            A simple, smart mine safety and compliance platform. Connects workers, safety officers, corporate management, and regulators into one unified, intelligent system.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary-earth px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-3 w-full sm:w-auto justify-center"
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

    </div>
  );
};
