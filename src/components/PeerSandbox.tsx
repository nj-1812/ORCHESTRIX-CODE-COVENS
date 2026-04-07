import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Lock, 
  Users, 
  MessageSquare, 
  FileText, 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FeedbackThread {
  author: string;
  text: string;
  timestamp: string;
}

interface SandboxData {
  status: string;
  content: string;
  feedback_threads: FeedbackThread[];
}

export default function PeerSandbox({ userId }: { userId: string }) {
  const [draftId, setDraftId] = useState('draft_paper_001');
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSandbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sandbox/${draftId}?user_id=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sandbox');
      }
      
      setSandboxData(data);
    } catch (err: any) {
      setError(err.message);
      setSandboxData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-5xl mx-auto space-y-8 font-sans"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-500" />
          Peer Sandbox
        </h2>
        <p className="text-slate-400">Secure, private environment for pre-publication peer review and collaboration.</p>
      </div>

      {!sandboxData ? (
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-12 flex flex-col items-center text-center max-w-2xl mx-auto shadow-2xl">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-8 border border-indigo-500/20">
            <Lock className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Access Private Sandbox</h3>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Enter a Sandbox ID to access private preprint drafts. Access is restricted to designated peer reviewers and PIs.
          </p>
          
          <div className="w-full space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={draftId}
                onChange={(e) => setDraftId(e.target.value)}
                placeholder="Enter Sandbox ID (e.g., draft_paper_001)"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            <button 
              onClick={fetchSandbox}
              disabled={loading || !draftId}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Verify Permissions <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-800/50 w-full grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Designated Peers</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">End-to-End Encryption</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Private Threads</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{sandboxData.status}</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{draftId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSandboxData(null)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 min-h-[400px] relative overflow-hidden group">
                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Confidential Draft
                </div>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans text-lg">
                    {sandboxData.content}
                  </p>
                </div>
                
                {/* PDF Placeholder Effect */}
                <div className="mt-12 p-12 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 group-hover:border-indigo-500/30 transition-all">
                  <FileText className="w-12 h-12 text-slate-700 group-hover:text-indigo-500/50 transition-all" />
                  <p className="text-sm text-slate-600 font-medium">Interactive PDF Viewer Loading...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-6 shadow-xl h-full flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Feedback Threads</h4>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {sandboxData.feedback_threads.map((thread, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {thread.author[0]}
                        </div>
                        <span className="text-xs font-bold text-white">{thread.author}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-medium">{new Date(thread.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {thread.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <textarea 
                  placeholder="Add your feedback..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all resize-none h-24"
                />
                <button className="w-full mt-3 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-all text-xs uppercase tracking-widest">
                  Post Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
