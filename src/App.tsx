import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  LayoutDashboard, 
  FileText, 
  Zap, 
  BookOpen, 
  Plus, 
  Menu,
  X,
  FileSpreadsheet,
  Presentation,
  Quote,
  Bell,
  Upload,
  Telescope
} from 'lucide-react';
import { cn } from './lib/utils';
import type { UserProfile, TrendDataContract } from './types';

// Components
import Dashboard from './components/Dashboard';
import ResearchPanel from './components/ResearchPanel';
import ProjectsList from './components/ProjectsList';
import ChatAssistant from './components/ChatAssistant';
import DiscoveryAgent from './components/DiscoveryAgent';
import CitationEngine from './components/CitationEngine';
import PDFSummarizer from './components/PDFSummarizer';
import DigestSubscription from './components/DigestSubscription';
import ResearchVault from './components/ResearchVault';
import NotesManager from './components/NotesManager';
import ProjectTracker from './components/ProjectTracker';
import SummarizerAgent from './components/SummarizerAgent';
import ResearchCalendar from './components/ResearchCalendar';
import AnalysisAgent from './components/AnalysisAgent';
import PeerSandbox from './components/PeerSandbox';
import DeepResearchAgent from './components/DeepResearchAgent';
import LandingPage from './components/LandingPage';
import LoginOverlay from './components/LoginOverlay';
import ResearchRoadmap from './components/ResearchRoadmap';
import { Database, ListTodo, FileSearch, Calendar, BarChart3, Shield, ShieldCheck, Map } from 'lucide-react';

const MOCK_USER: UserProfile = {
  uid: 'guest-user-123',
  email: 'guest@orchestrix.ai',
  displayName: 'Guest Researcher',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'
};

