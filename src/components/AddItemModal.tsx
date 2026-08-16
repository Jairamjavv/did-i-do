import React, { useState, useEffect, useRef } from 'react';
import { ActivityCategory, CategoryInfo, ColumnType, TaskItem, SeasonDetail, DEFAULT_CATEGORIES } from '../types';
import { X, Plus, Save, AlertCircle, Sparkles, Search, Loader2, Check, Tv, Layers, Film, BookOpen, Gamepad2 } from 'lucide-react';
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

  // Series specific state
  const [totalSeasons, setTotalSeasons] = useState<number | undefined>(undefined);
  const [seasons, setSeasons] = useState<SeasonDetail[]>([]);
  const [currentSeason, setCurrentSeason] = useState<number>(1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(0);
  const [bulkEpisodeCount, setBulkEpisodeCount] = useState<string>('');

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
      setUnitName(editingItem.unitName || (editingItem.category === 'series' ? 'episodes' : 'pages'));
      setPriority(editingItem.priority || 'medium');
      setRating(editingItem.rating);
      setNotes(editingItem.notes || '');

      if (editingItem.category === 'series' || (editingItem.seasons && editingItem.seasons.length > 0)) {
        const seasonList = editingItem.seasons && editingItem.seasons.length > 0
          ? editingItem.seasons
          : editingItem.totalSeasons && editingItem.totalSeasons > 0
          ? Array.from({ length: editingItem.totalSeasons }, (_, i) => ({
              seasonNumber: i + 1,
              totalEpisodes: editingItem.totalUnits ? Math.ceil(editingItem.totalUnits / editingItem.totalSeasons!) : 10,
              episodesCompleted: 0,
            }))
          : [];
        setTotalSeasons(editingItem.totalSeasons || (seasonList.length > 0 ? seasonList.length : undefined));
        setSeasons(seasonList);
        setCurrentSeason(editingItem.currentSeason || 1);
        setCurrentEpisode(editingItem.currentEpisode || 0);
      } else {
        setTotalSeasons(undefined);
        setSeasons([]);
        setCurrentSeason(1);
        setCurrentEpisode(0);
      }
    } else {
      setCategory(initialCategory);
      setColumn(initialColumn);
      setTitle('');
      setCreatorOrMeta('');
      setProgress(initialColumn === 'completed' ? 100 : 0);
      setCurrentUnit(undefined);
      setTotalUnits(undefined);
      const catObj = categories.find((c) => c.id === initialCategory);
      setUnitName(catObj ? catObj.unitDefault : initialCategory === 'series' ? 'episodes' : 'pages');
      setPriority('medium');
      setRating(undefined);
      setNotes('');
      setTotalSeasons(undefined);
      setSeasons([]);
      setCurrentSeason(1);
      setCurrentEpisode(0);
      setBulkEpisodeCount('');
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setAutofillSuccess(null);
  }, [editingItem, initialCategory, initialColumn, isOpen, categories]);

  // Handle total seasons count change
  const handleTotalSeasonsChange = (valStr: string) => {
    if (!valStr) {
      setTotalSeasons(undefined);
      setSeasons([]);
      setTotalUnits(undefined);
      return;
    }
    const count = Math.min(50, Math.max(1, parseInt(valStr, 10) || 1));
    setTotalSeasons(count);

    const updatedSeasons: SeasonDetail[] = Array.from({ length: count }, (_, i) => {
      const seasonNum = i + 1;
      const existing = seasons.find((s) => s.seasonNumber === seasonNum);
      return {
        seasonNumber: seasonNum,
        totalEpisodes: existing ? existing.totalEpisodes : 10,
        episodesCompleted: existing ? existing.episodesCompleted || 0 : 0,
      };
    });

    setSeasons(updatedSeasons);
    const sum = updatedSeasons.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
    setTotalUnits(sum);
    setUnitName('episodes');
  };

  // Handle individual season episodes change
  const handleSeasonEpisodesChange = (seasonNum: number, epsVal: number) => {
    const updated = seasons.map((s) =>
      s.seasonNumber === seasonNum ? { ...s, totalEpisodes: Math.max(0, epsVal || 0) } : s
    );
    setSeasons(updated);
    const sum = updated.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
    setTotalUnits(sum);
  };

  // Bulk set all seasons to the same episode count
  const handleApplyBulkEpisodes = () => {
    const count = parseInt(bulkEpisodeCount, 10);
    if (!count || count <= 0) return;
    const updated = seasons.map((s) => ({ ...s, totalEpisodes: count }));
    setSeasons(updated);
    setTotalUnits(count * seasons.length);
  };

  // When category changes, update unitName default and clear suggestions
  const handleCategoryChange = (cat: ActivityCategory) => {
    setCategory(cat);
    const catObj = categories.find((c) => c.id === cat);
    if (catObj) {
      setUnitName(catObj.unitDefault);
    }
    if (cat === 'series') {
      setUnitName('episodes');
      if (!totalSeasons || seasons.length === 0) {
        // Default to 1 season with 10 episodes if none set yet
        setTotalSeasons(1);
        const initSeasons: SeasonDetail[] = [{ seasonNumber: 1, totalEpisodes: 10, episodesCompleted: 0 }];
        setSeasons(initSeasons);
        setTotalUnits(10);
      }
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
    let finalCurrentUnit = currentUnit;
    let finalTotalUnits = totalUnits;
    let finalSeasons = seasons.length > 0 ? seasons : undefined;

    if (category === 'series' && seasons.length > 0) {
      const sumEps = seasons.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
      const compEps = seasons.reduce((acc, s) => acc + (s.episodesCompleted || 0), 0);
      finalTotalUnits = sumEps;
      
      if (column === 'completed') {
        finalProgress = 100;
        finalCurrentUnit = sumEps;
        finalSeasons = seasons.map((s) => ({ ...s, episodesCompleted: s.totalEpisodes }));
      } else if (column === 'backlog' && !editingItem) {
        finalProgress = 0;
        finalCurrentUnit = 0;
        finalSeasons = seasons.map((s) => ({ ...s, episodesCompleted: 0 }));
      } else {
        finalCurrentUnit = compEps;
        if (sumEps > 0) {
          finalProgress = Math.min(100, Math.max(0, Math.round((compEps / sumEps) * 100)));
        }
      }
    } else {
      if (column === 'completed') finalProgress = 100;
      if (column === 'backlog' && !editingItem) finalProgress = 0;
    }

    onSave({
      id: editingItem ? editingItem.id : undefined,
      category,
      title: title.trim(),
      creatorOrMeta: creatorOrMeta.trim(),
      column,
      progress: finalProgress,
      currentUnit: finalCurrentUnit,
      totalUnits: finalTotalUnits,
      unitName: category === 'series' ? 'episodes' : unitName,
      priority,
      rating,
      notes: notes.trim(),
      totalSeasons: category === 'series' ? (totalSeasons || seasons.length) : undefined,
      seasons: category === 'series' ? finalSeasons : undefined,
      currentSeason: category === 'series' ? currentSeason : undefined,
      currentEpisode: category === 'series' ? currentEpisode : undefined,
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

          {/* SERIES SPECIFIC SEASONS & EPISODES BREAKDOWN OR GENERIC UNITS */}
          {category === 'series' ? (
            <div className="p-4 rounded-xl border-2 border-black dark:border-white bg-yellow-50/50 dark:bg-yellow-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-titan text-xs uppercase tracking-wide text-black dark:text-white">
                  <Tv className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span>Series Season & Episode Breakdown</span>
                </div>
                {totalUnits !== undefined && totalUnits > 0 && (
                  <span className="font-mono-clean font-bold text-[11px] px-2 py-0.5 rounded-full border border-black dark:border-white bg-yellow-400 text-black">
                    {totalUnits} Total Episodes
                  </span>
                )}
              </div>

              {/* STEP 1: SELECT TOTAL SEASONS */}
              <div>
                <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                  1. Total Seasons *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={totalSeasons || ''}
                    onChange={(e) => handleTotalSeasonsChange(e.target.value)}
                    placeholder="Enter total seasons (e.g. 3, 5, 8)..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-white dark:bg-zinc-900 font-mono-clean text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {/* QUICK SEASON COUNTERS */}
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => handleTotalSeasonsChange(String(num))}
                        className={`px-2.5 py-1.5 rounded-lg border border-black dark:border-white font-mono-clean text-xs font-bold transition-colors ${
                          totalSeasons === num
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {num} S
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STEP 2: EXPANDED EPISODE INPUTS PER SEASON */}
              {totalSeasons !== undefined && totalSeasons > 0 && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="block text-xs font-mono-clean font-bold uppercase">
                      2. Total Episodes for each season:
                    </label>

                    {/* BULK APPLY HELPER */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        placeholder="All eps"
                        value={bulkEpisodeCount}
                        onChange={(e) => setBulkEpisodeCount(e.target.value)}
                        className="w-20 px-2 py-1 text-xs rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-900 font-mono-clean"
                      />
                      <button
                        type="button"
                        onClick={handleApplyBulkEpisodes}
                        disabled={!bulkEpisodeCount}
                        className="px-2 py-1 rounded-lg border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-mono-clean text-[10px] font-bold uppercase hover:opacity-80 disabled:opacity-40"
                      >
                        Set All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {seasons.map((season) => (
                      <div
                        key={season.seasonNumber}
                        className="p-2 rounded-xl border border-black dark:border-white bg-white dark:bg-zinc-900 flex flex-col gap-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono-clean font-bold">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            Season {season.seasonNumber}
                          </span>
                          <span className="text-[10px] text-zinc-400">eps</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={season.totalEpisodes || ''}
                          onChange={(e) =>
                            handleSeasonEpisodesChange(
                              season.seasonNumber,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          placeholder="e.g. 10"
                          className="w-full px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono-clean text-xs font-bold focus:outline-none focus:border-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
                  placeholder="e.g. 400 pages / 120 mins"
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
                  placeholder="pages, mins, hours, units"
                  className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm"
                />
              </div>
            </div>
          )}

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
