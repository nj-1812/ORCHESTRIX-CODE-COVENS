import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Bot, 
  Search, 
  Clock, 
  Loader2, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Cloud,
  History,
  Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { UserProfile, ResearchProject } from '../types';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [sessions, setSessions] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        const detailedSessions = await Promise.all(
          data.map(async (s: any) => {
            const detailRes = await fetch(`/api/sessions/${s.id}`);
            return detailRes.json();
          })
        );
        setSessions(detailedSessions);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalPapers = sessions.reduce((acc, s) => acc + (s.academicResults?.length || 0), 0);
  const totalSnapshots = sessions.reduce((acc, s) => acc + (s.snapshots?.length || 0), 0);
  const currentVersion = sessions.length > 0 ? Math.max(...sessions.map(s => s.version)) : 1.0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1 uppercase">
            Hi, {user.displayName}
          </h2>
          <p className="text-slate-400">Welcome to Orchestrix. {sessions.length > 0 ? `You have ${sessions.length} active research projects.` : 'Start your first research project today.'}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800">
          <Clock className="w-4 h-4" />
          Last sync: Just now
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Research" 
          value={sessions.length.toString()} 
          sub="Projects in vault" 
          icon={<Zap className="w-5 h-5 text-indigo-400" />} 
        />
        <StatCard 
          title="Current Version" 
          value={`v${currentVersion.toFixed(1)}`} 
          sub="Latest project state" 
          icon={<Layers className="w-5 h-5 text-emerald-400" />} 
        />
        <StatCard 
          title="Sources Found" 
          value={totalPapers.toString()} 
          sub="Verified references" 
          icon={<Search className="w-5 h-5 text-sky-400" />} 
        />
        <StatCard 
          title="Snapshots" 
          value={totalSnapshots.toString()} 
          sub="Persistent versions" 
          icon={<History className="w-5 h-5 text-amber-400" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Recent Activity
          </h3>
          <div className="space-y-6">
            {sessions.length > 0 ? (
              sessions.slice(0, 5).map(session => (
                <ActivityItem 
                  key={session.id}
                  title={session.name}
                  status={session.status || 'completed'}
                  progress={session.progress || 100}
                  time={new Date(session.createdAt).toLocaleDateString()}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
                  <Search className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No recent activity found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Active Orchestrator
          </h3>
          <div className="p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/10 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Central Orchestrator</p>
                <p className="text-xs text-slate-500">Managing 3 specialized agents</p>
              </div>
              <div className="ml-auto">
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Running
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <AgentMiniStatus name="Planner" status="idle" />
              <AgentMiniStatus name="Searcher" status="idle" />
              <AgentMiniStatus name="Writer" status="idle" />
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-slate-800/50 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors border border-slate-700/50">
            View Agent Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <IntegrationCard 
          title="Google Docs" 
          desc="Notes & documents" 
          icon={<FileText className="w-6 h-6 text-blue-400" />} 
          status="Connected"
        />
        <IntegrationCard 
          title="Google Sheets" 
          desc="Data & tables" 
          icon={<FileSpreadsheet className="w-6 h-6 text-emerald-400" />} 
          status="Connected"
        />
        <IntegrationCard 
          title="Google Cloud" 
          desc="Storage & sync" 
          icon={<Cloud className="w-6 h-6 text-sky-400" />} 
          status="Active"
        />
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, sub, icon }: { title: string, value: string, sub: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className="p-2 rounded-lg bg-slate-900 group-hover:bg-indigo-500/10 transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function ActivityItem({ title, status, progress, time }: { title: string, status: string, progress: number, time: string }) {
  return (
    <div className="group cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">{title}</h4>
        <span className="text-xs text-slate-500">{time}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={cn(
              "h-full rounded-full",
              progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
            )}
          />
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-right">
          {status}
        </span>
      </div>
    </div>
  );
}

function AgentMiniStatus({ name, status }: { name: string, status: 'idle' | 'working' | 'completed' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400">{name}</span>
      <div className="flex items-center gap-2">
        {status === 'working' && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          status === 'working' ? "text-indigo-400" : "text-slate-600"
        )}>
          {status}
        </span>
      </div>
    </div>
  );
}

function IntegrationCard({ title, desc, icon, status }: { title: string, desc: string, icon: React.ReactNode, status: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 flex items-center gap-4 hover:border-slate-700 transition-colors cursor-pointer group">
      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        {status}
      </span>
    </div>
  );
}
