import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, ShieldCheck } from 'lucide-react';

interface LoginOverlayProps {
  onLogin: (email: string) => void;
}

export default function LoginOverlay({ onLogin }: LoginOverlayProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const gmailRe = /^[^\s@]+@gmail\.com$/i;

    if (!gmailRe.test(email)) {
      setError("Please enter a valid Gmail address.");
      return;
    }
    if (!password.length) {
      setError("Please enter your password.");
      return;
    }

    onLogin(email);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] font-sans overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-10 md:p-12 w-full max-w-[450px] shadow-2xl flex flex-col items-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
          <Zap className="w-8 h-8 text-white fill-white/20" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome to Orchestrix</h1>
        <p className="text-base text-slate-400 mb-8 text-center">Sign in with your researcher credentials</p>

        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Academic Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-base text-white placeholder:text-slate-600"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Security Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-base text-white placeholder:text-slate-600"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-rose-400 text-sm mt-1 text-left w-full min-h-[20px] flex items-center gap-2"
            >
              <span className="w-1 h-1 rounded-full bg-rose-400" />
              {error}
            </motion.p>
          )}

          <div className="flex flex-col gap-4 mt-8">
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              Initialize Session
            </button>
            
            <div className="flex items-center justify-center gap-2 py-2 text-slate-500 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Academic Sandbox</span>
            </div>
          </div>
        </form>
      </motion.div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center opacity-20 pointer-events-none">
        <span className="text-sm font-mono tracking-[0.3em] text-slate-400 uppercase">Orchestrix Intelligence Systems</span>
      </div>
    </div>
  );
}
