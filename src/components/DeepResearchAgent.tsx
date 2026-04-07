import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Zap, 
  ShieldCheck, 
  BookOpen, 
  ExternalLink, 
  Loader2, 
  FileText, 
  Globe,
  Quote,
  ArrowRight,
  Sparkles,
  Download
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface GroundingSource {
  title: string;
  uri: string;
}

interface ResearchReport {
  query: string;
  content: string;
  sources: GroundingSource[];
  timestamp: string;
}

export default function DeepResearchAgent({ onLog }: { onLog?: (msg: string, data?: any) => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [history, setHistory] = useState<ResearchReport[]>(() => {
    const saved = localStorage.getItem('orchestrix_research_history');
    return saved ? JSON.parse(saved) : [];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('orchestrix_research_history', JSON.stringify(history));
  }, [history]);

  const performResearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setReport(null);
    if (onLog) onLog(`Searching repositories for: ${query}`);

    try {
      const refinedPrompt = `
        Perform authentic, deep research on: "${query}".
        
        Requirements:
        1. Prioritize peer-reviewed papers, technical documentation, and verified data.
        2. Provide a structured report with sections: Executive Summary, Technical Breakthroughs, Current Challenges, and Future Outlook.
        3. Avoid anecdotal evidence or non-verified blog posts.
        4. Include specific data points and metrics where available.
        5. Use a professional, academic tone.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: refinedPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const content = response.text || "No research data could be synthesized.";
      const sources: GroundingSource[] = [];
      
      // Extract grounding sources
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            // Avoid duplicates
            if (!sources.find(s => s.uri === chunk.web.uri)) {
              sources.push({
                title: chunk.web.title,
                uri: chunk.web.uri
              });
            }
          }
        });
      }

      const newReport: ResearchReport = {
        query,
        content,
        sources,
        timestamp: new Date().toISOString()
      };

      setReport(newReport);
      if (onLog) onLog("Research report generated successfully", newReport);
      setHistory(prev => [newReport, ...prev].slice(0, 10));
      setQuery('');
    } catch (err) {
      console.error('Research Error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const exportToPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 44, 52);
    doc.text('ORCHESTRIX: RESEARCH INTELLIGENCE REPORT', 105, 15, { align: 'center' });
    
    // Section 1: RESEARCH SCOPE
    doc.setFontSize(12);
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 25, 190, 10, 'F');
    doc.text(' 1. RESEARCH SCOPE', 12, 32);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Primary Query: ${report.query}`, 12, 42);
    doc.text(`Date: ${new Date(report.timestamp).toLocaleString()}`, 12, 48);
    
    // Section 2: EXECUTIVE SUMMARY
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.rect(10, 58, 190, 10, 'F');
    doc.text(' 2. EXECUTIVE SUMMARY', 12, 65);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Simple markdown to text conversion (removing some common symbols)
    const cleanContent = report.content.replace(/[#*`]/g, '');
    const splitSummary = doc.splitTextToSize(cleanContent, 180);
    doc.text(splitSummary, 12, 75);
    
    // Section 3: ANALYZED DATA SOURCES
    let yPos = 75 + (splitSummary.length * 5) + 15;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos - 7, 190, 10, 'F');
    doc.text(' 3. ANALYZED DATA SOURCES', 12, yPos);
    
    yPos += 10;
    
    report.sources.forEach((source, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${source.title.toUpperCase()}`, 12, yPos);
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const uriLines = doc.splitTextToSize(`Link: ${source.uri}`, 180);
      doc.text(uriLines, 12, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += (uriLines.length * 5) + 5;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated by Orchestrix Platform | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }
    
    doc.save(`Orchestrix_Research_${report.query.substring(0, 20).replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-500" />
          Deep Research Engine
        </h2>
        <p className="text-slate-400">Advanced academic grounding for authentic, peer-reviewed technical data.</p>
      </div>

      {/* Search Input */}
      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-6 shadow-2xl">
        <div className="relative">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performResearch()}
            placeholder="What are the latest breakthroughs in solid-state battery density as of 2025?"
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-32 py-5 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all"
          />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            <Search className="w-6 h-6 text-slate-600" />
          </div>
          <button 
            onClick={performResearch}
            disabled={isSearching || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSearching ? "Researching..." : "Initiate"}
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-6 px-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Globe className="w-3 h-3 text-indigo-500" />
            Advanced Depth
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            Verified Sources
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Quote className="w-3 h-3 text-indigo-500" />
            Academic Tone
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Report Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="absolute -inset-4 border border-indigo-500/10 rounded-3xl animate-[spin_10s_linear_infinite]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Synthesizing Research Report</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Scanning academic repositories and technical documentation for authentic data points...
                  </p>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {report && (
              <motion.div 
                key={report.timestamp}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="bg-indigo-600/5 border-b border-slate-800/50 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Authentic Research Report</h3>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Generated: {new Date(report.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={exportToPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-600/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </button>
                    <button className="p-2 text-slate-500 hover:text-white transition-colors">
                      <Quote className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  <div className="prose prose-invert max-w-none">
                    <div className="mb-8 p-4 bg-slate-900/50 border-l-4 border-indigo-500 rounded-r-xl">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Research Query</p>
                      <p className="text-lg font-medium text-white italic">"{report.query}"</p>
                    </div>
                    
                    <div className="text-slate-300 leading-relaxed space-y-4 markdown-body">
                      <ReactMarkdown>{report.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                {report.sources.length > 0 && (
                  <div className="bg-slate-900/30 border-t border-slate-800/50 p-6">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Grounding Sources & Citations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.sources.map((source, i) => (
                        <a 
                          key={i} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:text-indigo-400">
                              {i + 1}
                            </div>
                            <span className="text-xs font-medium text-slate-400 truncate group-hover:text-slate-200">{source.title}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!report && !isSearching && (
              <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-20 flex flex-col items-center justify-center text-center gap-6 opacity-50">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-400">Engine Ready</h3>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">
                    Enter a research query above to initiate deep academic grounding.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar History */}
        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-6 shadow-xl sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Reports</h4>
              <button 
                onClick={() => setHistory([])}
                className="text-[10px] font-bold text-indigo-400 hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <button 
                    key={i}
                    onClick={() => setReport(h)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all group",
                      report?.timestamp === h.timestamp 
                        ? "bg-indigo-500/10 border-indigo-500/30" 
                        : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <p className={cn(
                      "text-xs font-medium truncate mb-1",
                      report?.timestamp === h.timestamp ? "text-indigo-400" : "text-slate-300"
                    )}>
                      {h.query}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-600 font-mono">{new Date(h.timestamp).toLocaleDateString()}</span>
                      <ArrowRight className={cn(
                        "w-3 h-3 transition-transform group-hover:translate-x-0.5",
                        report?.timestamp === h.timestamp ? "text-indigo-500" : "text-slate-700"
                      )} />
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[10px] text-slate-600 italic">No history yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
