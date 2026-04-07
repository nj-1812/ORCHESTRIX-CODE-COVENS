import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, ExternalLink, ChevronRight, ChevronLeft, Zap, FileText, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { pdfSummarizerAgent, crossPaperSynthesisAgent } from '../services/geminiService';

interface Paper {
  source: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string;
  citationCount: number | null;
  url: string | null;
  doi: string | null;
  score?: number;
  relevanceScore?: number;
}

export default function DiscoveryAgent() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [minYear, setMinYear] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<number, boolean>>({});
  
  const [summaries, setSummaries] = useState<Record<number, any>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<number, boolean>>({});
  const [synthesis, setSynthesis] = useState<any>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return "Unknown Authors";
    const names = authors.slice(0, 3).map(a => typeof a === 'string' ? a : (a.name || a.display_name || "Unknown"));
    let authorStr = names.join(', ');
    if (authors.length > 3) authorStr += " et al.";
    return authorStr;
  };

  const scoreResult = (paper: Paper, queryTerms: string[], maxRelevance: number) => {
    const currentYear = new Date().getFullYear();
    
    // 1. Normalized Relevance Score
    // If API doesn't provide relevanceScore, calculate a proxy based on query match
    let relScoreRaw = paper.relevanceScore;
    if (relScoreRaw === undefined) {
      const title = (paper.title ?? '').toLowerCase();
      const abstract = (paper.abstract ?? '').toLowerCase();
      let matchBonus = 0;
      for (const term of queryTerms) {
        if (title.includes(term)) matchBonus += 10;
        if (abstract.includes(term)) matchBonus += 5;
      }
      relScoreRaw = matchBonus;
    }
    
    const relScore = maxRelevance > 0 ? (relScoreRaw / maxRelevance) : 0;

    // 2. Citation Impact (log1p normalization)
    const citations = paper.citationCount ?? 0;
    const citeScore = Math.min(1.0, Math.log1p(citations) / Math.log1p(1000));

    // 3. Recency Score
    const year = paper.year ?? (currentYear - 10);
    const age = currentYear - year;
    const recencyScore = Math.max(0, 1 - (age / 15));

    // Weighted sum: (Relevance * 0.5) + (Citations * 0.3) + (Recency * 0.2)
    const finalRank = (relScore * 0.5) + (citeScore * 0.3) + (recencyScore * 0.2);
    
    return Math.round(finalRank * 100);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSummaries({});
    setSynthesis(null);

    try {
      const endpoints = [];
      if (source === 'all' || source === 'semantic') {
        endpoints.push(`/api/academic/search?query=${encodeURIComponent(query)}&offset=${(page - 1) * perPage}&limit=${perPage}`);
      }
      if (source === 'all' || source === 'openalex') {
        endpoints.push(`/api/openalex/search?query=${encodeURIComponent(query)}&perPage=${perPage}&page=${page}${minYear ? `&minYear=${minYear}` : ''}`);
      }
      if (source === 'all' || source === 'arxiv') {
        endpoints.push(`/api/arxiv/search?query=${encodeURIComponent(query)}&maxResults=${perPage}`);
      }

      const responses = await Promise.all(endpoints.map(async (url) => {
        try {
          const r = await fetch(url);
          if (!r.ok) {
            const errData = await r.json().catch(() => ({}));
            const s = url.includes('academic') ? 'semantic' : url.includes('openalex') ? 'openalex' : 'arxiv';
            
            // Special handling for 429
            if (r.status === 429) {
              return { 
                error: true, 
                source: s, 
                isRateLimit: true,
                message: `Rate limit exceeded for ${s === 'semantic' ? 'Semantic Scholar' : s === 'openalex' ? 'OpenAlex' : 'arXiv'}. Please wait a moment or add an API key in settings.` 
              };
            }
            
            return { error: true, source: s, message: errData.error || `Source failed: ${s}` };
          }
          return r.json();
        } catch (err) {
          const s = url.includes('academic') ? 'semantic' : url.includes('openalex') ? 'openalex' : 'arxiv';
          return { error: true, source: s, message: 'Network error' };
        }
      }));
      
      let allPapers: Paper[] = [];
      let sourceErrors: string[] = [];
      let rateLimitError: string | null = null;

      responses.forEach((data, idx) => {
        const url = endpoints[idx];
        const s = url.includes('academic') ? 'semantic' : url.includes('openalex') ? 'openalex' : 'arxiv';
        
        if (data.error) {
          if (data.isRateLimit) rateLimitError = data.message;
          sourceErrors.push(s === 'semantic' ? 'Semantic Scholar' : s === 'openalex' ? 'OpenAlex' : 'arXiv');
          return;
        }

        if (s === 'semantic') {
          allPapers = allPapers.concat((data.data || []).map((p: any) => ({
            source: 'semantic',
            title: p.title,
            authors: formatAuthors(p.authors || []),
            year: p.year,
            abstract: p.abstract || '',
            citationCount: p.citationCount || 0,
            url: p.url,
            doi: p.externalIds?.DOI,
            relevanceScore: p.relevanceScore
          })));
        } else if (s === 'openalex') {
          allPapers = allPapers.concat((data.results || []).map((p: any) => ({
            source: 'openalex',
            title: p.title,
            authors: formatAuthors(p.authors || []),
            year: p.year,
            abstract: '', 
            citationCount: 0,
            url: p.link,
            doi: null,
            relevanceScore: undefined // OpenAlex doesn't provide a direct relevance score in this format
          })));
        } else if (s === 'arxiv') {
          allPapers = allPapers.concat((data.results || []).map((p: any) => ({
            source: 'arxiv',
            title: p.title,
            authors: formatAuthors(p.authors || []),
            year: null, 
            abstract: p.summary || '',
            citationCount: 0,
            url: p.link,
            doi: null,
            relevanceScore: undefined
          })));
        }
      });

      if (sourceErrors.length > 0 && allPapers.length === 0) {
        setError(rateLimitError || `Failed to fetch from: ${sourceErrors.join(', ')}. Please try again later.`);
        setLoading(false);
        return;
      }

      if (sourceErrors.length > 0) {
        console.warn(`Some sources failed: ${sourceErrors.join(', ')}`);
        // We still have some papers, so we don't block the UI with a hard error
      }

      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      
      // Calculate proxy relevance for papers that don't have it
      const papersWithProxyRel = allPapers.map(p => {
        if (p.relevanceScore !== undefined) return p;
        const title = (p.title ?? '').toLowerCase();
        const abstract = (p.abstract ?? '').toLowerCase();
        let matchBonus = 0;
        for (const term of queryTerms) {
          if (title.includes(term)) matchBonus += 10;
          if (abstract.includes(term)) matchBonus += 5;
        }
        return { ...p, relevanceScore: matchBonus };
      });

      const maxRelevance = Math.max(...papersWithProxyRel.map(r => r.relevanceScore ?? 0), 1);
      
      const scored = papersWithProxyRel.map(p => ({
        ...p,
        score: scoreResult(p, queryTerms, maxRelevance)
      }));

      if (sortBy === 'citations') {
        scored.sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
      } else if (sortBy === 'year') {
        scored.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      } else {
        scored.sort((a, b) => (b.score || 0) - (a.score || 0));
      }

      setResults(scored);
    } catch (err) {
      setError('Failed to fetch research papers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const summarizePaper = async (idx: number, paper: Paper) => {
    if (summaries[idx]) return;
    setLoadingSummaries(prev => ({ ...prev, [idx]: true }));
    try {
      const summary = await pdfSummarizerAgent(paper.title, paper.abstract || 'No abstract available.');
      setSummaries(prev => ({ ...prev, [idx]: summary }));
    } catch (err) {
      console.error('Summarization error:', err);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [idx]: false }));
    }
  };

  const synthesizeResults = async () => {
    if (results.length === 0) return;
    setLoadingSynthesis(true);
    try {
      const papersForSynthesis = results.slice(0, 5).map(p => ({
        title: p.title,
        analysis: { abstract: p.abstract }
      }));
      const synth = await crossPaperSynthesisAgent(papersForSynthesis);
      setSynthesis(synth);
    } catch (err) {
      console.error('Synthesis error:', err);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search academic databases..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <select 
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Sources</option>
            <option value="semantic">Semantic Scholar</option>
            <option value="openalex">OpenAlex</option>
            <option value="arxiv">arXiv</option>
          </select>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min Year</label>
            <input 
              type="number" 
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              placeholder="e.g. 2020"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="relevance">Relevance Score</option>
              <option value="citations">Citations</option>
              <option value="year">Newest First</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Results Per Page</label>
            <select 
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <Zap className="w-5 h-5" /> {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex justify-end">
          <button 
            onClick={synthesizeResults}
            disabled={loadingSynthesis}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-sm hover:bg-indigo-600/20 transition-all disabled:opacity-50"
          >
            {loadingSynthesis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Synthesize Top Results
          </button>
        </div>
      )}

      <AnimatePresence>
        {synthesis && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-8 overflow-hidden relative"
          >
            <button onClick={() => setSynthesis(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Cross-Paper Synthesis
            </h3>
            <div className="space-y-6">
              <p className="text-slate-300 leading-relaxed text-lg">{synthesis.synthesisParagraph}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Research Gaps</h4>
                  <ul className="space-y-2">
                    {synthesis.researchGaps.map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {results.map((paper, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  paper.source === 'semantic' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : 
                  paper.source === 'openalex' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {paper.source}
                </span>
                {paper.year && <span className="text-xs text-slate-500">{paper.year}</span>}
                <span className="text-xs text-slate-500">{paper.citationCount} citations</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-2xl font-bold text-indigo-400">#{idx + 1}</div>
                <div className="text-[10px] text-slate-600 uppercase font-bold">Score: {paper.score}</div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
              {paper.url ? <a href={paper.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">{paper.title} <ExternalLink className="w-4 h-4" /></a> : paper.title}
            </h3>
            <p className="text-sm text-slate-400 mb-4 italic">{paper.authors}</p>
            
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => summarizePaper(idx, paper)}
                disabled={loadingSummaries[idx]}
                className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                {loadingSummaries[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                {summaries[idx] ? 'Summary Generated' : 'Summarize with AI'}
              </button>
            </div>

            <AnimatePresence>
              {summaries[idx] && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4"
                >
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Abstract Compression</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{summaries[idx].abstract}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest mb-1">Key Contributions</h4>
                      <ul className="text-[11px] text-slate-400 space-y-1">
                        {summaries[idx].contributions.map((c: string, i: number) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest mb-1">Limitations</h4>
                      <ul className="text-[11px] text-slate-400 space-y-1">
                        {summaries[idx].limitations.map((c: string, i: number) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {paper.abstract && (
              <div className="relative">
                <p className={cn(
                  "text-sm text-slate-500 leading-relaxed",
                  !expandedAbstracts[idx] && "line-clamp-3"
                )}>
                  {paper.abstract}
                </p>
                <button 
                  onClick={() => setExpandedAbstracts(prev => ({ ...prev, [idx]: !prev[idx] }))}
                  className="text-xs text-indigo-400 mt-2 font-bold hover:underline"
                >
                  {expandedAbstracts[idx] ? 'Show Less' : 'Read Abstract'}
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="flex items-center justify-between pt-8">
          <button 
            onClick={() => { setPage(p => Math.max(1, p - 1)); handleSearch(); }}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 hover:text-white disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button 
            onClick={() => { setPage(p => p + 1); handleSearch(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 hover:text-white"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
