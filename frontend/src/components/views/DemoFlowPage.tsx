import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, PersonStanding, Globe, Building2, Scale, ArrowRight, Zap, Play, CheckCircle2 } from 'lucide-react';
import { CoalGuardLogo } from '../../components/common/CoalGuardLogo';

const RevealOnScroll = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div 
      ref={ref}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export const DemoFlowPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0c09] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0c09]/80 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform">
              <CoalGuardLogo className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              COAL<span className="text-blue-500">GUARD</span>
            </span>
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm border border-white/10 hover:border-white/20"
          >
            Try It Yourself
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-24 animate-3d-enter">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-6 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <Play className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
            How The Ecosystem <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Connects</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
            Watch a single incident ripple securely across all four roles in real-time, demonstrating complete end-to-end transparency.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative border-l-2 border-white/10 ml-4 md:ml-12 space-y-24">
          
          {/* Step 1: Worker */}
          <RevealOnScroll delay={100}>
            <div className="relative pl-8 md:pl-16">
              <div className="absolute -left-[25px] top-4 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center border-4 border-[#0f0c09] shadow-[0_0_20px_rgba(37,99,235,0.6)]">
                <PersonStanding className="w-6 h-6 text-white" />
              </div>
              <div className="hover-3d-lift bg-zinc-900/50 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">1. The Worker Detects an Anomaly</h3>
                 <p className="text-zinc-400 mb-6 text-lg">Underground, a sensor detects high methane. The worker takes a photo and submits an emergency report via the mobile interface.</p>
                 
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-4 group-hover:border-blue-500/40 transition-colors">
                   <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                     <Zap className="w-6 h-6 text-orange-400 animate-pulse" />
                   </div>
                   <div>
                     <div className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold mb-1">Live Report Dispatched</div>
                     <div className="text-sm font-medium text-white">CH4 Levels Exceed 1.5% at Sector 7G</div>
                   </div>
                 </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Step 2: Safety Officer */}
          <RevealOnScroll delay={200}>
            <div className="relative pl-8 md:pl-16">
              <div className="absolute -left-[25px] top-4 w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center border-4 border-[#0f0c09] shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="hover-3d-lift bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-400"></div>
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">2. Command Center Responds</h3>
                 <p className="text-zinc-400 mb-6 text-lg">The Safety Officer's dashboard instantly flashes critical. They isolate the sector and trigger an evacuation protocol.</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-black/40 rounded-xl p-4 border border-red-500/30 bg-red-500/5 flex flex-col justify-center items-center text-center">
                      <span className="text-xs font-mono text-red-400 font-bold mb-2">STATUS</span>
                      <span className="text-lg font-bold text-white animate-pulse">EVACUATION</span>
                   </div>
                   <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-center items-center text-center">
                      <span className="text-xs font-mono text-emerald-400 font-bold mb-2">ACTION</span>
                      <span className="text-sm font-bold text-white">Power Cut to Sector 7G</span>
                   </div>
                 </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Step 3: Corporate */}
          <RevealOnScroll delay={200}>
            <div className="relative pl-8 md:pl-16">
              <div className="absolute -left-[25px] top-4 w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center border-4 border-[#0f0c09] shadow-[0_0_20px_rgba(71,85,105,0.6)]">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hover-3d-lift bg-zinc-900/50 backdrop-blur-xl border border-slate-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-500 to-slate-400"></div>
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">3. Corporate Analytics Update</h3>
                 <p className="text-zinc-400 mb-6 text-lg">Headquarters sees the downtime reflected in the daily production quotas, along with a newly auto-generated AI risk forecast.</p>
                 
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-slate-400 block mb-1">Production Forecast</span>
                      <span className="text-xl font-bold text-white">-450 Tons</span>
                    </div>
                    <div className="w-24 h-8 bg-gradient-to-r from-red-500/20 to-transparent rounded border border-red-500/20"></div>
                 </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* Step 4: Regulatory */}
          <RevealOnScroll delay={200}>
            <div className="relative pl-8 md:pl-16">
              <div className="absolute -left-[25px] top-4 w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center border-4 border-[#0f0c09] shadow-[0_0_20px_rgba(147,51,234,0.6)]">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="hover-3d-lift bg-zinc-900/50 backdrop-blur-xl border border-purple-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-400"></div>
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">4. Regulator Logs the Event</h3>
                 <p className="text-zinc-400 mb-6 text-lg">The DGMS (Regulatory Authority) receives an immutable cryptographic log of the incident. Nothing can be deleted or covered up.</p>
                 
                 <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-purple-500" />
                    <div>
                      <div className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold mb-1">Cryptographic Ledger</div>
                      <div className="text-sm font-medium text-white">Event ID: 0x8F9A2... Logged and Verified.</div>
                    </div>
                 </div>
              </div>
            </div>
          </RevealOnScroll>

        </div>
      </div>
    </div>
  );
};
