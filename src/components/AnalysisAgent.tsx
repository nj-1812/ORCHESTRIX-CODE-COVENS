import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  Tag, 
  Award, 
  Database, 
  Upload, 
  X, 
  Zap, 
  Activity,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Send
} from "lucide-react";
import { cn } from "../lib/utils";
import { analysisAgent } from "../services/geminiService";
import type { TrendDataContract, Paper } from "../types";

// ── Sample seed data ──────────────────────────────────────────────────────────
const SEED_DATA = [
  { title: "Transformer Architectures for NLP", authors: ["Vaswani, A.", "Shazeer, N."], institution: "Google Brain", year: 2017, keywords: ["transformers","attention","NLP","deep learning"], citations: 42000 },
  { title: "BERT: Pre-training Deep Bidirectional Transformers", authors: ["Devlin, J.", "Chang, M."], institution: "Google AI", year: 2018, keywords: ["BERT","pre-training","NLP","language model"], citations: 35000 },
  { title: "GPT-3: Language Models are Few-Shot Learners", authors: ["Brown, T.", "Mann, B.", "Ryder, N."], institution: "OpenAI", year: 2020, keywords: ["GPT","few-shot","language model","generation"], citations: 28000 },
  { title: "Diffusion Models Beat GANs on Image Synthesis", authors: ["Dhariwal, P.", "Nichol, A."], institution: "OpenAI", year: 2021, keywords: ["diffusion","GANs","image synthesis","generative"], citations: 8200 },
  { title: "Attention Is All You Need", authors: ["Vaswani, A.", "Parmar, N."], institution: "Google Brain", year: 2017, keywords: ["attention","transformers","sequence","NLP"], citations: 51000 },
  { title: "ResNet: Deep Residual Learning", authors: ["He, K.", "Zhang, X."], institution: "Microsoft Research", year: 2016, keywords: ["ResNet","residual learning","image classification","CNN"], citations: 62000 },
  { title: "Graph Neural Networks: A Review", authors: ["Wu, Z.", "Pan, S."], institution: "UTS", year: 2020, keywords: ["GNN","graph","neural networks","survey"], citations: 4100 },
  { title: "Contrastive Learning for Visual Representation", authors: ["Chen, T.", "Kornblith, S."], institution: "Google Brain", year: 2020, keywords: ["contrastive learning","self-supervised","vision","representation"], citations: 9800 },
  { title: "Vision Transformers (ViT)", authors: ["Dosovitskiy, A.", "Beyer, L."], institution: "Google Research", year: 2021, keywords: ["ViT","vision","transformers","image recognition"], citations: 14000 },
  { title: "CLIP: Learning Transferable Visual Models", authors: ["Radford, A.", "Kim, J.W."], institution: "OpenAI", year: 2021, keywords: ["CLIP","multimodal","vision","language"], citations: 16000 },
  { title: "Stable Diffusion Latent Space", authors: ["Rombach, R.", "Blattmann, A."], institution: "LMU Munich", year: 2022, keywords: ["diffusion","latent space","image","generation"], citations: 7300 },
  { title: "LLaMA: Open Foundation Language Models", authors: ["Touvron, H.", "Lavril, T."], institution: "Meta AI", year: 2023, keywords: ["LLaMA","open source","language model","foundation"], citations: 6100 },
  { title: "Reinforcement Learning from Human Feedback", authors: ["Ouyang, L.", "Wu, J."], institution: "OpenAI", year: 2022, keywords: ["RLHF","reinforcement learning","alignment","language model"], citations: 5400 },
  { title: "Chain-of-Thought Prompting in LLMs", authors: ["Wei, J.", "Wang, X."], institution: "Google Research", year: 2022, keywords: ["chain-of-thought","prompting","reasoning","LLM"], citations: 4800 },
  { title: "Mamba: Linear-Time Sequence Modeling", authors: ["Gu, A.", "Dao, T."], institution: "CMU", year: 2023, keywords: ["Mamba","SSM","sequence","efficiency"], citations: 2100 },
  { title: "Retrieval-Augmented Generation (RAG)", authors: ["Lewis, P.", "Perez, E."], institution: "Meta AI", year: 2020, keywords: ["RAG","retrieval","generation","knowledge"], citations: 6700 },
  { title: "AlphaFold Protein Structure Prediction", authors: ["Jumper, J.", "Evans, R."], institution: "DeepMind", year: 2021, keywords: ["AlphaFold","protein folding","biology","deep learning"], citations: 19000 },
  { title: "Neural Architecture Search Survey", authors: ["Elsken, T.", "Metzen, J."], institution: "Bosch", year: 2019, keywords: ["NAS","architecture search","AutoML","efficiency"], citations: 3200 },
  { title: "Federated Learning: Challenges and Methods", authors: ["Li, T.", "Sahu, A."], institution: "CMU", year: 2020, keywords: ["federated learning","privacy","distributed","optimization"], citations: 4400 },
  { title: "Mixture of Experts Scaling", authors: ["Fedus, W.", "Zoph, B."], institution: "Google Brain", year: 2022, keywords: ["MoE","scaling","efficiency","language model"], citations: 3900 },
  { title: "Instruction Tuning for LLMs", authors: ["Wei, J.", "Bosma, M."], institution: "Google Research", year: 2022, keywords: ["instruction tuning","fine-tuning","LLM","alignment"], citations: 5100 },
  { title: "Segment Anything Model (SAM)", authors: ["Kirillov, A.", "Mintun, E."], institution: "Meta AI", year: 2023, keywords: ["SAM","segmentation","vision","foundation model"], citations: 3800 },
  { title: "Flash Attention: Fast Memory-Efficient Attention", authors: ["Dao, T.", "Fu, D."], institution: "Stanford", year: 2022, keywords: ["attention","efficiency","memory","transformers"], citations: 2900 },
  { title: "Reward Modeling for AI Alignment", authors: ["Ziegler, D.", "Stiennon, N."], institution: "OpenAI", year: 2019, keywords: ["reward model","alignment","RLHF","language model"], citations: 3600 },
];

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLORS = ["#818cf8", "#fb7185", "#fbbf24", "#34d399", "#a78bfa", "#f472b6", "#38bdf8", "#fb923c"];
const ACCENT = "#818cf8";
const BORDER = "rgba(148, 163, 184, 0.1)";

