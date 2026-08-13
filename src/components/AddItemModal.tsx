import React, { useState, useEffect, useRef } from 'react';
import { ActivityCategory, CategoryInfo, ColumnType, TaskItem, DEFAULT_CATEGORIES } from '../types';
import { X, Plus, Save, AlertCircle, Sparkles, Search, Loader2, Check, BookOpen, Film, Tv, Gamepad2 } from 'lucide-react';
import { searchMetadata, MetadataSuggestion } from '../services/metadataApi';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<TaskItem, 'id' | 'createdAt'> & { id?: string }) => void;
  initialCategory?: ActivityCategory;
  initialColumn?: ColumnType;
  editingItem?: TaskItem | null;
  inProgressCount?: number;
  categories?: CategoryInfo[];
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory = 'books',
  initialColumn = 'backlog',
  editingItem = null,
  inProgressCount = 0,
  categories = DEFAULT_CATEGORIES,
}) => {
  const [category, setCategory] = useState<ActivityCategory>(initialCategory);
  const [title, setTitle] = useState('');
  const [creatorOrMeta, setCreatorOrMeta] = useState('');
  const [column, setColumn] = useState<ColumnType>(initialColumn);
  const [progress, setProgress] = useState(0);
  const [currentUnit, setCurrentUnit] = useState<number | undefined>(undefined);
  const [totalUnits, setTotalUnits] = useState<number | undefined>(undefined);
  const [unitName, setUnitName] = useState('pages');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Auto-fill API states
  const [suggestions, setSuggestions] = useState<MetadataSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingItem) {
      setCategory(editingItem.category);
      setTitle(editingItem.title);
      setCreatorOrMeta(editingItem.creatorOrMeta || '');
      setColumn(editingItem.column);
      setProgress(editingItem.progress || 0);
      setCurrentUnit(editingItem.currentUnit);
      setTotalUnits(editingItem.totalUnits);
      setUnitName(editingItem.unitName || 'pages');
      setPriority(editingItem.priority || 'medium');
      setRating(editingItem.rating);
      setNotes(editingItem.notes || '');
    } else {
      setCategory(initialCategory);
      setColumn(initialColumn);
      setTitle('');
      setCreatorOrMeta('');
      setProgress(initialColumn === 'completed' ? 100 : 0);
      setCurrentUnit(undefined);
      setTotalUnits(undefined);
      const catObj = categories.find((c) => c.id === initialCategory);
      setUnitName(catObj ? catObj.unitDefault : 'pages');
      setPriority('medium');
      setRating(undefined);
      setNotes('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setAutofillSuccess(null);
  }, [editingItem, initialCategory, initialColumn, isOpen, categories]);

  // When category changes, update unitName default and clear suggestions
  const handleCategoryChange = (cat: ActivityCategory) => {
    setCategory(cat);
    const catObj = categories.find((c) => c.id === cat);
    if (catObj) {
      setUnitName(catObj.unitDefault);
    }
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Trigger search on title change
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setAutofillSuccess(null);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchMetadata(val, category);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setIsSearching(false);
    }, 450);
  };

  // Apply suggestion to form
  const handleSelectSuggestion = (sug: MetadataSuggestion) => {
    setTitle(sug.title);
    if (sug.creatorOrMeta) {
      setCreatorOrMeta(sug.creatorOrMeta);
    }
    if (sug.totalUnits) {
      setTotalUnits(sug.totalUnits);
    }
    if (sug.unitName) {
      setUnitName(sug.unitName);
    }
    if (sug.rating !== undefined) {
      setRating(sug.rating);
    }
    if (sug.notes) {
      setNotes(sug.notes);
    }

    setShowSuggestions(false);
    setAutofillSuccess(`✨ Auto-filled from ${sug.source}!`);
    setTimeout(() => setAutofillSuccess(null), 3500);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalProgress = progress;
    if (column === 'completed') finalProgress = 100;
    if (column === 'backlog' && !editingItem) finalProgress = 0;

    onSave({
      id: editingItem ? editingItem.id : undefined,
      category,
      title: title.trim(),
      creatorOrMeta: creatorOrMeta.trim(),
      column,
      progress: finalProgress,
      currentUnit,
      totalUnits,
      unitName,
      priority,
      rating,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-950 border-2 border-black dark:border-white rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[90vh] overflow-y-auto">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-3 mb-4">
          <h3 className="font-titan text-xl uppercase tracking-wide">
            {editingItem ? 'Edit Task Item' : 'Add New Activity'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* CATEGORY SELECTOR */}
          <div>
            <label className="block text-xs font-mono-clean font-bold uppercase mb-1.5">
              Activity Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-2 px-1 rounded-xl border-2 font-titan text-xs capitalize transition-all ${
                    category === cat.id
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* TITLE WITH AUTOFILL SEARCH & CREATOR */}
          <div className="space-y-3">
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono-clean font-bold uppercase">
                  Title *
                </label>
                <div className="flex items-center gap-1.5 text-[10px] font-mono-clean text-zinc-500">
                  {isSearching ? (
                    <span className="flex items-center gap-1 text-yellow-600 font-bold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Searching {category}...</span>
                    </span>
                  ) : autofillSuccess ? (
                    <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                      <Check className="w-3 h-3" />
                      <span>{autofillSuccess}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      <span>Live API Auto-Fill</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={`Search or enter ${category.slice(0, -1) || 'item'} title...`}
                  className="w-full pl-3 pr-9 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* LIVE SUGGESTIONS DROPDOWN */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsBoxRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-56 overflow-y-auto"
                >
                  <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-[10px] font-mono-clean font-bold text-zinc-600 dark:text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      <span>Click to Auto-Fill Metadata:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="hover:text-black dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {suggestions.map((sug) => (
                    <button
                      type="button"
                      key={sug.id}
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left p-2.5 hover:bg-yellow-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-titan text-xs text-black dark:text-white truncate">
                          {sug.title}
                          {sug.year && (
                            <span className="ml-1 text-[10px] font-mono-clean text-zinc-500 font-normal">
                              ({sug.year})
                            </span>
                          )}
                        </div>
                        {sug.creatorOrMeta && (
                          <p className="text-[11px] font-mono-clean text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                            {sug.creatorOrMeta}
                          </p>
                        )}
                        {sug.notes && (
                          <p className="text-[10px] font-mono-clean text-zinc-400 line-clamp-1 mt-0.5">
                            {sug.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[9px] font-mono-clean px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white rounded font-bold">
                          {sug.source}
                        </span>
                        {sug.totalUnits && (
                          <span className="text-[9px] font-mono-clean text-zinc-500">
                            {sug.totalUnits} {sug.unitName || 'units'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Author / Director / Studio / Platform
              </label>
              <input
                type="text"
                value={creatorOrMeta}
                onChange={(e) => setCreatorOrMeta(e.target.value)}
                placeholder="e.g. Frank Herbert, Christopher Nolan, FromSoftware..."
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* COLUMN SELECTION & IN PROGRESS LIMIT WARNING */}
          <div>
            <label className="block text-xs font-mono-clean font-bold uppercase mb-1.5">
              Column Target
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'backlog', label: 'Backlog (Todo)' },
                { id: 'in_progress', label: 'In Progress (3-5)' },
                { id: 'completed', label: 'Completed' },
              ].map((col) => (
                <button
                  type="button"
                  key={col.id}
                  onClick={() => setColumn(col.id as ColumnType)}
                  className={`py-2 px-2 rounded-xl border-2 font-titan text-xs text-center transition-all ${
                    column === col.id
                      ? col.id === 'in_progress'
                        ? 'border-black bg-yellow-400 text-black font-bold'
                        : col.id === 'completed'
                        ? 'border-black bg-green-500 text-white font-bold'
                        : 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>

            {column === 'in_progress' && inProgressCount >= 5 && !editingItem && (
              <div className="mt-2 p-2 rounded-lg bg-yellow-100 text-black border border-yellow-500 text-[11px] font-mono-clean flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span>Notice: In Progress is at 5 tasks capacity. Adding here will reach maximum!</span>
              </div>
            )}
          </div>

          {/* UNITS & PROGRESS % */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Total Units ({unitName})
              </label>
              <input
                type="number"
                min="0"
                value={totalUnits || ''}
                onChange={(e) => setTotalUnits(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 400 pages / 10 eps"
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Unit Name
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="pages, episodes, hours, mins"
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm"
              />
            </div>
          </div>

          {column === 'in_progress' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-mono-clean font-bold uppercase">
                  Progress Percentage
                </label>
                <span className="font-titan text-sm text-yellow-500">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-yellow-400 cursor-pointer"
              />
            </div>
          )}

          {/* PRIORITY & NOTES */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {column === 'completed' && (
              <div>
                <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                  Rating (1-5 Stars)
                </label>
                <select
                  value={rating || ''}
                  onChange={(e) => setRating(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm"
                >
                  <option value="">No Rating</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                  <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                  <option value="3">⭐⭐⭐ (3 Stars)</option>
                  <option value="2">⭐⭐ (2 Stars)</option>
                  <option value="1">⭐ (1 Star)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
              Custom Notes / Log
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key thoughts, favorite moments, quotes..."
              className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-xs focus:outline-none"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t-2 border-black dark:border-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 font-titan text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-titan text-sm hover:opacity-90 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(100,100,100,0.5)]"
            >
              <Save className="w-4 h-4" />
              <span>{editingItem ? 'Save Changes' : 'Create Activity'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
