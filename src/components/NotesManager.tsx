import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Link as LinkIcon, 
  Tag, 
  Palette, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  X, 
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { cn } from '../lib/utils';
import { autocorrectAgent } from '../services/geminiService';

interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  tags: string[];
  linked_paper_id: number | null;
  created_at: string;
  updated_at: string;
}

export default function NotesManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [layout, setLayout] = useState<'grid' | 'list'>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutocorrecting, setIsAutocorrecting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const createNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', content: '', color: '#7c5cfc', tags: [] })
      });
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      setCurrentNote(newNote);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const updateNote = async (id: number, updates: Partial<Note>) => {
    if (!currentNote) return;
    const updatedNote = { ...currentNote, ...updates };
    setCurrentNote(updatedNote);
    setNotes(notes.map(n => n.id === id ? updatedNote : n));
    
    // Debounced save
    setSaveStatus('saving');
    try {
      await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNote)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to update note:', err);
      setSaveStatus('idle');
    }
  };

  const deleteNote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(notes.filter(n => n.id !== id));
      if (currentNote?.id === id) setCurrentNote(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleAutocorrect = async () => {
    if (!currentNote || !currentNote.content) return;
    setIsAutocorrecting(true);
    try {
      const improved = await autocorrectAgent(currentNote.content);
      updateNote(currentNote.id, { content: improved });
    } catch (err) {
      console.error('Autocorrect failed:', err);
    } finally {
      setIsAutocorrecting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === 'all' || n.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">My Projects</h2>
          <p className="text-slate-400 text-sm">Research notes, annotations, and paper highlights.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
              onClick={() => setLayout('list')}
              className={cn("p-1.5 rounded-md transition-all", layout === 'list' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setLayout('grid')}
              className={cn("p-1.5 rounded-md transition-all", layout === 'grid' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={createNote}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Sidebar: List of Notes */}
        <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveTag('all')}
              className={cn("px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all", activeTag === 'all' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700")}
            >
              All
            </button>
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all", activeTag === tag ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700")}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notes found</p>
              </div>
            ) : (
              <div className={cn(layout === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-2")}>
                {filteredNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => setCurrentNote(note)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group relative",
                      currentNote?.id === note.id 
                        ? "bg-indigo-600/10 border-indigo-500/50" 
                        : "bg-[#0a0a0a] border-slate-800/50 hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: note.color }} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{note.title || 'Untitled'}</h4>
                        <p className="text-xs text-slate-500 truncate mt-1">{note.content || 'No content'}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-slate-600">{new Date(note.updated_at).toLocaleDateString()}</span>
                          {note.linked_paper_id && <LinkIcon className="w-3 h-3 text-indigo-400" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-8 flex flex-col bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden min-h-0">
          {currentNote ? (
            <>
              <div className="p-4 border-bottom border-slate-800 flex items-center justify-between bg-slate-900/30">
                <input 
                  type="text" 
                  value={currentNote.title}
                  onChange={(e) => updateNote(currentNote.id, { title: e.target.value })}
                  className="bg-transparent border-none text-xl font-bold text-white focus:ring-0 w-full"
                  placeholder="Note Title..."
                />
                <div className="flex items-center gap-2">
                  <div className={cn("flex items-center gap-2 text-xs transition-opacity", saveStatus === 'idle' ? "opacity-0" : "opacity-100")}>
                    <div className={cn("w-2 h-2 rounded-full", saveStatus === 'saving' ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                    <span className="text-slate-500">{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
                  </div>
                  <button 
                    onClick={handleAutocorrect}
                    disabled={isAutocorrecting}
                    className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
                    title="Smart Autocorrect"
                  >
                    {isAutocorrecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => deleteNote(currentNote.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-800/50 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-slate-500" />
                    <div className="flex gap-1.5">
                      {['#7c5cfc', '#3ecf8e', '#5b9cf6', '#f5856a', '#f7c948', '#c084fc'].map(color => (
                        <button 
                          key={color}
                          onClick={() => updateNote(currentNote.id, { color })}
                          className={cn(
                            "w-4 h-4 rounded-full border-2 transition-transform hover:scale-125",
                            currentNote.color === color ? "border-white" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <div className="flex gap-1 flex-wrap">
                      {currentNote.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-300 rounded-md flex items-center gap-1">
                          {tag}
                          <button onClick={() => updateNote(currentNote.id, { tags: currentNote.tags.filter((_, i) => i !== idx) })}>
                            <X className="w-2.5 h-2.5 hover:text-rose-400" />
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        placeholder="+ tag"
                        className="bg-transparent border-none text-[10px] text-slate-500 focus:ring-0 w-16 p-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !currentNote.tags.includes(val)) {
                              updateNote(currentNote.id, { tags: [...currentNote.tags, val] });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <textarea 
                  value={currentNote.content}
                  onChange={(e) => updateNote(currentNote.id, { content: e.target.value })}
                  className="flex-1 bg-transparent border-none text-slate-300 p-6 focus:ring-0 resize-none leading-relaxed"
                  placeholder="Start writing your research notes..."
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>{currentNote.content.split(/\s+/).filter(Boolean).length} words</span>
                  <span>{currentNote.content.length} characters</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentNote.content);
                      alert('Copied to clipboard!');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-700 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Note Selected</h3>
              <p className="text-slate-500 max-w-xs mb-6">Select a note from the list or create a new one to start your research journey.</p>
              <button 
                onClick={createNote}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Create New Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
