import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Zap, 
  Link as LinkIcon,
  Globe,
  FileCode,
  Save,
  ArrowRight
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import { universalSummarizerAgent } from '../services/geminiService';
import { cn } from '../lib/utils';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  synthesis: string;
  conclusions: string;
  metadata?: {
    sourceType: string;
    estimatedReadTime: string;
  };
}

export default function SummarizerAgent() {
  const [source, setSource] = useState<string>('');
  const [isUrl, setIsUrl] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const numPages = Math.min(pdf.numPages, 20);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromTxt = async (file: File): Promise<string> => {
    return await file.text();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsUrl(false);
      setSource(selectedFile.name);
    }
  };

  const handleSummarize = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      let content = source;
      let finalIsUrl = isUrl;

      if (!isUrl && file) {
        if (file.name.endsWith('.pdf')) {
          content = await extractTextFromPDF(file);
        } else if (file.name.endsWith('.docx')) {
          content = await extractTextFromDocx(file);
        } else if (file.name.endsWith('.txt')) {
          content = await extractTextFromTxt(file);
        } else {
          throw new Error('Unsupported file format. Please use PDF, DOCX, or TXT.');
        }
      } else if (isUrl) {
        if (!source.startsWith('http')) {
          throw new Error('Please enter a valid URL starting with http:// or https://');
        }
      }

      const summary = await universalSummarizerAgent(content, finalIsUrl);
      setResult(summary);
    } catch (err: any) {
      console.error('Summarization Error:', err);
      setError(err.message || 'Failed to summarize the source.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToVault = async () => {
    if (!result) return;
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Summary: ${source}`,
          content: `## Summary\n${result.summary}\n\n## Key Points\n${result.keyPoints.map(p => `- ${p}`).join('\n')}\n\n## Conclusions\n${result.conclusions}`,
          tags: ['summary', isUrl ? 'url' : 'file'],
          color: '#4f46e5'
        })
      });
      if (response.ok) {
        alert('Saved to Research Vault!');
      }
    } catch (err) {
      console.error('Save Error:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Zap className="w-8 h-8 text-indigo-500" />
          Summarizing Agent
        </h2>
        <p className="text-slate-400">Intelligent data synthesis from any URL or document.</p>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 space-y-6">
        <div className="flex p-1 bg-slate-900/50 rounded-xl w-fit">
          <button 
            onClick={() => setIsUrl(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              isUrl ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            URL / Website
          </button>
          <button 
            onClick={() => setIsUrl(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              !isUrl ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            File Upload
          </button>
        </div>

        <div className="space-y-4">
          {isUrl ? (
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:border-indigo-500/50 outline-none transition-all"
              />
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.docx,.txt" 
                className="hidden" 
              />
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:bg-indigo-500/10 transition-all">
                {file ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Upload className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">{file ? file.name : 'Choose a file'}</p>
                <p className="text-xs text-slate-500">PDF, DOCX, or TXT (max 10MB)</p>
              </div>
            </div>
          )}

          <button 
            onClick={handleSummarize}
            disabled={isProcessing || (!isUrl && !file) || (isUrl && !source)}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            {isProcessing ? 'Processing Source...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Analysis Result</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Generated by Gemini-3-Flash</p>
                  </div>
                </div>
                <button 
                  onClick={saveToVault}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Save className="w-4 h-4" /> Save to Vault
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Executive Summary</h4>
                  <p className="text-slate-300 leading-relaxed text-lg">{result.summary}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Thematic Synthesis</h4>
                  <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <p className="text-slate-300 leading-relaxed">{result.synthesis}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Key Findings</h4>
                    <ul className="space-y-3">
                      {result.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-400 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Conclusions</h4>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{result.conclusions}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
