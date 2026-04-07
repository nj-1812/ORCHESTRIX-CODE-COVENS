import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Copy, Download, Check, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Paper {
  id: number;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;
  type: 'journal' | 'conference' | 'techreport';
}

const PAPERS: Paper[] = [
  { id: 1, title: "Attention Is All You Need", authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N.", "Uszkoreit, J.", "Jones, L.", "Gomez, A. N.", "Kaiser, L.", "Polosukhin, I."], year: 2017, journal: "Advances in Neural Information Processing Systems", volume: "30", pages: "5998–6008", doi: "10.48550/arXiv.1706.03762", publisher: "Curran Associates", type: "conference" },
  { id: 2, title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding", authors: ["Devlin, J.", "Chang, M.-W.", "Lee, K.", "Toutanova, K."], year: 2019, journal: "Proceedings of NAACL-HLT 2019", volume: "1", pages: "4171–4186", doi: "10.18653/v1/N19-1423", publisher: "Association for Computational Linguistics", type: "conference" },
  { id: 3, title: "Deep Residual Learning for Image Recognition", authors: ["He, K.", "Zhang, X.", "Ren, S.", "Sun, J."], year: 2016, journal: "Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition", volume: "", pages: "770–778", doi: "10.1109/CVPR.2016.90", publisher: "IEEE", type: "conference" },
  { id: 4, title: "Generative Adversarial Nets", authors: ["Goodfellow, I.", "Pouget-Abadie, J.", "Mirza, M.", "Xu, B.", "Warde-Farley, D.", "Ozair, S.", "Courville, A.", "Bengio, Y."], year: 2014, journal: "Advances in Neural Information Processing Systems", volume: "27", pages: "2672–2680", doi: "10.48550/arXiv.1406.2661", publisher: "Curran Associates", type: "conference" },
  { id: 5, title: "GPT-4 Technical Report", authors: ["OpenAI"], year: 2023, journal: "arXiv preprint", volume: "", pages: "", doi: "10.48550/arXiv.2303.08774", publisher: "OpenAI", type: "techreport" },
];

export default function CitationEngine() {
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const [currentStyle, setCurrentStyle] = useState<'APA' | 'MLA' | 'IEEE' | 'Chicago'>('APA');
  const [exportFormat, setExportFormat] = useState<'txt' | 'bib'>('txt');
  const [exportStyles, setExportStyles] = useState<Set<string>>(new Set(['APA', 'MLA']));
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const formatAuthorsAPA = (authors: string[]) => {
    if (authors.length === 1) return authors[0];
    if (authors.length > 20) return authors.slice(0, 19).join(', ') + ', . . . ' + authors[authors.length - 1];
    const last = authors[authors.length - 1];
    return authors.slice(0, -1).join(', ') + ', & ' + last;
  };

  const cite_APA = (p: Paper) => {
    const auth = formatAuthorsAPA(p.authors);
    const doi = p.doi ? ` https://doi.org/${p.doi}` : '';
    if (p.type === 'journal') return `${auth} (${p.year}). ${p.title}. *${p.journal}*, *${p.volume}*${p.issue ? `(${p.issue})` : ''}, ${p.pages}.${doi}`;
    if (p.type === 'conference') return `${auth} (${p.year}). ${p.title}. In *${p.journal}*${p.pages ? ` (pp. ${p.pages})` : ''}. ${p.publisher}.${doi}`;
    return `${auth} (${p.year}). *${p.title}*.${doi}`;
  };

  const generateCitation = (paper: Paper, style: string) => {
    switch(style) {
      case 'APA': return cite_APA(paper);
      default: return cite_APA(paper); // Simplified for demo
    }
  };

  const togglePaper = (id: number) => {
    const next = new Set(selectedPapers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPapers(next);
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text.replace(/\*/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    let content = '';
    const ids = Array.from(selectedPapers);
    if (exportFormat === 'txt') {
      content = ids.map((id, idx) => {
        const paper = PAPERS.find(p => p.id === id)!;
        return `[${idx + 1}] ${paper.title}\nAPA: ${cite_APA(paper).replace(/\*/g, '')}`;
      }).join('\n\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citations.txt';
      a.click();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-1 bg-[#0a0a0a] border border-slate-800/50 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discovery Queue</span>
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold">{selectedPapers.size} selected</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PAPERS.map(paper => (
            <div 
              key={paper.id}
              onClick={() => togglePaper(paper.id)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group",
                selectedPapers.has(paper.id) ? "bg-indigo-500/5 border-indigo-500/30" : "bg-slate-900/50 border-slate-800/50 hover:border-slate-700"
              )}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                  selectedPapers.has(paper.id) ? "bg-indigo-500 border-indigo-500" : "bg-slate-900 border-slate-700"
                )}>
                  {selectedPapers.has(paper.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{paper.title}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{paper.authors.join(', ')}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">{paper.year}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700 uppercase">{paper.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/50 rounded-2xl flex flex-col overflow-hidden">
        <div className="flex border-b border-slate-800/50">
          {(['APA', 'MLA', 'IEEE', 'Chicago'] as const).map(style => (
            <button 
              key={style}
              onClick={() => setCurrentStyle(style)}
              className={cn(
                "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                currentStyle === style ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" : "text-slate-500 border-transparent hover:text-slate-300"
              )}
            >
              {style}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedPapers.size === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <FileText className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">Select papers from the queue to generate citations</p>
            </div>
          ) : (
            Array.from(selectedPapers).map((id, idx) => {
              const paper = PAPERS.find(p => p.id === id)!;
              const citation = cite_APA(paper);
              return (
                <motion.div 
                  key={id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2 bg-slate-900 border-b border-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                      <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">{paper.title}</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(citation, id)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedId === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 text-sm text-slate-300 font-mono leading-relaxed">
                    {citation.split('*').map((part, i) => i % 2 === 1 ? <em key={i} className="text-indigo-400 not-italic">{part}</em> : part)}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div className="lg:col-span-1 bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 flex flex-col">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Bulk Export</h3>
        
        <div className="space-y-6 flex-1">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Styles</p>
            {['APA', 'MLA', 'IEEE', 'Chicago'].map(style => (
              <label key={style} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={exportStyles.has(style)}
                  onChange={() => {
                    const next = new Set(exportStyles);
                    if (next.has(style)) next.delete(style);
                    else next.add(style);
                    setExportStyles(next);
                  }}
                  className="hidden"
                />
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  exportStyles.has(style) ? "bg-indigo-500 border-indigo-500" : "bg-slate-900 border-slate-800 group-hover:border-slate-600"
                )}>
                  {exportStyles.has(style) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className={cn("text-xs font-medium transition-colors", exportStyles.has(style) ? "text-white" : "text-slate-500")}>{style}</span>
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Format</p>
            <div className="flex gap-2">
              {(['txt', 'bib'] as const).map(fmt => (
                <button 
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                    exportFormat === fmt ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"
                  )}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/50 space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-600 uppercase">Selected</span>
              <span className="text-white">{selectedPapers.size} papers</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-600 uppercase">Styles</span>
              <span className="text-white">{exportStyles.size} included</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleExport}
          disabled={selectedPapers.size === 0 || exportStyles.size === 0}
          className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
        >
          <Download className="w-4 h-4" /> Download Export
        </button>
      </div>
    </div>
  );
}
