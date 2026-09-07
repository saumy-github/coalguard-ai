import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndiaMineMap } from '../IndiaMineMap';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { ROLES, type UserType } from '../../utils/userTypes';
import {
  Sparkles, Activity, Map, ArrowRight, HardHat, Building2,
  Landmark, Sliders, Play, ShieldCheck, Zap
} from 'lucide-react';
import { CoalGuardLogo } from '../../components/common/CoalGuardLogo';

const RevealOnScroll = ({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) => {
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
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div 
      ref={ref}
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const DASHBOARD_PATH_BY_ROLE: Record<UserType, string> = {
  worker: '/dashboard/worker',
  safety_officer: '/dashboard/safety',
  corporate_manager: '/dashboard/corporate',
  regulator: '/dashboard/regulatory',
  admin: '/dashboard/admin/users'
};

const ROLE_DISPLAY: Record<UserType, { icon: React.ReactNode; org: string; desc: string; color: string }> = {
  worker: {
    icon: <HardHat className="w-6 h-6 text-blue-600" />,
    org: 'BCCL (Moonidih)',
    desc: 'Mobile-first shift tasks, gas sensor alerts, voice problem reporting, and safety status.',
    color: 'border-blue-200 hover:border-blue-400 bg-blue-50/50'
  },
  safety_officer: {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    org: 'ECL (Sector 7G)',
    desc: 'Live multi-gas monitoring, mine map, incident action assignment, and evacuation broadcast.',
    color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50'
  },
  corporate_manager: {
    icon: <Building2 className="w-6 h-6 text-slate-600" />,
    org: 'Coal India Ltd (HQ)',
    desc: 'Pan-India mines overview, daily production vs environmental quotas, and AI risk forecasts.',
    color: 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
  },
  regulator: {
    icon: <Landmark className="w-6 h-6 text-purple-600" />,
    org: 'Ministry of Labour',
    desc: 'District compliance ratings, surprise inspection records, and statutory notice history.',
    color: 'border-purple-200 hover:border-purple-400 bg-purple-50/50'
  },
  admin: {
    icon: <Sliders className="w-6 h-6 text-orange-600" />,
    org: 'CoalGuard AI Core',
    desc: 'System health, database status, user access management, and activity audit logs.',
    color: 'border-orange-200 hover:border-orange-400 bg-orange-50/50'
  }
};

export const LandingPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
           const theme = entry.target.getAttribute('data-theme') || 'dark';
           setHeaderTheme(theme as 'dark' | 'light');
        }
      });
    }, {
      rootMargin: '-80px 0px -80% 0px'
    });

    document.querySelectorAll('section[data-theme]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleGuestLogin = (_userType: UserType) => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#C5C6C7] text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 relative z-[100] isolate">
      
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? (headerTheme === 'light' ? 'bg-white/90 backdrop-blur-xl border-b border-black/5 py-4 shadow-sm' : 'bg-[#0f0c09]/80 backdrop-blur-xl border-b border-white/5 py-4 shadow-md') : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CoalGuardLogo className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-extrabold tracking-tight transition-colors duration-500 ${isScrolled && headerTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              COAL<span className="text-blue-500">GUARD</span>
            </span>
          </div>

          <button 
            onClick={() => navigate('/login')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-500 backdrop-blur-sm border ${isScrolled && headerTheme === 'light' ? 'bg-slate-900 text-white hover:bg-slate-800 border-transparent' : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/20'}`}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section data-theme="dark" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-bg-3d.jpg" 
            alt="Abstract 3D Coal Render" 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center hero-bg-dynamic"
          />
          <div className="absolute inset-0 bg-slate-900/40"></div>
          {/* Blend bottom edge into solid dark color to hide the seam */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-slate-900"></div>
        </div>

        {/* Text Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-16">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            The Future of <span className="text-cyan-400">Mine Safety</span> & Compliance
          </h1>
          <p className="text-xl sm:text-2xl text-slate-200 font-medium mb-10 drop-shadow-md leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            A unified, intelligent platform connecting workers, safety officers, and regulators. Experience real-time monitoring and AI-driven insights.
          </p>
        </div>
      </section>

      {/* Who We Are & Mission Section */}
      <section data-theme="dark" className="py-24 bg-slate-900 text-white relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">Built For Transparency. <br/><span className="text-blue-500">Secured By Cryptography.</span></h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                CoalGuard is a digital ecosystem dedicated to transforming the mining industry. We remove silos between underground workers, corporate management, and government regulators—ensuring every incident is handled swiftly and every compliance metric is immutable.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <RevealOnScroll delay={100}>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors h-full">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Privacy & Security First</h3>
                <p className="text-slate-400 leading-relaxed">
                  Built on Military-grade encryption and Strict Role-Based Access Control (RBAC). Personal data is cryptographically protected to ensure the safety and privacy of individual workers, while systemic compliance data is locked into an immutable ledger that guarantees regulatory integrity.
                </p>
              </div>
            </RevealOnScroll>
            
            <RevealOnScroll delay={200}>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-2xl font-bold mb-4">See It In Action</h3>
                <p className="text-slate-400 mb-8 max-w-sm">
                  Watch a single hazard report trigger a synchronized response across the entire organization.
                </p>
                <button 
                  onClick={() => navigate('/demo')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 inline-flex items-center gap-3"
                >
                  <Play className="w-5 h-5 fill-white" />
                  View Interactive Demo Flow
                </button>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Combined Light Sections for Seamless Gradient */}
      <div className="bg-gradient-to-b from-[#AAA7AD] to-[#C5C6C7]">
        {/* Features Section */}
        <section data-theme="light" id="features" className="py-24 relative z-10 overflow-hidden">
        {/* Downward gradient transition from dark hero seam into light grey */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <RevealOnScroll>
              <div className="space-y-12 pr-0 lg:pr-8">
                <div>
                  <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-900 to-blue-600 tracking-tight mb-6 drop-shadow-sm">Intelligent Safety Pillars</h2>
                  <p className="text-xl text-slate-800 font-medium">Everything you need to ensure maximum compliance and worker safety in high-risk environments.</p>
                </div>

                <div className="space-y-8">
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Live Monitoring</h3>
                      <p className="text-lg text-slate-500 leading-relaxed">Continuous tracking of methane, air speed, dust, and roof pressure with instant alert thresholds.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">AI Safety Assistant</h3>
                      <p className="text-lg text-slate-500 leading-relaxed">Instant recommendations based on official safety regulations (CMR 2017) explained in plain English.</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
                      <Map className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Interactive Mine Map</h3>
                      <p className="text-lg text-slate-500 leading-relaxed">Clear visual layout of underground shafts, active sensors, and emergency escape routes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={200}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-200 bg-white">
                <img 
                  src="/images/card-2.jpg" 
                  alt="Heavy Excavator" 
                  loading="lazy"
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h4 className="text-xl font-bold mb-1">Heavy Machinery Integration</h4>
                  <p className="text-sm text-slate-200">Modern extraction operations.</p>
                </div>
              </div>
            </RevealOnScroll>

          </div>
        </div>
      </section>

      {/* Interactive Roles Section */}
      <section data-theme="light" id="roles" className="py-24 relative overflow-hidden z-10">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <RevealOnScroll>
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Designed for Every Stakeholder</h2>
              <p className="text-lg text-slate-600">
                Select a role below to explore customized dashboards pre-populated with demo data. Experience how CoalGuard seamlessly connects the entire organization.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* The image takes up one column (half width) on large screens */}
            <RevealOnScroll delay={100} className="lg:col-span-1 h-full">
              <div className="h-full min-h-[500px] rounded-3xl overflow-hidden shadow-xl border border-slate-200 relative group bg-white">
                <img 
                  src="/images/card-1.jpg" 
                  alt="Historic Mining" 
                  loading="lazy"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 absolute inset-0"
                />
                <div className="absolute inset-0 bg-blue-900/10 mix-blend-multiply pointer-events-none"></div>
              </div>
            </RevealOnScroll>

            {/* List of Roles */}
            <RevealOnScroll delay={300} className="lg:col-span-1 h-full">
              <div className="space-y-4 flex flex-col justify-center h-full">
                {ROLES.map((role) => {
                  const display = ROLE_DISPLAY[role.userType];
                  return (
                    <button
                      key={role.userType}
                      onClick={() => handleGuestLogin(role.userType)}
                      className="text-left w-full bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 group transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                          {display.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-slate-900 uppercase tracking-tight">{role.title}</h4>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{display.org}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </RevealOnScroll>
            
          </div>
        </div>
      </section>
      </div>

      {/* Where We Operate */}
      <section data-theme="dark" className="py-24 bg-slate-900 relative z-10 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Where We Operate</h2>
              <p className="text-lg text-slate-400">Live across multiple mines, monitored from one unified platform.</p>
            </div>
            <IndiaMineMap />
          </RevealOnScroll>
        </div>
      </section>

      {/* Footer Minimal */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white py-8 text-center relative z-10">
        <p className="text-slate-500 text-sm font-mono">&copy; 2026 CoalGuard. All rights reserved.</p>
      </footer>

    </div>
  );
};
