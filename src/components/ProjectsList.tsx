import { motion } from 'motion/react';
import { Search, FileText, ChevronRight } from 'lucide-react';

export default function ProjectsList() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-white">My Projects</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0a0a0a] border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700 transition-all group cursor-pointer flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-colors">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Research Project {i}</h3>
              <p className="text-sm text-slate-500">Last edited 2 days ago • 12 sources found</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                Completed
              </span>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
