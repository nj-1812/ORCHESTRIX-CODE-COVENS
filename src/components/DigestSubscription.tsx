import { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Clock, Search, Loader2, CheckCircle2, Zap } from 'lucide-react';

export default function DigestSubscription() {
  const [query, setQuery] = useState('');
  const [interval, setInterval] = useState(24);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch('/api/subscribe-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest-user-123',
          query,
          intervalHours: interval
        })
      });
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <Bell className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Scheduled Research Digest</h2>
          <p className="text-slate-500">Get automated updates on new papers matching your research interests.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Research Topic</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. quantum computing error correction" 
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frequency</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select 
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
              >
                <option value={1}>Every Hour</option>
                <option value={6}>Every 6 Hours</option>
                <option value={12}>Every 12 Hours</option>
                <option value={24}>Daily</option>
                <option value={168}>Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleSubscribe}
              disabled={loading || !query}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {success ? 'Subscribed!' : 'Activate Digest'}
            </button>
          </div>
        </div>

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            Subscription active. You'll receive a digest every {interval} hours.
          </motion.div>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-slate-800/50">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">How it works</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-indigo-400 font-bold">01</div>
            <p className="text-xs text-slate-500 leading-relaxed">Agents monitor Semantic Scholar and arXiv for new publications.</p>
          </div>
          <div className="space-y-2">
            <div className="text-indigo-400 font-bold">02</div>
            <p className="text-xs text-slate-500 leading-relaxed">Ranker agents score papers based on your specific query relevance.</p>
          </div>
          <div className="space-y-2">
            <div className="text-indigo-400 font-bold">03</div>
            <p className="text-xs text-slate-500 leading-relaxed">A synthesized report is generated and sent to your dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
