import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from '../../store/authStore';
import { 
  HardHat, 
  ShieldCheck, 
  Building2, 
  Landmark, 
  Sliders, 
  Lock, 
  ArrowRight,
  ShieldAlert,
  User,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { CoalGuardLogo } from '../../components/common/CoalGuardLogo';

const GOOGLE_AUTH_ENABLED = false;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const DEMO_ACCOUNTS = [
  { 
    role: 'Worker', 
    userType: 'worker',
    identifier: '9990000001',
    icon: HardHat,
    color: 'text-zinc-300 group-hover:text-amber-400',
    iconBgActive: 'bg-amber-400/10 text-amber-400',
    bgAccent: 'bg-amber-400',
    bgFocus: 'focus:ring-amber-400/30',
    borderActive: 'border-amber-400/50',
  },
  { 
    role: 'Mine Safety Officer', 
    userType: 'safety_officer',
    identifier: 'officer@example.com',
    icon: ShieldCheck,
    color: 'text-zinc-300 group-hover:text-emerald-400',
    iconBgActive: 'bg-emerald-400/10 text-emerald-400',
    bgAccent: 'bg-emerald-400',
    bgFocus: 'focus:ring-emerald-400/30',
    borderActive: 'border-emerald-400/50',
  },
  { 
    role: 'Corporate Management', 
    userType: 'corporate_manager',
    identifier: 'corporate@example.com',
    icon: Building2,
    color: 'text-zinc-300 group-hover:text-blue-400',
    iconBgActive: 'bg-blue-400/10 text-blue-400',
    bgAccent: 'bg-blue-400',
    bgFocus: 'focus:ring-blue-400/30',
    borderActive: 'border-blue-400/50',
  },
  { 
    role: 'Regulatory Authority', 
    userType: 'regulator',
    identifier: 'regulator@example.com',
    icon: Landmark,
    color: 'text-zinc-300 group-hover:text-purple-400',
    iconBgActive: 'bg-purple-400/10 text-purple-400',
    bgAccent: 'bg-purple-400',
    bgFocus: 'focus:ring-purple-400/30',
    borderActive: 'border-purple-400/50',
  },
  { 
    role: 'Admin', 
    userType: 'admin',
    identifier: 'admin@example.com',
    icon: Sliders,
    color: 'text-zinc-300 group-hover:text-orange-400',
    iconBgActive: 'bg-orange-400/10 text-orange-400',
    bgAccent: 'bg-orange-400',
    bgFocus: 'focus:ring-orange-400/30',
    borderActive: 'border-orange-400/50',
  },
];
const DEMO_PASSWORD = 'test123';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading, error } = useAuthStore();

  const initialAccount = location.state?.role 
    ? DEMO_ACCOUNTS.find(a => a.userType === location.state.role) || DEMO_ACCOUNTS[0]
    : DEMO_ACCOUNTS[0];

  const [selectedAccount, setSelectedAccount] = useState(initialAccount);
  const [identifier, setIdentifier] = useState(initialAccount.identifier);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRoleSelect = (account: typeof DEMO_ACCOUNTS[0]) => {
    if (selectedAccount.role === account.role) return;
    setSelectedAccount(account);
    setIdentifier(account.identifier);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(identifier, password);
      navigate('/dashboard');
    } catch {
      // Handled by store
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch {
      // Handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950 font-sans selection:bg-zinc-700 selection:text-white">
      
      {/* Top Left Back Button */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/80 rounded-lg border border-white/5 backdrop-blur-md"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-semibold tracking-wide">Back to Home</span>
      </button>

      {/* Sleek Graphite Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-[#18181b] to-zinc-950"></div>
        {/* Extreme subtle grid texture */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none" 
          style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        ></div>
      </div>

      {/* Atmospheric Soft Light Orbs (Very Subdued) */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-zinc-700/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-5xl relative z-10 flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-black/50 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            <CoalGuardLogo className="w-8 h-8 text-zinc-100 relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight drop-shadow-sm">
            COAL<span className="text-zinc-500">GUARD</span>
          </h1>
        </div>

        {/* Main Two-Column Card (Premium Graphite Glass) */}
        <div className="w-full bg-zinc-900/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden flex flex-col md:flex-row min-h-[550px]">
          
          {/* Left Column: Role Selector */}
          <div className="md:w-5/12 bg-black/20 p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center relative">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 pl-2">Select Access Role</h2>
            <div className="space-y-3 relative z-10">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                const isSelected = selectedAccount.role === account.role;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleRoleSelect(account)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 group overflow-hidden relative ${
                      isSelected 
                        ? 'bg-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-white/10' 
                        : 'bg-transparent hover:bg-zinc-800/40 border-transparent hover:border-white/5'
                    } border`}
                  >
                    {/* Active Indicator Line */}
                    {isSelected && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${account.bgAccent} rounded-l-xl`}></div>
                    )}
                    
                    <div className="flex items-center gap-4 relative z-10 pl-1">
                      <div className={`p-2.5 rounded-lg transition-all duration-300 ${
                        isSelected ? account.iconBgActive : 'bg-zinc-800/50 group-hover:bg-zinc-800'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? '' : account.color} transition-colors duration-300`} />
                      </div>
                      <div className="text-left">
                        <div className={`font-semibold tracking-wide transition-colors duration-300 ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                          {account.role}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className={`w-5 h-5 transition-all duration-300 ${isSelected ? 'text-zinc-500 translate-x-0 opacity-100' : 'text-zinc-700 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="md:w-7/12 p-8 md:p-12 relative flex flex-col justify-center bg-gradient-to-br from-transparent to-zinc-900/20">
            <div className={`transition-all duration-300 transform ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
              
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Sign In</h2>
                <p className="text-zinc-400">Authenticating as <span className="font-semibold text-zinc-200">{selectedAccount.role}</span></p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Identifier Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300 ml-1">Email or phone</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className={`w-full bg-black/20 text-zinc-100 rounded-xl pl-12 pr-4 py-4 border border-white/10 focus:outline-none focus:ring-1 focus:bg-black/40 ${selectedAccount.bgFocus} ${selectedAccount.borderActive} transition-all duration-300 placeholder:text-zinc-600 shadow-inner`}
                      placeholder="you@example.com or +91..."
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-semibold text-zinc-300">Password</label>
                    <span className="text-xs text-zinc-500 font-mono bg-zinc-900/50 px-2 py-0.5 rounded-md border border-white/5">Demo: {DEMO_PASSWORD}</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-black/20 text-zinc-100 rounded-xl pl-12 pr-4 py-4 border border-white/10 focus:outline-none focus:ring-1 focus:bg-black/40 ${selectedAccount.bgFocus} ${selectedAccount.borderActive} transition-all duration-300 placeholder:text-zinc-600 shadow-inner`}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-3 text-center backdrop-blur-sm">
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full relative overflow-hidden group bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-900 font-bold py-4 px-6 rounded-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)] ${isLoading ? 'cursor-not-allowed' : ''}`}
                  >
                    <span>{isLoading ? 'Authenticating...' : 'Access Workspace'}</span>
                    {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-zinc-600" />}
                  </button>
                </div>
              </form>

              {GOOGLE_AUTH_ENABLED && GOOGLE_CLIENT_ID && (
                <div className="mt-8 pt-6 border-t border-white/5 relative z-20">
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => useAuthStore.setState({ error: 'Google sign-in failed' })}
                      theme="filled_black"
                      shape="pill"
                    />
                  </GoogleOAuthProvider>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
