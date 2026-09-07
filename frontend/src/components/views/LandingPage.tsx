import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IndiaMineMap } from '../IndiaMineMap';
import {
  Sparkles,
  Activity,
  Map,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-20">

      {/* Hero Section — Caldera's signature halftone block (Plasma Violet to
          Ember gradient, orange dot pattern) behind the 189px-scale display
          headline. */}
      <div className="bg-tech-grid rounded-card p-8 sm:p-20 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-chalk/15 text-chalk text-xs font-medium backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart India Hackathon 2026 Innovation</span>
          </div>

          <h1 className="font-display text-chalk leading-[0.95] text-6xl sm:text-8xl lg:text-[9rem] tracking-wide">
            COALGUARD
          </h1>

          <p className="text-lg sm:text-xl text-chalk/80 font-medium leading-relaxed max-w-2xl mx-auto">
            A simple, smart mine safety and compliance platform. Connects workers, safety officers, corporate management, and regulators into one unified, intelligent system.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary-earth px-8 py-4 text-base flex items-center gap-3 w-full sm:w-auto justify-center group"
            >
              <span>Operator Login</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* 4 Pillars of Simplicity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="glass-panel glass-panel-hover p-6">
          <div className="w-12 h-12 rounded-full bg-pumice flex items-center justify-center text-obsidian mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display text-obsidian mb-2">Live Monitoring</h3>
          <p className="text-sm text-obsidian/60 leading-relaxed">
            Continuous tracking of methane, air speed, dust, and roof pressure with instant alert thresholds.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-6">
          <div className="w-12 h-12 rounded-full bg-pumice flex items-center justify-center text-obsidian mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display text-obsidian mb-2">AI Safety Assistant</h3>
          <p className="text-sm text-obsidian/60 leading-relaxed">
            Instant recommendations based on official safety regulations (CMR 2017) explained in plain English.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-6">
          <div className="w-12 h-12 rounded-full bg-pumice flex items-center justify-center text-obsidian mb-4">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display text-obsidian mb-2">Mine Map</h3>
          <p className="text-sm text-obsidian/60 leading-relaxed">
            Clear visual layout of underground shafts, workers, active sensors, and emergency escape routes.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-6">
          <div className="w-12 h-12 rounded-full bg-pumice flex items-center justify-center text-obsidian mb-4">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display text-obsidian mb-2">Activity History</h3>
          <p className="text-sm text-obsidian/60 leading-relaxed">
            Complete, transparent record of every safety event, action taken, and regulatory inspection.
          </p>
        </div>

      </div>

      {/* Where We Operate */}
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-display text-obsidian">Where We Operate</h2>
          <p className="text-sm text-obsidian/60 mt-1">Live across multiple mines, monitored from one platform.</p>
        </div>
        <IndiaMineMap />
      </div>

    </div>
  );
};
