import React from 'react';
import { motion } from 'motion/react';
import { Zap, ArrowRight, Telescope, Database, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse delay-700" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center max-w-3xl px-6"
      >
        <div className="flex justify-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40"
          >
            <Zap className="w-12 h-12 text-white fill-white/20" />
          </motion.div>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6">
          ORCHESTRIX
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 mb-12 leading-relaxed font-medium">
          The next-generation <span className="text-indigo-400">AI Research Orchestrator</span>. 
          Discover, analyze, and synthesize academic knowledge with autonomous agents.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-bold text-lg transition-all hover:bg-indigo-50 shadow-xl shadow-white/10"
          >
            Start Researching
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
          
          <div className="flex items-center gap-6 px-8 py-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} 
                  className="w-8 h-8 rounded-full border-2 border-slate-900" 
                  alt="User"
                />
              ))}
            </div>
            <span className="text-sm text-slate-400 font-medium">Join 2,000+ researchers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard 
            icon={<Telescope className="w-5 h-5 text-indigo-400" />}
            title="Discovery Agent"
            desc="Autonomous search across Semantic Scholar and OpenAlex."
          />
          <FeatureCard 
            icon={<Database className="w-5 h-5 text-violet-400" />}
            title="Research Vault"
            desc="Persistent SQLite storage for all your sessions and papers."
          />
          <FeatureCard 
            icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
            title="AI Synthesis"
            desc="Cross-paper analysis and automated research digests."
          />
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-20" />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-ping delay-300 opacity-20" />
      <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-white rounded-full animate-ping delay-700 opacity-20" />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
