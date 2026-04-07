import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, X, Zap, ChevronRight } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { pdfSummarizerAgent, conflictResolutionAgent, crossPaperSynthesisAgent, conflictResolutionOrchestrator } from '../services/geminiService';
import { cn } from '../lib/utils';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AnalysisResult {
  title: string;
  analysis: {
    abstract: string;
    contributions: string[];
    methodology: string;
    limitations: string[];
    sentiment: string;
  };
  criticalAnalysis?: {
    criticalReview: string;
    evidenceStrength: string;
    sentiment: string;
  };
  conflict?: {
    message: string;
    details: any;
  };
}

export default function PDFSummarizer() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [synthesis, setSynthesis] = useState<any>(null);
  const [crossPaperConflict, setCrossPaperConflict] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Limit to first 15 pages to manage context window
    const numPages = Math.min(pdf.numPages, 15);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setResults([]);
    setSynthesis(null);
    setCrossPaperConflict(null);

    try {
      const analyses: AnalysisResult[] = [];
      
      for (const file of files) {
        const text = await extractTextFromPDF(file);
        const orchestratorResult = await conflictResolutionOrchestrator(file.name, text);
        
        if (orchestratorResult.status === "CONFLICT_DETECTED") {
          analyses.push({ 
            title: file.name, 
            analysis: orchestratorResult.details.summarizer_view,
            criticalAnalysis: orchestratorResult.details.analyzer_view,
            conflict: {
              message: orchestratorResult.message,
              details: orchestratorResult.details
            }
          });
        } else {
          analyses.push({ 
            title: file.name, 
            analysis: orchestratorResult.data,
            criticalAnalysis: orchestratorResult.analysis
          });
        }
      }
      
      setResults(analyses);

      // --- STEP 2: Cross-Paper Synthesis (if 2+ papers) ---
      if (analyses.length >= 2) {
        const report = await conflictResolutionAgent(
          JSON.stringify(analyses[0].analysis),
          JSON.stringify(analyses[1].analysis)
        );
        setCrossPaperConflict(report);

        const synth = await crossPaperSynthesisAgent(analyses);
        setSynthesis(synth);
      }
    } catch (err) {
      console.error('PDF Processing Error:', err);
      setError('Failed to process PDFs. Please ensure they are valid research papers.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-8">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-12 hover:border-indigo-500/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf" className="hidden" />
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 transition-all">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Upload Research PDFs</h3>
          <p className="text-sm text-slate-500 text-center max-w-xs">Drag and drop your academic papers here. We'll extract and summarize the core findings.</p>
        </div>

        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Files ({files.length})</span>
              <button onClick={() => setFiles([])} className="text-xs text-red-400 font-bold hover:underline">Clear All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl group">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm text-slate-300 truncate flex-1">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={processFiles}
              disabled={isProcessing}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isProcessing ? 'Analyzing Papers...' : 'Start Multi-Agent Analysis'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {crossPaperConflict && crossPaperConflict.hasConflict && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4 text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Cross-Paper Conflict Detected</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-amber-500/50 uppercase tracking-wider">Contradictions</p>
                    <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                      {crossPaperConflict.conflicts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unified Synthesis</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{crossPaperConflict.unifiedView}</p>
                  </div>
                </div>
              </div>
            )}

            {synthesis && (
              <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-indigo-400" />
                  Cross-Paper Synthesis
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <p className="text-slate-300 leading-relaxed text-lg">{synthesis.synthesisParagraph}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Common Themes</h4>
                        <ul className="space-y-2">
                          {synthesis.commonThemes.map((t: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Contradictions</h4>
                        <ul className="space-y-2">
                          {synthesis.contradictions.map((t: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Research Gaps</h4>
                    <ul className="space-y-4">
                      {synthesis.researchGaps.map((g: string, i: number) => (
                        <li key={i} className="text-sm text-slate-400 leading-relaxed flex gap-3">
                          <span className="text-indigo-500 font-bold">0{i+1}</span> {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {results.map((res, idx) => (
                <div key={idx} className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white truncate max-w-[250px]">{res.title}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Individual Analysis</p>
                    </div>
                  </div>

                  {res.conflict && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Agent Conflict</p>
                        <p className="text-[11px] text-slate-400">{res.conflict.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Abstract Compression</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{res.analysis.abstract}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Methodology</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{res.analysis.methodology}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest mb-2">Contributions</h4>
                        <ul className="text-[11px] text-slate-500 space-y-1">
                          {res.analysis.contributions.map((c, i) => <li key={i}>• {c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest mb-2">Limitations</h4>
                        <ul className="text-[11px] text-slate-500 space-y-1">
                          {res.analysis.limitations.map((c, i) => <li key={i}>• {c}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