export default function App() {
  const [user, setUser] = useState<UserProfile>(MOCK_USER);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [trendData, setTrendData] = useState<TrendDataContract | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'research' | 'projects' | 'integrations' | 'discovery' | 'citations' | 'pdf' | 'digest' | 'vault' | 'tracker' | 'summarizer' | 'calendar' | 'analysis' | 'sandbox' | 'deep-research' | 'roadmap'>('dashboard');

  if (!isLoggedIn) {
    return <LoginOverlay onLogin={(email) => {
      setUser(prev => ({ ...prev, email }));
      setIsLoggedIn(true);
    }} />;
  }

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-slate-800/50 transition-transform duration-300 ease-in-out",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 text-white fill-white/20" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Orchestrix</span>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Database className="w-5 h-5" />} label="Research Vault" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
            
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Research Agents</div>
            <NavItem icon={<ShieldCheck className="w-5 h-5" />} label="Deep Research" active={activeTab === 'deep-research'} onClick={() => setActiveTab('deep-research')} />
            <NavItem icon={<Map className="w-5 h-5" />} label="Research Roadmap" active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} />
            <NavItem icon={<BarChart3 className="w-5 h-5" />} label="Analysis Agent" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
            <NavItem icon={<FileSearch className="w-5 h-5" />} label="Summarizer Agent" active={activeTab === 'summarizer'} onClick={() => setActiveTab('summarizer')} />
            <NavItem icon={<Telescope className="w-5 h-5" />} label="Discovery Agent" active={activeTab === 'discovery'} onClick={() => setActiveTab('discovery')} />
            <NavItem icon={<Upload className="w-5 h-5" />} label="PDF Analysis" active={activeTab === 'pdf'} onClick={() => setActiveTab('pdf')} />
            <NavItem icon={<Search className="w-5 h-5" />} label="New Project" active={activeTab === 'research'} onClick={() => setActiveTab('research')} />
            
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</div>
            <NavItem icon={<Shield className="w-5 h-5" />} label="Peer Sandbox" active={activeTab === 'sandbox'} onClick={() => setActiveTab('sandbox')} />
            <NavItem icon={<Calendar className="w-5 h-5" />} label="Research Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <NavItem icon={<ListTodo className="w-5 h-5" />} label="Project Tracker" active={activeTab === 'tracker'} onClick={() => setActiveTab('tracker')} />
            <NavItem icon={<Quote className="w-5 h-5" />} label="Citation Engine" active={activeTab === 'citations'} onClick={() => setActiveTab('citations')} />
            <NavItem icon={<Bell className="w-5 h-5" />} label="Scheduled Digest" active={activeTab === 'digest'} onClick={() => setActiveTab('digest')} />
            <NavItem icon={<BookOpen className="w-5 h-5" />} label="My Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrations</div>
            <NavItem icon={<FileText className="w-5 h-5" />} label="Google Docs" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
            <NavItem icon={<FileSpreadsheet className="w-5 h-5" />} label="Google Sheets" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
            <NavItem icon={<Presentation className="w-5 h-5" />} label="Presentations" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
          </nav>

          <div className="p-4 mt-auto border-t border-slate-800/50">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/30 transition-colors cursor-pointer group">
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full ring-2 ring-indigo-500/20" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={cn("transition-all duration-300 ease-in-out min-h-screen", isSidebarOpen ? "pl-64" : "pl-0")}>
        <header className="h-16 border-b border-slate-800/50 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('research')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium hover:bg-indigo-600/20 transition-all">
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard key="dashboard" user={user} />}
            {activeTab === 'research' && <ResearchPanel key="research" />}
            {activeTab === 'projects' && <NotesManager key="projects" />}
            {activeTab === 'integrations' && <IntegrationsView key="integrations" />}
            {activeTab === 'discovery' && <DiscoveryAgent key="discovery" />}
            {activeTab === 'citations' && <CitationEngine key="citations" />}
            {activeTab === 'pdf' && <PDFSummarizer key="pdf" />}
            {activeTab === 'digest' && <DigestSubscription key="digest" />}
            {activeTab === 'vault' && <ResearchVault key="vault" />}
            {activeTab === 'tracker' && <ProjectTracker key="tracker" />}
            {activeTab === 'summarizer' && <SummarizerAgent key="summarizer" />}
            {activeTab === 'calendar' && <ResearchCalendar key="calendar" />}
            {activeTab === 'analysis' && <AnalysisAgent key="analysis" onHandoff={(data) => { setTrendData(data); setActiveTab('roadmap'); }} />}
            {activeTab === 'sandbox' && <PeerSandbox key="sandbox" userId={user.uid} />}
            {activeTab === 'deep-research' && <DeepResearchAgent key="deep-research" />}
            {activeTab === 'roadmap' && <ResearchRoadmap key="roadmap" trendData={trendData} />}
          </AnimatePresence>
        </div>
      </main>

      <ChatAssistant />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
      active ? "bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_12px_rgba(79,70,229,0.1)]" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
    )}>
      <span className={cn(active ? "text-indigo-400" : "text-slate-500")}>{icon}</span>
      {label}
      {active && <motion.div layoutId="active-nav" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
    </button>
  );
}

function IntegrationsView() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div><h2 className="text-3xl font-bold tracking-tight text-white mb-1">Integrations</h2><p className="text-slate-400">Connect Orchestrix to your favorite Google Workspace tools.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <IntegrationCard title="Google Docs" desc="Export research outlines and papers directly to Google Docs." icon={<FileText className="w-8 h-8 text-blue-400" />} connected />
        <IntegrationCard title="Google Sheets" desc="Sync source lists and data findings to Google Sheets." icon={<FileSpreadsheet className="w-8 h-8 text-emerald-400" />} connected />
        <IntegrationCard title="Google Slides" desc="Generate presentation templates based on your research." icon={<Presentation className="w-8 h-8 text-amber-400" />} connected />
      </div>
    </motion.div>
  );
}

function IntegrationCard({ title, desc, icon, connected }: { title: string, desc: string, icon: React.ReactNode, connected?: boolean }) {
  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-all">
      <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center">{icon}</div>
      <div><h3 className="text-lg font-bold text-white mb-1">{title}</h3><p className="text-sm text-slate-500 leading-relaxed">{desc}</p></div>
      <button className={cn("w-full py-2.5 rounded-lg text-sm font-bold transition-all", connected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-indigo-600 text-white")}>
        {connected ? "Connected" : "Connect"}
      </button>
    </div>
  );
}