// ── Utility helpers ────────────────────────────────────────────────────────────
const freq = (arr: any[]) => arr.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {} as Record<string, number>);
const topN = (obj: Record<string, number>, n: number) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-xl p-3 shadow-xl backdrop-blur-md">
      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color || ACCENT }}>
          {formatter ? formatter(p.name, p.value) : `${p.name}: ${p.value?.toLocaleString()}`}
        </p>
      ))}
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: { label: string, value: string | number, sub?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 flex-1 hover:border-slate-700 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <div className="p-2 rounded-lg bg-slate-900 text-slate-500 group-hover:text-indigo-400 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight font-mono">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, badge, children, className }: { title: string, badge?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6", className)}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-indigo-500 rounded-full" />
          {title}
        </h2>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// 1. Publication Trend
function PublicationTrend({ data }: { data: any[] }) {
  const [range, setRange] = useState([2015, 2024]);
  const byYear = useMemo(() => {
    const m = freq(data.map(d => d.year));
    return Array.from({ length: range[1] - range[0] + 1 }, (_, i) => {
      const y = range[0] + i;
      return { year: y, papers: m[y] || 0 };
    });
  }, [data, range]);

  return (
    <SectionCard title="Publication Volume Trend" badge="Timeline">
      <div className="flex gap-2 mb-6">
        {[[2015,2024],[2018,2024],[2020,2024]].map(([s,e]) => (
          <button 
            key={s} 
            onClick={() => setRange([s,e])}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              range[0] === s ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500 hover:text-slate-300"
            )}
          >
            {s}–{e}
          </button>
        ))}
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={byYear} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip formatter={(_: any, v: any) => `Papers: ${v}`} />} />
            <Line 
              type="monotone" 
              dataKey="papers" 
              stroke={ACCENT} 
              strokeWidth={3}
              dot={{ fill: ACCENT, r: 4, strokeWidth: 2, stroke: "#050505" }} 
              activeDot={{ r: 6, fill: "#fff", stroke: ACCENT }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// 2. Top Authors / Institutions
function TopContributors({ data }: { data: any[] }) {
  const [mode, setMode] = useState<"authors" | "institutions">("authors");
  const [search, setSearch] = useState("");
  
  const chartData = useMemo(() => {
    if (mode === "authors") {
      const m = freq(data.flatMap(d => d.authors));
      return topN(m, 12).map(([name, count]) => ({ name: name.split(",")[0], count }));
    }
    const m = freq(data.map(d => d.institution));
    return topN(m, 12).map(([name, count]) => ({ name, count }));
  }, [data, mode]);

  const filtered = useMemo(() =>
    chartData.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [chartData, search]);

  return (
    <SectionCard title="Top Contributors" badge="Distribution">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex p-1 bg-slate-900/50 rounded-xl">
          {(["authors", "institutions"] as const).map(m => (
            <button 
              key={m} 
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                mode === m ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="relative flex-1 ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filtered} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: "#e2e8f0", fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip formatter={(_: any, v: any) => `Count: ${v}`} />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {filtered.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// 3. Keyword Frequency
function KeywordFrequency({ data }: { data: any[] }) {
  const [topN_, setTopN] = useState(15);
  const chartData = useMemo(() => {
    const m = freq(data.flatMap(d => d.keywords));
    return topN(m, topN_).map(([kw, count]) => ({ kw, count }));
  }, [data, topN_]);

  return (
    <SectionCard title="Keyword / Topic Frequency" badge="Topics">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Show top:</span>
        <div className="flex gap-1">
          {[10, 15, 20].map(n => (
            <button 
              key={n} 
              onClick={() => setTopN(n)}
              className={cn(
                "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                topN_ === n ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500 hover:text-slate-300"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="kw" tick={{ fill: "#64748b", fontSize: 9, angle: -40, textAnchor: "end" }} interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip formatter={(_: any, v: any) => `Frequency: ${v}`} />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// 4. Citation Impact Distribution
function CitationDistribution({ data }: { data: any[] }) {
  const [filter, setFilter] = useState<"all" | "low" | "mid" | "high">("all");
  const filtered = useMemo(() => {
    const map: Record<string, [number, number]> = { all: [0,Infinity], low:[0,5000], mid:[5000,20000], high:[20000,Infinity] };
    const [lo, hi] = map[filter];
    return data.filter(d => d.citations >= lo && d.citations < hi);
  }, [data, filter]);

  const buckets = useMemo(() => {
    const max = Math.max(...data.map(d => d.citations));
    const step = Math.ceil(max / 10 / 1000) * 1000;
    const bins = Array.from({ length: 10 }, (_, i) => ({ range: `${(i*step/1000).toFixed(0)}k`, count: 0, min: i*step, max: (i+1)*step }));
    filtered.forEach(d => {
      const i = Math.min(Math.floor(d.citations / step), 9);
      bins[i].count++;
    });
    return bins;
  }, [data, filtered]);

  const citations = filtered.map(d => d.citations);
  const mean = citations.length ? Math.round(citations.reduce((a,b)=>a+b,0)/citations.length) : 0;
  const sorted = [...citations].sort((a,b)=>a-b);
  const median = sorted.length ? sorted[Math.floor(sorted.length/2)] : 0;

  return (
    <SectionCard title="Citation Impact Distribution" badge="Impact">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {[["all","All"],["low","0–5k"],["mid","5k–20k"],["high","20k+"]].map(([v,l]) => (
            <button 
              key={v} 
              onClick={() => setFilter(v as any)}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === v ? "bg-rose-600 text-white" : "bg-slate-900 text-slate-500 hover:text-slate-300"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-6">
          {[["Mean", mean.toLocaleString()],["Median", median.toLocaleString()]].map(([l,v]) => (
            <div key={l} className="text-right">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{l}</p>
              <p className="text-sm font-bold text-rose-500 font-mono">{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip formatter={(_: any, v: any) => `Papers: ${v}`} />} />
            <Bar dataKey="count" fill="#fb7185" radius={[4,4,0,0]} fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// 5. Emerging Topics
function EmergingTopics({ data }: { data: any[] }) {
  const { trending, stable } = useMemo(() => {
    const years = data.map(d => d.year).sort((a,b)=>a-b);
    const medianYear = years[Math.floor(years.length / 2)];
    const older = data.filter(d => d.year <= medianYear);
    const recent = data.filter(d => d.year > medianYear);
    const oldFreq = freq(older.flatMap(d => d.keywords));
    const recFreq = freq(recent.flatMap(d => d.keywords));
    const allKws = new Set([...Object.keys(oldFreq), ...Object.keys(recFreq)]);
    const growth = [...allKws].map(kw => ({
      kw,
      old: (oldFreq[kw] || 0),
      recent: (recFreq[kw] || 0),
      growth: (recFreq[kw] || 0) - (oldFreq[kw] || 0),
    })).sort((a,b) => b.growth - a.growth);
    return { trending: growth.slice(0, 8), stable: growth.slice(-5).reverse() };
  }, [data]);

  return (
    <SectionCard title="Emerging Sub-Topics" badge="Trending">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight className="w-3 h-3" /> Rising Keywords
          </p>
          <div className="space-y-3">
            {trending.map((t, i) => (
              <div key={t.kw} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600 w-4 text-right">{i+1}</span>
                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg h-7 overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (t.recent / (trending[0]?.recent||1))*100)}%` }}
                    className="absolute left-0 top-0 h-full bg-emerald-500/20 border-r border-emerald-500/50" 
                  />
                  <span className="relative z-10 text-[11px] font-medium text-slate-300 px-3 h-full flex items-center">{t.kw}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-500 font-mono w-8">+{t.growth}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
            <ArrowDownRight className="w-3 h-3" /> Declining Keywords
          </p>
          <div className="space-y-3">
            {stable.map((t, i) => (
              <div key={t.kw} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600 w-4 text-right">{i+1}</span>
                <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg h-7 overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (t.old / (stable[0]?.old||1))*100)}%` }}
                    className="absolute left-0 top-0 h-full bg-rose-500/20 border-r border-rose-500/50" 
                  />
                  <span className="relative z-10 text-[11px] font-medium text-slate-300 px-3 h-full flex items-center">{t.kw}</span>
                </div>
                <span className="text-[11px] font-bold text-rose-500 font-mono w-8">{t.growth}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function AnalysisAgent({ onHandoff, initialPapers = [], onLog }: { onHandoff?: (data: TrendDataContract) => void, initialPapers?: Paper[], onLog?: (msg: string, data?: any) => void }) {
  const [data, setData] = useState(SEED_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPapers && initialPapers.length > 0) {
      if (onLog) onLog(`Received ${initialPapers.length} papers from DiscoveryAgent`, { count: initialPapers.length });
      // Map Paper type to AnalysisAgent data format if needed
      const mappedData = initialPapers.map(p => ({
        title: p.title,
        authors: p.authors.split(', '),
        institution: p.source === 'semantic' ? 'Semantic Scholar' : p.source === 'openalex' ? 'OpenAlex' : 'arXiv',
        year: p.year || 2024,
        keywords: [], // DiscoveryAgent doesn't provide keywords directly
        citations: p.citationCount || 0
      }));
      setData(mappedData);
    }
  }, [initialPapers]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState("");
  const [pulse, setPulse] = useState(false);

  // Simulate live data refresh animation
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 3000);
    return () => clearInterval(t);
  }, []);

  const handleLoad = () => {
    setError("");
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Input must be a JSON array");
      setLoading(true);
      setTimeout(() => {
        setData(parsed);
        setLoading(false);
        setShowInput(false);
        setJsonInput("");
      }, 800);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleHandoff = async () => {
    if (!onHandoff) return;
    setSynthesizing(true);
    if (onLog) onLog("Synthesizing trend data from paper list.");
    try {
      // Synthesize the current data into a TrendDataContract
      const trendReport = await analysisAgent(data);
      if (onLog) onLog("Trend report generated successfully", trendReport);
      onHandoff(trendReport);
    } catch (error) {
      console.error("Handoff failed:", error);
      if (onLog) onLog("Handoff failed", { error: String(error) });
    } finally {
      setSynthesizing(false);
    }
  };

  // Summary stats
  const totalPapers = data.length;
  const avgCitations = Math.round(data.reduce((s,d)=>s+d.citations,0)/data.length);
  const topKw = topN(freq(data.flatMap(d=>d.keywords)), 1)[0]?.[0] ?? "—";
  const yearSpan = `${Math.min(...data.map(d=>d.year))}–${Math.max(...data.map(d=>d.year))}`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-500" />
            Analysis Agent
          </h2>
          <p className="text-slate-400">Intelligent data visualization and research synthesis.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className={cn(
              "w-2 h-2 rounded-full bg-emerald-500 transition-all duration-500",
              pulse ? "shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "shadow-none"
            )} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Discovery Connected</span>
          </div>
          <button 
            onClick={handleHandoff}
            disabled={synthesizing}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {synthesizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {synthesizing ? "Synthesizing..." : "Handoff to Roadmap"}
          </button>
          <button 
            onClick={() => setShowInput(!showInput)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            {showInput ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {showInput ? "Close Panel" : "Load Dataset"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paste Discovery Data (JSON Array)</label>
                <button onClick={() => setJsonInput("")} className="text-[10px] font-bold text-indigo-400 hover:underline">Clear</button>
              </div>
              <textarea 
                value={jsonInput} 
                onChange={e=>setJsonInput(e.target.value)}
                placeholder='[{"title":"...","authors":[...],"institution":"...","year":2024,"keywords":[...],"citations":0}]'
                rows={5} 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-white font-mono placeholder:text-slate-700 outline-none focus:border-indigo-500/50 transition-all resize-none"
              />
              {error && <p className="text-xs text-rose-500 font-bold flex items-center gap-2">⚠ {error}</p>}
              <div className="flex gap-3">
                <button 
                  onClick={handleLoad} 
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-500 transition-all"
                >
                  Process Dataset
                </button>
                <button 
                  onClick={() => { setData(SEED_DATA); setShowInput(false); }} 
                  className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 font-bold rounded-xl text-xs hover:text-white transition-all"
                >
                  Reset to Sample
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Processing Research Data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Papers" value={totalPapers} sub={yearSpan} icon={<Database className="w-5 h-5" />} />
            <StatCard label="Avg Citations" value={avgCitations.toLocaleString()} sub="per paper" icon={<Activity className="w-5 h-5" />} />
            <StatCard label="Top Keyword" value={topKw} sub="most frequent" icon={<Tag className="w-5 h-5" />} />
            <StatCard label="Institutions" value={new Set(data.map(d=>d.institution)).size} sub="unique" icon={<Award className="w-5 h-5" />} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PublicationTrend data={data} />
            <TopContributors data={data} />
            <KeywordFrequency data={data} />
            <CitationDistribution data={data} />
          </div>

          <EmergingTopics data={data} />

          <div className="text-center pt-8">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">
              Analysis Agent v2.0 · {data.length} Records Processed · Multi-Agent Research Platform
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
