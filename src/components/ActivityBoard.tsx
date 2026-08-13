import React, { useState } from 'react';
import { ActivityCategory, ColumnType, TaskItem } from '../types';
import { CATEGORIES } from '../data/initialData';
import { TaskCard } from './TaskCard';
import { Plus, Sliders, AlertTriangle, CheckCircle2, ArrowUpDown, Filter, Maximize2, Minimize2 } from 'lucide-react';

interface ActivityBoardProps {
  category: ActivityCategory;
  items: TaskItem[];
  onMoveColumn: (id: string, targetColumn: ColumnType) => boolean;
  onUpdateProgress: (id: string, newProgress: number) => void;
  onUpdateUnit: (id: string, currentUnit: number) => void;
  onUpdateRating: (id: string, rating: number) => void;
  onOpenAddItem: (column?: ColumnType) => void;
  onEditItem: (item: TaskItem) => void;
  onDeleteItem: (id: string) => void;
  searchQuery: string;
}

export const ActivityBoard: React.FC<ActivityBoardProps> = ({
  category,
  items,
  onMoveColumn,
  onUpdateProgress,
  onUpdateUnit,
  onUpdateRating,
  onOpenAddItem,
  onEditItem,
  onDeleteItem,
  searchQuery,
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnType | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'progress' | 'priority' | 'title'>('default');
  const [isShrunkAll, setIsShrunkAll] = useState(false);

  const categoryMeta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  // Filter items for this category and search query
  const categoryItems = items.filter((item) => {
    if (item.category !== category) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.creatorOrMeta && item.creatorOrMeta.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query))
    );
  });

  // Sort items
  const sortItems = (list: TaskItem[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'priority') {
        const pMap = { high: 3, medium: 2, low: 1 };
        return (pMap[b.priority || 'low'] || 1) - (pMap[a.priority || 'low'] || 1);
      }
      return 0; // default order
    });
  };

  const backlogItems = sortItems(categoryItems.filter((i) => i.column === 'backlog'));
  const inProgressItems = sortItems(categoryItems.filter((i) => i.column === 'in_progress'));
  const completedItems = sortItems(categoryItems.filter((i) => i.column === 'completed'));

  // Constraint validation for InProgress: min 3, max 5
  const inProgCount = inProgressItems.length;
  const isMinValid = inProgCount >= 3;
  const isMaxValid = inProgCount <= 5;
  const isConstraintMet = isMinValid && isMaxValid;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, col: ColumnType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== col) {
      setDragOverColumn(col);
    }
  };

  const handleDragLeave = (e: React.DragEvent, col: ColumnType) => {
    e.preventDefault();
    if (dragOverColumn === col) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumn: ColumnType) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (id) {
      onMoveColumn(id, targetColumn);
      setDraggedItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CATEGORY HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-titan text-2xl uppercase tracking-wide">
              {categoryMeta.name}
            </h2>
            <span className="text-xs font-mono-clean font-bold px-2 py-0.5 rounded-full border border-black dark:border-white bg-zinc-100 dark:bg-zinc-800 capitalize">
              {categoryMeta.verb}
            </span>
          </div>
          <p className="text-xs font-mono-clean text-zinc-500 dark:text-zinc-400 mt-1">
            Track reading, watching, or gaming progress with yellow/green progress bars.
          </p>
        </div>

        {/* CONTROLS & ADD BUTTON */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* SHRINK / EXPAND CARDS TOGGLE */}
          <button
            onClick={() => setIsShrunkAll(!isShrunkAll)}
            className={`px-3 py-1.5 rounded-xl border-2 border-black dark:border-white font-mono-clean text-xs font-bold flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              isShrunkAll
                ? 'bg-yellow-400 text-black border-black font-black'
                : 'bg-zinc-50 dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
            title={isShrunkAll ? 'Expand all cards' : 'Shrink all cards'}
          >
            {isShrunkAll ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{isShrunkAll ? 'Expand Cards' : 'Shrink Cards'}</span>
          </button>

          {/* SORT DROPDOWN */}
          <div className="flex items-center gap-1.5 border-2 border-black dark:border-white px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs font-mono-clean">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none font-bold cursor-pointer"
            >
              <option value="default">Sort: Default</option>
              <option value="progress">Sort: Progress %</option>
              <option value="priority">Sort: Priority</option>
              <option value="title">Sort: Title</option>
            </select>
          </div>

          {/* ADD ITEM BUTTON */}
          <button
            onClick={() => onOpenAddItem('backlog')}
            className="px-4 py-2 rounded-xl border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-titan text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(100,100,100,0.5)] active:translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* CONSTRAINT ALERT BANNER IF NOT MEETING MIN 3 OR MAX 5 */}
      {!isConstraintMet && (
        <div
          className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 text-xs font-mono-clean ${
            !isMinValid
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40 text-black dark:text-yellow-200'
              : 'border-red-500 bg-red-50 dark:bg-red-950/40 text-black dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <span>
              {!isMinValid
                ? `In Progress column has ${inProgCount} items. Requirement: Minimum 3 tasks in progress for optimal momentum!`
                : `In Progress column has ${inProgCount} items. Limit exceeded: Maximum 5 tasks allowed in progress!`}
            </span>
          </div>
          <button
            onClick={() => onOpenAddItem('in_progress')}
            className="px-2.5 py-1 rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-900 font-titan text-[10px] uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            Adjust Items
          </button>
        </div>
      )}

      {/* 3 KANBAN COLUMNS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN 1: BACKLOG */}
        <div
          onDragOver={(e) => handleDragOver(e, 'backlog')}
          onDragLeave={(e) => handleDragLeave(e, 'backlog')}
          onDrop={(e) => handleDrop(e, 'backlog')}
          className={`rounded-2xl border-2 p-4 transition-all ${
            dragOverColumn === 'backlog'
              ? 'border-black dark:border-white bg-zinc-200 dark:bg-zinc-800 ring-2 ring-black dark:ring-white scale-[1.01]'
              : 'border-black dark:border-white bg-zinc-100/80 dark:bg-zinc-950/80'
          }`}
        >
          {/* COLUMN HEADER */}
          <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-black dark:bg-white inline-block" />
              <h3 className="font-titan text-base uppercase tracking-wide">
                Backlog
              </h3>
              <span className="text-xs font-mono-clean font-bold px-2 py-0.5 rounded-full border border-black dark:border-white bg-white dark:bg-zinc-900">
                {backlogItems.length}
              </span>
            </div>

            <button
              onClick={() => onOpenAddItem('backlog')}
              className="p-1 rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              title="Add backlog todo item"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-mono-clean text-zinc-500 dark:text-zinc-400 mb-3">
            Acts as a todo list. Drag items to In Progress when ready.
          </p>

          {/* CARD LIST */}
          <div className="space-y-3 min-h-[160px]">
            {backlogItems.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-xs font-mono-clean text-zinc-400 mb-2">
                  Backlog is empty!
                </p>
                <button
                  onClick={() => onOpenAddItem('backlog')}
                  className="text-xs font-titan underline hover:text-black dark:hover:text-white"
                >
                  + Add task todo
                </button>
              </div>
            ) : (
              backlogItems.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  onMoveColumn={onMoveColumn}
                  onUpdateProgress={onUpdateProgress}
                  onUpdateUnit={onUpdateUnit}
                  onUpdateRating={onUpdateRating}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDragStart={handleDragStart}
                  isShrunk={isShrunkAll}
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS */}
        <div
          onDragOver={(e) => handleDragOver(e, 'in_progress')}
          onDragLeave={(e) => handleDragLeave(e, 'in_progress')}
          onDrop={(e) => handleDrop(e, 'in_progress')}
          className={`rounded-2xl border-2 p-4 transition-all relative ${
            dragOverColumn === 'in_progress'
              ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/30 ring-2 ring-yellow-400 scale-[1.01]'
              : 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/40'
          }`}
        >
          {/* COLUMN HEADER */}
          <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black inline-block animate-pulse" />
              <h3 className="font-titan text-base uppercase tracking-wide">
                In Progress
              </h3>
              <span
                className={`text-xs font-mono-clean font-bold px-2 py-0.5 rounded-full border ${
                  isConstraintMet
                    ? 'border-black dark:border-white bg-yellow-400 text-black'
                    : 'border-red-500 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300'
                }`}
                title="Strict Limit: Min 3, Max 5 tasks"
              >
                {inProgCount} / [3-5]
              </span>
            </div>

            <button
              onClick={() => onOpenAddItem('in_progress')}
              className="p-1 rounded-lg border border-black dark:border-white bg-yellow-400 text-black hover:bg-yellow-500 transition-colors"
              title="Add item directly to In Progress"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-mono-clean text-zinc-500 dark:text-zinc-400 mb-3">
            Yellow progress bars. <strong>Min 3 & Max 5 items limit.</strong>
          </p>

          {/* CARD LIST */}
          <div className="space-y-3 min-h-[160px]">
            {inProgressItems.length === 0 ? (
              <div className="border-2 border-dashed border-yellow-400/60 rounded-xl p-6 text-center bg-yellow-50/30 dark:bg-yellow-950/10">
                <p className="text-xs font-mono-clean text-zinc-500 dark:text-zinc-400 mb-2">
                  No tasks currently in progress!
                </p>
                <p className="text-[11px] font-mono-clean text-yellow-700 dark:text-yellow-400 font-bold">
                  Drag items here to reach min 3 tasks!
                </p>
              </div>
            ) : (
              inProgressItems.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  onMoveColumn={onMoveColumn}
                  onUpdateProgress={onUpdateProgress}
                  onUpdateUnit={onUpdateUnit}
                  onUpdateRating={onUpdateRating}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDragStart={handleDragStart}
                  isShrunk={isShrunkAll}
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: COMPLETED */}
        <div
          onDragOver={(e) => handleDragOver(e, 'completed')}
          onDragLeave={(e) => handleDragLeave(e, 'completed')}
          onDrop={(e) => handleDrop(e, 'completed')}
          className={`rounded-2xl border-2 p-4 transition-all ${
            dragOverColumn === 'completed'
              ? 'border-green-500 bg-green-50/50 dark:bg-green-950/30 ring-2 ring-green-500 scale-[1.01]'
              : 'border-black dark:border-white bg-zinc-100/80 dark:bg-zinc-950/80'
          }`}
        >
          {/* COLUMN HEADER */}
          <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              <h3 className="font-titan text-base uppercase tracking-wide">
                Completed
              </h3>
              <span className="text-xs font-mono-clean font-bold px-2 py-0.5 rounded-full border border-black dark:border-white bg-green-500 text-white">
                {completedItems.length}
              </span>
            </div>

            <button
              onClick={() => onOpenAddItem('completed')}
              className="p-1 rounded-lg border border-black dark:border-white bg-green-500 text-white hover:bg-green-600 transition-colors"
              title="Add completed item"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-mono-clean text-zinc-500 dark:text-zinc-400 mb-3">
            Finished activities displaying 100% <strong>Green progress bars</strong>.
          </p>

          {/* CARD LIST */}
          <div className="space-y-3 min-h-[160px]">
            {completedItems.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-xs font-mono-clean text-zinc-400">
                  No completed items yet. Complete tasks to see them turn green!
                </p>
              </div>
            ) : (
              completedItems.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  onMoveColumn={onMoveColumn}
                  onUpdateProgress={onUpdateProgress}
                  onUpdateUnit={onUpdateUnit}
                  onUpdateRating={onUpdateRating}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDragStart={handleDragStart}
                  isShrunk={isShrunkAll}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
