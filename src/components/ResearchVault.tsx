import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  Plus, 
  Search, 
  FileText, 
  ChevronRight, 
  Columns, 
  Trash2, 
  Save,
  MessageSquare,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
  AlertCircle,
  X,
  Zap,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { crossPaperSynthesisAgent, researchAssistantAgent } from '../services/geminiService';

interface Session {
  id: number;
  name: string;
  synthesis?: string;
  created_at: string;
  queries?: Query[];
  analyses?: Analysis[];
  papers?: Paper[];
}

interface Query {
  id: number;
  session_id: number;
  text: string;
  created_at: string;
}

interface Analysis {
  id: number;
  query_id: number;
  text: string;
  created_at: string;
}

interface Paper {
  id: number;
  session_id: number;
  query_id?: number;
  title: string;
  authors: string;
  year: number;
  abstract: string;
  summary: string;
  analysis: string;
  user_notes: string;
  url: string;
  tags: string[];
}

export default function ResearchVault() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [newSessionModal, setNewSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [renameModal, setRenameModal] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareData, setCompareData] = useState<{ sessionA: any, sessionB: any } | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  };

  const loadSession = async (session: Session) => {
    setLoading(true);
    setCompareMode(false);
    try {
      const res = await fetch(`/api/sessions/${session.id}`);
      const data = await res.json();
      setActiveSession(data);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) return;
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSessionName })
    });
    const data = await res.json();
    setSessions([data, ...sessions]);
    setNewSessionName('');
    setNewSessionModal(false);
    loadSession(data);
  };

  const deleteSession = async (id: number) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions(sessions.filter(s => s.id !== id));
    if (activeSession?.id === id) setActiveSession(null);
  };

  const renameSession = async () => {
    if (!activeSession || !renameName.trim()) return;
    await fetch(`/api/sessions/${activeSession.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameName })
    });
    setActiveSession({ ...activeSession, name: renameName });
    setSessions(sessions.map(s => s.id === activeSession.id ? { ...s, name: renameName } : s));
    setRenameModal(false);
  };

  const runQuery = async () => {
    if (!queryInput.trim() || !activeSession) return;
    setIsQuerying(true);
    const queryText = queryInput;
    setQueryInput('');

    try {
      // 1. Save Query to DB
      const qRes = await fetch(`/api/sessions/${activeSession.id}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: queryText })
      });
      const qData = await qRes.json();

      // 2. Get AI Analysis & Papers
      const aiResult = await researchAssistantAgent(queryText);

      // 3. Save Analysis to DB
      const aRes = await fetch(`/api/queries/${qData.id}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiResult.analysis })
      });
      const aData = await aRes.json();

      // 4. Save Papers to DB
      const savedPapers = [];
      for (const p of aiResult.papers) {
        const pRes = await fetch(`/api/sessions/${activeSession.id}/papers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: p.title,
            authors: p.authors,
            year: p.year,
            summary: p.summary,
            analysis: '',
            url: '',
            tags: p.tags,
            query_id: qData.id
          })
        });
        const pData = await pRes.json();
        savedPapers.push({ ...p, id: pData.id, query_id: qData.id, user_notes: '', tags: p.tags });
      }

      // 5. Update Local State
      setActiveSession({
        ...activeSession,
        queries: [...(activeSession.queries || []), qData],
        analyses: [...(activeSession.analyses || []), aData],
        papers: [...(activeSession.papers || []), ...savedPapers]
      });

    } catch (err) {
      console.error('Query failed:', err);
    } finally {
      setIsQuerying(false);
    }
  };

  const updateNotes = async (paperId: number, notes: string) => {
    await fetch(`/api/papers/${paperId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        papers: activeSession.papers?.map(p => p.id === paperId ? { ...p, user_notes: notes } : p)
      });
    }
  };

  const handleCompare = async (idA: number, idB: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compare-sessions?idA=${idA}&idB=${idB}`);
      const data = await res.json();
      setCompareData(data);
      setCompareMode(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell min-h-[calc(100vh-120px)] bg-kd-bg font-sans text-slate-200">
      {/* New Session Modal */}
      <AnimatePresence>
        {newSessionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-kd-card border border-white/10 rounded-2xl p-8 w-[420px] max-w-[90vw]"
            >
              <h2 className="font-sans text-2xl text-white mb-2">New session</h2>
              <p className="text-sm text-slate-400 mb-6">Give this research session a descriptive name so you can find it later.</p>
              <input 
                type="text" 
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="e.g. ML in Healthcare – Jan 2026"
                className="w-full bg-kd-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-kd-accent/40 transition-all mb-6"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setNewSessionModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={createSession} className="px-6 py-2 bg-kd-accent-dim border border-kd-accent-border text-kd-accent rounded-xl text-sm font-bold hover:bg-kd-accent/20 transition-all">Create session</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      <AnimatePresence>
        {renameModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-kd-card border border-white/10 rounded-2xl p-8 w-[420px] max-w-[90vw]"
            >
              <h2 className="font-sans text-2xl text-white mb-2">Rename session</h2>
              <p className="text-sm text-slate-400 mb-6">Update the name for this session.</p>
              <input 
                type="text" 
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Session name"
                className="w-full bg-kd-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-kd-accent/40 transition-all mb-6"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setRenameModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={renameSession} className="px-6 py-2 bg-kd-accent-dim border border-kd-accent-border text-kd-accent rounded-xl text-sm font-bold hover:bg-kd-accent/20 transition-all">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-[260px_1fr] h-full">
        {/* Sidebar */}
        <aside className="bg-kd-card border-r border-white/5 flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-2 font-sans text-lg text-white">
              <div className="w-2 h-2 bg-kd-accent rounded-full" />
              Knowledge
            </div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mt-1">persistent research dashboard</div>
          </div>

          <button 
            onClick={() => setNewSessionModal(true)}
            className="m-4 p-3 bg-kd-accent-dim border border-kd-accent-border rounded-xl text-kd-accent text-sm font-bold flex items-center gap-2 hover:bg-kd-accent/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New session
          </button>

          <div className="px-5 py-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest">Sessions</div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
            {sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => loadSession(s)}
                className={cn(
                  "group relative p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                  activeSession?.id === s.id ? "bg-kd-accent-dim border-kd-accent-border" : "hover:bg-kd-hover"
                )}
              >
                <div className={cn("text-sm font-medium truncate pr-6", activeSession?.id === s.id ? "text-white" : "text-slate-400")}>{s.name}</div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setCompareMode(true)}
            className="m-4 p-3 bg-kd-raised border border-white/10 rounded-xl text-slate-400 text-sm flex items-center gap-2 hover:bg-kd-hover hover:text-white transition-all"
          >
            <Columns className="w-4 h-4" /> Compare sessions
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-kd-card flex items-center justify-between">
            <h1 className="font-sans text-2xl text-white">
              {compareMode ? <span className="italic text-kd-accent">Compare sessions</span> : (activeSession?.name || 'Select or create a session')}
            </h1>
            {activeSession && !compareMode && (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                  Created {new Date(activeSession.created_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => { setRenameName(activeSession.name); setRenameModal(true); }}
                  className="px-3 py-1.5 bg-kd-raised border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                >
                  Rename
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              {compareMode ? (
                <motion.div 
                  key="compare"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <div className="grid grid-cols-2 gap-6 h-full">
                    {[0, 1].map(i => (
                      <div key={i} className="bg-kd-card border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                          <select 
                            className="w-full bg-kd-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-kd-accent/40"
                            onChange={(e) => {
                              const sid = Number(e.target.value);
                              const sess = sessions.find(s => s.id === sid);
                              if (sess) {
                                fetch(`/api/sessions/${sid}`).then(r => r.json()).then(data => {
                                  setCompareData(prev => ({
                                    ...prev,
                                    [i === 0 ? 'sessionA' : 'sessionB']: data
                                  } as any));
                                });
                              }
                            }}
                          >
                            <option value="">— Select session —</option>
                            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                          {compareData?.[i === 0 ? 'sessionA' : 'sessionB'] ? (
                            <div className="space-y-6">
                              {compareData[i === 0 ? 'sessionA' : 'sessionB'].queries?.slice().reverse().map((q: any) => {
                                const papers = compareData[i === 0 ? 'sessionA' : 'sessionB'].papers?.filter((p: any) => p.query_id === q.id) || [];
                                const analysis = compareData[i === 0 ? 'sessionA' : 'sessionB'].analyses?.find((a: any) => a.query_id === q.id);
                                return (
                                  <div key={q.id} className="space-y-4">
                                    <div className="text-[10px] font-mono text-slate-600">{new Date(q.created_at).toLocaleDateString()}</div>
                                    <div className="font-sans text-lg text-white italic">"{q.text}"</div>
                                    {analysis && (
                                      <div className="p-4 bg-kd-raised border-l-2 border-kd-accent rounded-r-xl text-xs text-slate-400 leading-relaxed">
                                        {analysis.text}
                                      </div>
                                    )}
                                    <div className="space-y-3">
                                      {papers.map((p: any) => (
                                        <div key={p.id} className="p-3 bg-kd-bg border border-white/5 rounded-xl space-y-2">
                                          <div className="font-sans text-sm text-white">{p.title}</div>
                                          {p.user_notes && <div className="text-[11px] text-slate-500 italic">Note: {p.user_notes}</div>}
                                          <div className="flex flex-wrap gap-1.5">
                                            {p.tags?.map((t: string, ti: number) => (
                                              <span key={ti} className="text-[9px] font-mono text-kd-accent/60 uppercase tracking-widest">{t}</span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                              <Database className="w-8 h-8 opacity-20" />
                              <p className="text-sm italic">Select a session to preview</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : activeSession ? (
                <motion.div 
                  key="active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Query Card */}
                  <div className="bg-kd-card border border-white/5 rounded-2xl p-6 shadow-2xl shadow-black/50">
                    <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Search query</div>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && runQuery()}
                        placeholder="e.g. transformer architectures in medical imaging"
                        className="flex-1 bg-kd-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-kd-accent/40 transition-all"
                        disabled={isQuerying}
                      />
                      <button 
                        onClick={runQuery}
                        disabled={isQuerying || !queryInput.trim()}
                        className="px-6 py-3 bg-kd-accent-dim border border-kd-accent-border text-kd-accent rounded-xl text-sm font-bold hover:bg-kd-accent/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search & Analyse
                      </button>
                    </div>
                  </div>

                  {/* Results History */}
                  <div className="space-y-12">
                    {isQuerying && (
                      <div className="space-y-3 animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-3 bg-white/5 rounded" />
                          <div className="w-48 h-5 bg-white/5 rounded" />
                        </div>
                        <div className="h-32 bg-white/5 rounded-2xl" />
                      </div>
                    )}

                    {activeSession.queries?.slice().reverse().map(q => {
                      const papers = activeSession.papers?.filter(p => p.query_id === q.id) || [];
                      const analysis = activeSession.analyses?.find(a => a.query_id === q.id);
                      return (
                        <div key={q.id} className="space-y-6">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-slate-600">{new Date(q.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <h2 className="font-sans text-xl text-white italic">"{q.text}"</h2>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-widest">{papers.length} papers</span>
                          </div>

                          {analysis && (
                            <div className="bg-kd-card border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-kd-accent" />
                              <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-kd-accent" />
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">AI Analysis</div>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{analysis.text}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4">
                            {papers.map((p, i) => (
                              <PaperCard 
                                key={p.id} 
                                paper={p} 
                                index={i} 
                                onUpdateNotes={(notes) => updateNotes(p.id, notes)} 
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {(!activeSession.queries || activeSession.queries.length === 0) && !isQuerying && (
                      <div className="py-20 text-center space-y-4">
                        <div className="text-4xl opacity-20">⊙</div>
                        <h3 className="font-sans text-xl text-slate-400">No searches yet</h3>
                        <p className="text-sm text-slate-600 max-w-xs mx-auto">Enter a query above to fetch papers and generate an AI analysis.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="text-6xl opacity-10">◎</div>
                  <div className="space-y-2">
                    <h3 className="font-sans text-2xl text-slate-400">No session active</h3>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Create a new session from the sidebar to start researching. All queries, papers, and notes persist across reloads.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function PaperCard({ paper, index, onUpdateNotes }: { paper: Paper, index: number, onUpdateNotes: (notes: string) => void }) {
  const [notes, setNotes] = useState(paper.user_notes);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateNotes(notes);
    setIsEditing(false);
  };

  return (
    <div className="bg-kd-card border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
      <div className="p-6 flex gap-6">
        <div className="text-[10px] font-mono text-slate-700 pt-1">{String(index + 1).padStart(2, '0')}</div>
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="font-sans text-lg text-white leading-tight mb-1">{paper.title}</h4>
            <p className="text-xs text-slate-500 italic">{paper.authors} {paper.year ? `· ${paper.year}` : ''}</p>
          </div>
          
          <p className="text-sm text-slate-400 leading-relaxed">{paper.summary}</p>
          
          <div className="flex flex-wrap gap-2">
            {paper.tags?.map((t, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-kd-accent-dim border border-kd-accent-border text-[9px] font-bold text-kd-accent uppercase tracking-widest">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex gap-4 items-start">
        <textarea 
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setIsEditing(true); }}
          placeholder="Add a note to this paper..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-slate-500 placeholder:text-slate-700 resize-none min-h-[20px] max-h-[120px] py-1 font-sans"
        />
        <AnimatePresence>
          {isEditing && (
            <motion.button 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={handleSave}
              className="text-[10px] font-mono text-kd-accent uppercase tracking-widest font-bold pt-1 hover:text-white transition-colors"
            >
              Save note
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
