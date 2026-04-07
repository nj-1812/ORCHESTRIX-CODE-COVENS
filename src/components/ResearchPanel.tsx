import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Zap, 
  Loader2, 
  LayoutDashboard, 
  Search, 
  FileText, 
  Quote, 
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Bot,
  AlertCircle,
  X,
  Settings,
  ChevronLeft,
  Edit3,
  Save,
  Info,
  Database
} from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';
import { 
  orchestratorAgent, 
  plannerAgent, 
  searcherAgent, 
  writerAgent, 
  citerAgent,
  rankerAgent
} from '../services/geminiService';
import { searchAcademicPapers } from '../services/academicService';
import { AcademicResult } from '../types';

interface AgentStep {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'completed' | 'error';
}

interface PDFPrefs {
  includeSources: boolean;
  includeCitations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export default function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [showPDFPrefs, setShowPDFPrefs] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const LIMIT = 5;

  const [pdfPrefs, setPdfPrefs] = useState<PDFPrefs>({
    includeSources: true,
    includeCitations: true,
    fontSize: 'medium'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [sessions, setSessions] = useState<{ id: number, name: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1.0);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!selectedSessionId) return;
      try {
        const res = await fetch(`/api/sessions/${selectedSessionId}`);
        const data = await res.json();
        setCurrentVersion(data.version || 1.0);
      } catch (err) {
        console.error('Failed to fetch session details:', err);
      }
    };
    fetchSessionDetails();
  }, [selectedSessionId]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
        // We'll update version when session is selected or loaded
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const logToChat = async (role: string, text: string) => {
    if (!selectedSessionId) return;
    try {
      await fetch(`/api/sessions/${selectedSessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, text })
      });
    } catch (err) {
      console.error('Failed to log chat:', err);
    }
  };

  const createSnapshot = async (query: string, resultCount: number, topResult: string) => {
    if (!selectedSessionId) return;
    try {
      const nextVersion = Math.round((currentVersion + 0.1) * 10) / 10;
      await fetch(`/api/sessions/${selectedSessionId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: currentVersion, query, result_count: resultCount, top_result: topResult })
      });
      await fetch(`/api/sessions/${selectedSessionId}/version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: nextVersion })
      });
      setCurrentVersion(nextVersion);
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    }
  };

  const handleExportState = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.project_info.name}_state.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export state:', err);
    }
  };

  const saveToVault = async () => {
    if (!selectedSessionId || !results) return;
    setIsSaving(true);
    try {
      for (const res of results.academicResults) {
        await fetch(`/api/sessions/${selectedSessionId}/papers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: res.title,
            abstract: res.abstract || '',
            summary: res.citation,
            analysis: res.relevanceExplanation,
            url: res.url || ''
          })
        });
      }
      alert('Research findings saved to vault!');
    } catch (err) {
      console.error('Failed to save to vault:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const reportRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<AgentStep[]>([
    { id: 'planner', name: 'Planner', role: 'Strategy & Structure', status: 'idle' },
    { id: 'searcher', name: 'Searcher', role: 'Academic Search', status: 'idle' },
    { id: 'ranker', name: 'Ranker', role: 'Relevance Scoring', status: 'idle' },
    { id: 'writer', name: 'Writer', role: 'Synthesis & Outline', status: 'idle' },
    { id: 'reviewer', name: 'Reviewer', role: 'User Finalization', status: 'idle' },
  ]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const updateStep = (id: string, status: AgentStep['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setShowPDFPrefs(false);
    console.log('Starting PDF Export...');

    try {
      // Temporarily hide pagination and edit buttons for PDF
      const pagination = reportRef.current.querySelector('.pagination-controls');
      if (pagination) (pagination as HTMLElement).style.display = 'none';

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#050505',
        logging: true,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          const clonedWindow = clonedDoc.defaultView || window;
          
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            
            // Comprehensive fix for oklch issues in cloned doc
            const style = clonedWindow.getComputedStyle(el);
            ['color', 'backgroundColor', 'borderColor', 'outlineColor'].forEach(prop => {
              const val = (style as any)[prop];
              if (val && (val.includes('oklch') || val.includes('var('))) {
                // Fallback to standard colors for PDF compatibility
                if (prop === 'color') {
                  if (el.classList.contains('text-indigo-400')) el.style.color = '#818cf8';
                  else if (el.classList.contains('text-slate-400')) el.style.color = '#94a3b8';
                  else if (el.classList.contains('text-slate-500')) el.style.color = '#64748b';
                  else el.style.color = '#ffffff';
                }
                else if (prop === 'backgroundColor') {
                  if (el.classList.contains('bg-indigo-600')) el.style.backgroundColor = '#4f46e5';
                  else el.style.backgroundColor = '#0a0a0a';
                }
                else el.style[prop as any] = 'transparent';
              }
            });
          }
        }
      });

      if (pagination) (pagination as HTMLElement).style.display = 'flex';

      const imgWidth = 595.28; // A4 width in pt
      const pageHeight = 841.89; // A4 height in pt
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'pt', 'a4');
      let position = 0;

      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Orchestrix_Research_${new Date().getTime()}.pdf`);
      console.log('PDF Export successful');
    } catch (error) {
      console.error('PDF Export Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStart = async (currentOffset: number = 0) => {
    if (!query.trim() || isOrchestrating) return;

    setIsOrchestrating(true);
    if (currentOffset === 0) {
      setResults(null);
      setLogs([]);
      setReportTitle('');
    }
    setOffset(currentOffset);
    setProgress(5);
    addLog(`Orchestrator: Initializing research pipeline (Offset: ${currentOffset})...`);
    
    if (currentOffset === 0) {
      await logToChat('User', `Search Request: ${query}`);
    }

    try {
      // 1. Orchestrator
      const config = await orchestratorAgent(query);
      addLog(`Orchestrator: Complexity detected: ${config.complexity}. Strategy: ${config.initialStrategy}`);
      setProgress(15);

      // 2. Planner
      updateStep('planner', 'working');
      addLog('Planner: Generating research phases...');
      const plan = await plannerAgent(query, config.initialStrategy);
      updateStep('planner', 'completed');
      addLog(`Planner: Plan generated with ${plan.phases?.length || 0} phases.`);
      setProgress(30);

      // 3. Searcher (Academic)
      updateStep('searcher', 'working');
      addLog('Searcher: Querying Semantic Scholar API...');
      const { results: rawResults, total } = await searchAcademicPapers(query, currentOffset, LIMIT);
      setTotalResults(total);
      updateStep('searcher', 'completed');
      addLog(`Searcher: Found ${rawResults.length} papers from academic databases.`);
      setProgress(50);

      // 4. Ranker (Gemini Scoring)
      updateStep('ranker', 'working');
      addLog('Ranker: Scoring results based on relevance and impact...');
      const rankingData = await rankerAgent(query, rawResults);
      
      const academicResults: AcademicResult[] = rawResults.map(paper => {
        const ranking = rankingData.rankedResults.find((r: any) => r.id === paper.paperId) || {
          score: 50,
          relevanceExplanation: 'General relevance to the topic.',
          citation: `${paper.authors?.[0]?.name || 'Unknown'} (${paper.year || 'n.d.'}). ${paper.title}.`
        };
        
        return {
          id: paper.paperId,
          title: paper.title,
          authors: paper.authors?.map((a: any) => a.name) || [],
          year: paper.year,
          abstract: paper.abstract,
          url: paper.url,
          citation: ranking.citation,
          score: ranking.score,
          relevanceExplanation: ranking.relevanceExplanation
        };
      }).sort((a, b) => b.score - a.score);

      updateStep('ranker', 'completed');
      addLog('Ranker: Results ranked and scored successfully.');
      setProgress(75);

      // 5. Writer
      updateStep('writer', 'working');
      addLog('Writer: Synthesizing findings into an outline...');
      const outline = await writerAgent(query, academicResults.map(r => r.abstract || r.title));
      updateStep('writer', 'completed');
      addLog('Writer: Synthesis complete.');
      setProgress(90);

      // 6. Reviewer (Auto-open Edit Mode)
      updateStep('reviewer', 'working');
      addLog('Reviewer: Research ready for user review.');
      setReportTitle(outline.title || query);
      setIsEditing(true);
      setProgress(100);

      setResults({
        plan,
        academicResults,
        outline,
      });
      addLog('Orchestrator: Research cycle complete. Please review and edit the report.');

      if (currentOffset === 0) {
        const topResult = academicResults[0]?.title || 'None';
        await createSnapshot(query, academicResults.length, topResult);
        await logToChat('Orchestrix_Agent', `Search complete. Logged ${academicResults.length} papers. Version upgraded to ${Math.round((currentVersion + 0.1) * 10) / 10}`);
      }

    } catch (error: any) {
      console.error('Research Error:', error);
      const errorMessage = error?.message || 'Unknown error';
      addLog(`Error: Research pipeline failed. ${errorMessage.substring(0, 100)}...`);
      setSteps(prev => prev.map(s => s.status === 'working' ? { ...s, status: 'error' } : s));
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleUpdateResult = (id: string, field: keyof AcademicResult, value: any) => {
    setResults((prev: any) => ({
      ...prev,
      academicResults: prev.academicResults.map((r: AcademicResult) => 
        r.id === id ? { ...r, [field]: value } : r
      )
    }));
  };

  const handleUpdateOutline = (sectionIndex: number, field: 'heading' | 'content', value: any) => {
    setResults((prev: any) => {
      const newSections = [...prev.outline.sections];
      newSections[sectionIndex] = { ...newSections[sectionIndex], [field]: value };
      return {
        ...prev,
        outline: { ...prev.outline, sections: newSections }
      };
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {!results ? (
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-white">What are we researching today?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Enter a topic or a complex question. Our Orchestrator will deploy the right agents to find, 
              analyze, and synthesize the information for you.
            </p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-[#0a0a0a] border border-slate-800 rounded-2xl p-2 flex items-center gap-2">
              <div className="flex-1 px-4">
                <textarea 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. The impact of microplastics on deep-sea ecosystems..."
                  className="w-full bg-transparent border-none focus:ring-0 text-lg text-white placeholder:text-slate-600 py-4 resize-none h-32"
                />
              </div>
              <button 
                onClick={() => handleStart(0)}
                disabled={!query.trim() || isOrchestrating}
                className="absolute bottom-4 right-4 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isOrchestrating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-[spin_0.5s_linear_infinite]" />
                    Orchestrating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 group-hover:animate-pulse" />
                    Start Research
                  </>
                )}
              </button>
            </div>
          </div>

          {isOrchestrating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Research in Progress</h3>
                    <p className="text-slate-400 text-sm">Orchestrator is coordinating agents</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-400">{progress}%</div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overall Progress</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {steps.map(step => (
                  <AgentCard 
                    key={step.id} 
                    name={step.name}
                    status={step.status}
                    role={step.role}
                    icon={
                      step.id === 'planner' ? <LayoutDashboard className="w-5 h-5" /> :
                      step.id === 'searcher' ? <Search className="w-5 h-5" /> :
                      step.id === 'writer' ? <FileText className="w-5 h-5" /> :
                      <Quote className="w-5 h-5" />
                    }
                  />
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Agent Logs</span>
                  <span className="text-indigo-400">Live</span>
                </div>
                <div className="bg-black/50 rounded-xl p-4 font-mono text-xs text-slate-400 space-y-2 h-40 overflow-y-auto border border-slate-800/50 scrollbar-thin scrollbar-thumb-slate-800">
                  {logs.map((log, i) => (
                    <p key={i} className={cn(
                      log.includes('Error') ? "text-rose-400" : 
                      log.includes('Orchestrator') ? "text-emerald-400" :
                      log.includes('Planner') ? "text-indigo-400" :
                      log.includes('Searcher') ? "text-sky-400" :
                      "text-slate-400"
                    )}>
                      {log}
                    </p>
                  ))}
                  <div className="animate-pulse">_</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8 pb-20"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-8">
              {isEditing ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Report Title</p>
                  <input 
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-2xl font-bold text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Enter report title..."
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-white">{reportTitle || results.outline?.title || query}</h2>
                  <p className="text-slate-400">Research completed by Orchestrix AI</p>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (isEditing) updateStep('reviewer', 'completed');
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isEditing ? "bg-emerald-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"
                )}
              >
                {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                {isEditing ? 'Finalize Report' : 'Edit Report'}
              </button>
              <button 
                onClick={() => setShowPDFPrefs(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3"
            >
              <Info className="w-5 h-5 text-indigo-400" />
              <p className="text-sm text-indigo-300">
                <span className="font-bold">Review Mode:</span> You can now edit the title, subtopics, and findings directly. Click "Finalize Report" when you're done.
              </p>
            </motion.div>
          )}

          <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 bg-[#050505] rounded-3xl border border-slate-800/50">
            {/* Outline */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-400" />
                    Research Outline & Synthesis
                  </h3>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    <Bot className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Synthesized</span>
                  </div>
                </div>
                <div className="space-y-10">
                  {results.outline?.sections?.map((section: any, i: number) => (
                    <div key={i} className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Subtopic Heading</p>
                          <input 
                            value={section.heading}
                            onChange={(e) => handleUpdateOutline(i, 'heading', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-lg font-semibold text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <h4 className="text-xl font-bold text-indigo-400 border-l-4 border-indigo-600 pl-4">{section.heading}</h4>
                      )}
                      <ul className="space-y-3">
                        {section.content?.map((item: string, j: number) => (
                          <li key={j} className="text-slate-300 flex gap-3 leading-relaxed">
                            <span className="text-indigo-600 mt-1.5 font-bold">•</span>
                            {isEditing ? (
                              <textarea 
                                value={item}
                                onChange={(e) => {
                                  const newContent = [...section.content];
                                  newContent[j] = e.target.value;
                                  handleUpdateOutline(i, 'content', newContent);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 resize-none"
                                rows={3}
                              />
                            ) : (
                              item
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Academic Results */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Search className="w-6 h-6 text-sky-400" />
                    Academic Sources & Evidence
                  </h3>
                </div>
                
                {results.academicResults?.map((paper: AcademicResult) => (
                  <div key={paper.id} className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-8 space-y-6 hover:border-indigo-500/30 transition-all shadow-lg">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Paper Title</p>
                            <input 
                              value={paper.title}
                              onChange={(e) => handleUpdateResult(paper.id, 'title', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-lg font-bold text-white focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <h4 className="text-xl font-bold text-white leading-tight">{paper.title}</h4>
                        )}
                        {isEditing ? (
                          <div className="flex gap-2 mt-1">
                            <div className="flex-1 space-y-1">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Authors (comma separated)</p>
                              <input 
                                value={paper.authors.join(', ')}
                                onChange={(e) => handleUpdateResult(paper.id, 'authors', e.target.value.split(',').map(s => s.trim()))}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Year</p>
                              <input 
                                value={paper.year || ''}
                                onChange={(e) => handleUpdateResult(paper.id, 'year', parseInt(e.target.value) || null)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-400 focus:ring-2 focus:ring-indigo-500"
                                type="number"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm font-medium text-indigo-400">
                              {paper.authors.join(', ')}
                            </p>
                            <span className="text-slate-600">•</span>
                            <p className="text-sm text-slate-500">
                              {paper.year || 'n.d.'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm",
                          paper.score > 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          paper.score > 50 ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                          "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        )}>
                          Relevance: {paper.score}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        Key Findings / Abstract
                      </p>
                      {isEditing ? (
                        <textarea 
                          value={paper.abstract || ''}
                          onChange={(e) => handleUpdateResult(paper.id, 'abstract', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 min-h-[120px] leading-relaxed"
                        />
                      ) : (
                        <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                          {paper.abstract || 'No abstract available.'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/50">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Relevance Analysis</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{paper.relevanceExplanation}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Citation (APA Format)</p>
                        {isEditing ? (
                          <textarea 
                            value={paper.citation}
                            onChange={(e) => handleUpdateResult(paper.id, 'citation', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-400 focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[10px] font-mono text-slate-400 leading-relaxed">
                            {paper.citation}
                          </div>
                        )}
                      </div>
                    </div>

                    {paper.url && (
                      <a 
                        href={paper.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
                      >
                        <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                        View Full Paper on Semantic Scholar
                      </a>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800/50 pagination-controls">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing {offset + 1} - {Math.min(offset + LIMIT, totalResults)} of {totalResults} academic results
                  </p>
                  <div className="flex gap-2">
                    <button 
                      disabled={offset === 0 || isOrchestrating}
                      onClick={() => handleStart(Math.max(0, offset - LIMIT))}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button 
                      disabled={offset + LIMIT >= totalResults || isOrchestrating}
                      onClick={() => handleStart(offset + LIMIT)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" />
                  Scoring Mechanism
                </h3>
                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                  <p>Orchestrix uses a multi-factor relevance ranking system:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><span className="text-white font-medium">Semantic Match:</span> Gemini AI analyzes the abstract against your query.</li>
                    <li><span className="text-white font-medium">Citation Impact:</span> Normalized citation counts from Semantic Scholar.</li>
                    <li><span className="text-white font-medium">Recency:</span> Bonus points for papers published in the last 5 years.</li>
                    <li><span className="text-white font-medium">Venue Quality:</span> Ranked based on journal/conference reputation.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  Save to Vault
                </h3>
                <p className="text-xs text-slate-500 mb-4">Persist these findings to a research session in your vault.</p>
                <div className="space-y-3">
                  <select 
                    value={selectedSessionId || ''}
                    onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={saveToVault}
                    disabled={!selectedSessionId || isSaving}
                    className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all border border-slate-700 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Findings'}
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-400" />
                  Export Options
                </h3>
                <p className="text-xs text-slate-500 mb-4">Finalize your research report and download it for your records.</p>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowPDFPrefs(true)}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Generate Final PDF
                  </button>
                  <button 
                    onClick={handleExportState}
                    className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-all border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Export Full Session State
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Preferences Modal */}
          <AnimatePresence>
            {showPDFPrefs && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md bg-[#0a0a0a] border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-400" />
                      PDF Preferences
                    </h3>
                    <button onClick={() => setShowPDFPrefs(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <div>
                        <p className="text-sm font-medium text-white">Include Sources</p>
                        <p className="text-xs text-slate-500">Add source list to the PDF</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={pdfPrefs.includeSources}
                        onChange={(e) => setPdfPrefs(prev => ({ ...prev, includeSources: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                      <div>
                        <p className="text-sm font-medium text-white">Include Citations</p>
                        <p className="text-xs text-slate-500">Add APA citations to the PDF</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={pdfPrefs.includeCitations}
                        onChange={(e) => setPdfPrefs(prev => ({ ...prev, includeCitations: e.target.checked }))}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                      <p className="text-sm font-medium text-white">Font Size</p>
                      <div className="flex gap-2">
                        {(['small', 'medium', 'large'] as const).map(size => (
                          <button
                            key={size}
                            onClick={() => setPdfPrefs(prev => ({ ...prev, fontSize: size }))}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all",
                              pdfPrefs.fontSize === size 
                                ? "bg-indigo-600 text-white" 
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleExportPDF}
                    className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Generate PDF
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function AgentCard({ name, status, icon, role }: { name: string, status: 'idle' | 'working' | 'completed' | 'error', icon: React.ReactNode, role: string }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-500",
      status === 'working' ? "bg-indigo-600/10 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)]" : 
      status === 'completed' ? "bg-emerald-500/5 border-emerald-500/20" :
      status === 'error' ? "bg-rose-500/5 border-rose-500/20" :
      "bg-slate-900/50 border-slate-800"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "p-2 rounded-lg",
          status === 'working' ? "bg-indigo-500 text-white" : 
          status === 'completed' ? "bg-emerald-500 text-white" :
          status === 'error' ? "bg-rose-500 text-white" :
          "bg-slate-800 text-slate-500"
        )}>
          {icon}
        </div>
        {status === 'working' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
        {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
      </div>
      <p className="text-sm font-bold text-white mb-0.5">{name}</p>
      <p className="text-[10px] text-slate-500 mb-2">{role}</p>
      <p className={cn(
        "text-[10px] font-bold uppercase tracking-widest",
        status === 'working' ? "text-indigo-400" : 
        status === 'completed' ? "text-emerald-500" :
        status === 'error' ? "text-rose-400" :
        "text-slate-600"
      )}>
        {status}
      </p>
    </div>
  );
}
