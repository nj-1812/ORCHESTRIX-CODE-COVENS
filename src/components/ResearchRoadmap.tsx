import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Map, 
  BookOpen, 
  Lightbulb, 
  Search, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Target
} from 'lucide-react';
import { cn } from '../lib/utils';
import { roadmapAgent } from '../services/geminiService';
import type { ResearchRoadmap as RoadmapData, TrendDataContract } from '../types';

export default function ResearchRoadmap({ trendData, onLog }: { trendData?: TrendDataContract | null, onLog?: (msg: string, data?: any) => void }) {
  const [query, setQuery] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setLoading(true);
    if (onLog) onLog("Generating structured research path with agent routing.", { query, trendDataConnected: !!trendData });
    try {
      const data = await roadmapAgent(query, trendData || undefined, userNotes);
      if (onLog) onLog("Research roadmap generated successfully", data);
      setRoadmap(data);
    } catch (error) {
      console.error('Error generating roadmap:', error);
      if (onLog) onLog("Roadmap generation failed", { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Map className="w-8 h-8 text-indigo-400" />
            Research Roadmap
          </h2>
          <p className="text-slate-400">Generate a strategic path for your academic exploration.</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your research topic (e.g., Quantum Machine Learning in Healthcare)"
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-white placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !query.trim()}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Generate Roadmap
              </>
            )}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">User Notes & Constraints</label>
          <textarea
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Add specific focus areas, constraints, or context (e.g., Focus on healthcare applications and low-power hardware.)"
            className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl focus:border-indigo-500/50 outline-none transition-all text-sm text-slate-300 placeholder:text-slate-700 resize-none h-24"
          />
        </div>

        {trendData && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Trend Data Connected</p>
                <p className="text-[10px] text-slate-500">Analysis Agent v{trendData.metadata.version} payload active</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                {trendData.analysis_payload.key_trends.length} Trends
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                {trendData.analysis_payload.unresolved_questions.length} Gaps
              </span>
            </div>
          </div>
        )}
      </div>

      {roadmap && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Roadmap Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: Foundational Papers */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Foundational Papers</h3>
                  <p className="text-sm text-slate-500">{roadmap.roadmap.section_1_foundational_papers.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {roadmap.roadmap.section_1_foundational_papers.papers.map((paper) => (
                  <motion.div 
                    key={paper.paper_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: paper.rank * 0.1 }}
                    className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-indigo-400">
                        {paper.rank}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{paper.title}</h4>
                          <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            {paper.year}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed italic">"{paper.why_foundational}"</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {paper.citation_count.toLocaleString()} citations
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {paper.estimated_read_time_hours}h est. read time
                          </div>
                          {paper.read_before.length > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-400/80">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Prerequisite for {paper.read_before.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Section 2: Gap Areas */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Research Gaps & Opportunities</h3>
                  <p className="text-sm text-slate-500">{roadmap.roadmap.section_2_gap_areas.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.roadmap.section_2_gap_areas.gaps.map((gap) => (
                  <motion.div 
                    key={gap.gap_id}
                    className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        gap.difficulty === 'high' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        gap.difficulty === 'medium' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {gap.difficulty} Difficulty
                      </div>
                      <div className="flex items-center gap-1 text-indigo-400 font-mono text-xs">
                        <Target className="w-3 h-3" />
                        Score: {gap.opportunity_score}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">{gap.gap_title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{gap.gap_description}</p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-800/50 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Evidence Base</div>
                      <div className="flex flex-wrap gap-2">
                        {gap.evidence_from_papers.map(id => (
                          <span key={id} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Next Queries */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-400" />
                  Next Steps
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  {roadmap.roadmap.section_3_next_query_suggestions.description}
                </p>
                <div className="space-y-4">
                  {roadmap.roadmap.section_3_next_query_suggestions.queries.map((q) => (
                    <div key={q.query_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                          q.priority === 'high' ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-400"
                        )}>
                          {q.priority}
                        </span>
                        <div className="flex gap-1">
                          {q.expected_paper_types.map(type => (
                            <span key={type} className="text-[9px] text-slate-500 bg-slate-800 px-1 rounded uppercase">{type}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white bg-slate-900 p-2 rounded border border-slate-800 flex flex-col gap-2 group cursor-pointer hover:border-indigo-500/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <code className="text-indigo-300">{q.query_text}</code>
                          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400/70 uppercase tracking-tighter">
                          <Zap className="w-2.5 h-2.5" />
                          Trigger {q.trigger_agent} Agent
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        {q.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  <AlertCircle className="w-4 h-4" />
                  Metadata
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Generated</span>
                    <span className="text-slate-300">{new Date(roadmap.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Trend Report</span>
                    <span className={roadmap.received_trend_report ? "text-emerald-400" : "text-amber-400"}>
                      {roadmap.received_trend_report ? "Verified" : "Missing"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Contract</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!roadmap && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center">
            <Map className="w-10 h-10 text-slate-700" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">No Roadmap Generated</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter a research topic above to generate a strategic roadmap including foundational papers, gap analysis, and next steps.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
