import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Zap, 
  Layout, 
  ListTodo, 
  Bell, 
  Clock, 
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Task {
  id: number;
  label: string;
  done: boolean;
  reminder?: string | null;
  reminderFired?: boolean;
}

interface Toast {
  id: number;
  title: string;
  msg: string;
}

export default function ProjectTracker() {
  const [projectName, setProjectName] = useState(() => localStorage.getItem('orchestrix_project_name') || '');
  const [projectInput, setProjectInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('orchestrix_project_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [taskInput, setTaskInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [openReminderId, setOpenReminderId] = useState<number | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('orchestrix_project_name', projectName);
    localStorage.setItem('orchestrix_project_tasks', JSON.stringify(tasks));
  }, [projectName, tasks]);

  // Notification Permission Check
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotifBanner(true);
    }
  }, []);

  const showToast = useCallback((title: string, msg: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const requestNotifPermission = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(perm => {
      setShowNotifBanner(false);
      if (perm === 'granted') {
        showToast('🔔 Notifications enabled', "You'll be reminded before your tasks are due.");
      }
    });
  };

  const fireReminder = useCallback((task: Task) => {
    const msg = `"${task.label}" is due now!`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⏰ Task Reminder — ${projectName}`, {
        body: msg,
        icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bell'
      });
    }

    showToast('⏰ Task Reminder', msg);

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderFired: true } : t));
  }, [projectName, showToast]);

  // Reminder Timer Management
  useEffect(() => {
    const timers: { [key: number]: NodeJS.Timeout } = {};

    tasks.forEach(task => {
      if (task.reminder && !task.reminderFired && !task.done) {
        const delay = new Date(task.reminder).getTime() - Date.now();
        if (delay > 0) {
          timers[task.id] = setTimeout(() => fireReminder(task), delay);
        } else if (delay > -60000) { // If it passed in the last minute, fire it once
          fireReminder(task);
        }
      }
    });

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, [tasks, fireReminder]);

  const startProject = () => {
    if (!projectInput.trim()) return;
    setProjectName(projectInput.trim());
    setTasks([]);
    setSuggestions([]);
  };

  const addTask = (label?: string) => {
    const text = (label || taskInput).trim();
    if (!text) return;
    setTasks(prev => [...prev, { id: Date.now() + Math.random(), label: text, done: false }]);
    if (!label) setTaskInput('');
  };

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const setReminder = (id: number, datetime: string) => {
    const dt = new Date(datetime);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      showToast('⚠ Invalid time', 'Please pick a future date and time.');
      return;
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder: datetime, reminderFired: false } : t));
    setOpenReminderId(null);
  };

  const clearReminder = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder: null, reminderFired: false } : t));
  };

  const fetchSuggestions = async () => {
    if (!projectName) return;
    setLoadingSuggestions(true);
    setSuggestions([]);

    try {
      const existing = tasks.map(t => t.label).join(', ') || 'none yet';
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Project: "${projectName}". Existing tasks: ${existing}. Suggest 6 new tasks not yet listed.`,
        config: {
          systemInstruction: "You are a project planning assistant. Return ONLY a valid JSON array of 6 short, specific, actionable task strings. No markdown, no preamble, no explanation.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const data = JSON.parse(response.text || '[]');
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (projectName && suggestions.length === 0 && !loadingSuggestions) {
      fetchSuggestions();
    }
  }, [projectName]);

  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const formatReminderLabel = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return 'overdue';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 font-sans">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto bg-[#18181b] border border-amber-500/30 rounded-2xl p-4 min-w-[280px] max-w-[360px] shadow-2xl flex gap-3"
            >
              <div className="text-xl mt-0.5">🔔</div>
              <div className="flex-1">
                <h5 className="text-xs font-bold text-amber-500 mb-1">{toast.title}</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">{toast.msg}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-indigo-500" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Project Tracker</h1>
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">AI</span>
      </div>

      <AnimatePresence>
        {showNotifBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 mb-6"
          >
            <Bell className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-500 flex-1">Enable notifications to get reminded about your tasks.</span>
            <button 
              onClick={requestNotifPermission}
              className="px-3 py-1 bg-amber-500 text-black rounded-lg text-[10px] font-bold hover:bg-amber-400 transition-colors"
            >
              Enable
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!projectName ? (
        <div className="space-y-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">New project</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startProject()}
                placeholder="What are you working on?" 
                className="flex-1 bg-[#141416] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40 transition-colors"
              />
              <button 
                onClick={startProject}
                className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create
              </button>
            </div>
          </div>

          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-10 text-center">
            <div className="flex justify-center mb-4 opacity-20">
              <Layout className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm text-slate-500 italic">Enter a project name above to get started.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Project Card */}
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{projectName}</h2>
                <p className="text-xs text-slate-500 font-medium">{totalCount} tasks · {doneCount} completed</p>
              </div>
              <button 
                onClick={() => { setProjectName(''); localStorage.removeItem('orchestrix_project_name'); }}
                className="p-2 text-slate-600 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Progress</span>
                <span className="font-mono text-indigo-400 font-bold">{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-[#1f1f24] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    progressPct === 100 ? "bg-emerald-500" : "bg-indigo-500"
                  )}
                />
              </div>
            </div>

            <AnimatePresence>
              {totalCount > 0 && doneCount === totalCount && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3 mb-6"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-500">Project completed! All tasks are done.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5 mb-6">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No tasks yet — add one below or pick from AI suggestions.</p>
              ) : (
                tasks.map(task => (
                  <motion.div 
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex flex-col p-3 bg-[#1f1f24] border border-white/5 rounded-xl transition-all",
                      task.done && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                      />
                      <span className={cn("flex-1 text-sm text-white", task.done && "line-through")}>{task.label}</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setOpenReminderId(openReminderId === task.id ? null : task.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            task.reminder ? "text-amber-500 bg-amber-500/10" : "text-slate-600 hover:text-indigo-400"
                          )}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Reminder Row */}
                    <div className="mt-1 pl-7 flex flex-wrap items-center gap-2">
                      {task.reminder && (
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                          <Clock className="w-2.5 h-2.5" />
                          {formatReminderLabel(task.reminder)}
                          <button onClick={() => clearReminder(task.id)} className="hover:text-white transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      
                      <AnimatePresence>
                        {openReminderId === task.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full mt-2 flex gap-2"
                          >
                            <input 
                              type="datetime-local" 
                              className="flex-1 bg-[#141416] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/40 transition-colors [color-scheme:dark]"
                              onChange={(e) => setReminder(task.id, e.target.value)}
                            />
                            <button 
                              onClick={() => setOpenReminderId(null)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:text-white"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a task..." 
                className="flex-1 bg-[#141416] border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-indigo-500/40 transition-colors"
              />
              <button 
                onClick={() => addTask()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {/* AI Suggestions Card */}
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">AI task suggestions</label>
              <button 
                onClick={fetchSuggestions}
                disabled={loadingSuggestions}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f24] border border-white/10 text-slate-400 rounded-lg text-[10px] font-bold hover:text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3", loadingSuggestions && "animate-spin")} /> Refresh
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="flex gap-1.5 py-4">
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { addTask(s); setSuggestions(prev => prev.filter(item => item !== s)); }}
                    className="px-3 py-1.5 bg-[#1f1f24] border border-white/5 rounded-xl text-xs text-slate-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-white transition-all flex items-center gap-2"
                  >
                    <span className="text-indigo-500 font-bold">+</span> {s}
                  </button>
                ))}
                {suggestions.length === 0 && !loadingSuggestions && (
                  <p className="text-[11px] text-slate-600 italic">No suggestions available. Try refreshing.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

