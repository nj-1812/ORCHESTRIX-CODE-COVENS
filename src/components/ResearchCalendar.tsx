import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CalendarTasks {
  [key: string]: string[];
}

export default function ResearchCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CalendarTasks>({});
  const [taskInput, setTaskInput] = useState('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('orchestrix_calendar_tasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error('Failed to parse saved tasks', e);
      }
    }
  }, []);

  // Save tasks to localStorage when they change
  useEffect(() => {
    localStorage.setItem('orchestrix_calendar_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const formatKey = (year: number, month: number, day: number) => {
    return `${year}-${month}-${day}`;
  };

  const changeMonth = (step: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + step);
    setCurrentDate(newDate);
  };

  const selectDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    setSelectedDateKey(formatKey(year, month, day));
  };

  const addTask = () => {
    if (!taskInput.trim() || !selectedDateKey) return;

    setTasks(prev => {
      const newTasks = { ...prev };
      if (!newTasks[selectedDateKey]) {
        newTasks[selectedDateKey] = [];
      }
      newTasks[selectedDateKey] = [...newTasks[selectedDateKey], taskInput.trim()];
      return newTasks;
    });

    setTaskInput('');
  };

  const deleteTask = (index: number) => {
    if (!selectedDateKey) return;
    setTasks(prev => {
      const newTasks = { ...prev };
      newTasks[selectedDateKey] = newTasks[selectedDateKey].filter((_, i) => i !== index);
      if (newTasks[selectedDateKey].length === 0) {
        delete newTasks[selectedDateKey];
      }
      return newTasks;
    });
  };

  const renderDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const dateElements = [];

    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      dateElements.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Actual dates
    for (let i = 1; i <= lastDate; i++) {
      const key = formatKey(year, month, i);
      const hasTask = tasks[key] && tasks[key].length > 0;
      const isToday = 
        i === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear();
      const isSelected = selectedDateKey === key;

      dateElements.push(
        <button
          key={i}
          onClick={() => selectDate(i)}
          className={cn(
            "relative flex flex-col items-center justify-center p-2 h-12 rounded-xl transition-all duration-200 group",
            isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-300 hover:bg-slate-800/50",
            isSelected && !isToday && "border border-indigo-500/50 bg-indigo-500/10 text-indigo-400",
            !isSelected && !isToday && "border border-transparent"
          )}
        >
          <span className="text-sm font-bold">{i}</span>
          {hasTask && (
            <span className={cn(
              "absolute bottom-1.5 w-1 h-1 rounded-full",
              isToday ? "bg-white" : "bg-indigo-500"
            )} />
          )}
          
          {/* Hover effect indicator */}
          {!isSelected && !isToday && (
            <div className="absolute inset-0 rounded-xl border border-white/0 group-hover:border-white/10 transition-all" />
          )}
        </button>
      );
    }

    return dateElements;
  };

  const getSelectedDateDisplay = () => {
    if (!selectedDateKey) return "Select a date";
    const [year, month, day] = selectedDateKey.split('-').map(Number);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto space-y-8 font-sans"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-indigo-500" />
          Research Calendar
        </h2>
        <p className="text-slate-400">Schedule your research milestones and track daily tasks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Card */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8 px-2">
            <h3 className="text-xl font-bold text-white tracking-tight">
              {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => changeMonth(1)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDates()}
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-3xl p-6 flex flex-col h-full shadow-xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Daily Agenda</span>
            </div>
            <h4 className="text-lg font-bold text-white leading-tight">
              {getSelectedDateDisplay()}
            </h4>
          </div>

          <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {selectedDateKey && tasks[selectedDateKey] && tasks[selectedDateKey].length > 0 ? (
                tasks[selectedDateKey].map((task, index) => (
                  <motion.div 
                    key={`${selectedDateKey}-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    <span className="flex-1 text-sm text-slate-300">{task}</span>
                    <button 
                      onClick={() => deleteTask(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-700" />
                  </div>
                  <p className="text-xs text-slate-500 italic">No tasks scheduled for this day.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/50">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="New task..."
                disabled={!selectedDateKey}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-all disabled:opacity-50"
              />
              <button 
                onClick={addTask}
                disabled={!selectedDateKey || !taskInput.trim()}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:bg-slate-800"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
