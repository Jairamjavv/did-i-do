import React from 'react';
import { ActivityCategory, CategoryInfo, TaskItem, CompletionLogEntry, DEFAULT_CATEGORIES } from '../types';
import { 
  CheckCircle2, 
  BookOpen, 
  Film, 
  Tv, 
  Gamepad2, 
  ArrowRight, 
  Activity, 
  Award, 
  Star, 
  Plus, 
  Flame, 
  Clock, 
  Layers,
  Sparkles
} from 'lucide-react';

interface SummaryDashboardProps {
  items: TaskItem[];
  onSelectCategory: (category: ActivityCategory) => void;
  onOpenAddItem: (category: ActivityCategory, column?: 'backlog') => void;
  categories?: CategoryInfo[];
  userName?: string;
  fifoQueue?: CompletionLogEntry[];
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-6 h-6" />,
  Film: <Film className="w-6 h-6" />,
  Tv: <Tv className="w-6 h-6" />,
  Gamepad2: <Gamepad2 className="w-6 h-6" />,
};

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  items,
  onSelectCategory,
  onOpenAddItem,
  categories = DEFAULT_CATEGORIES,
  userName,
  fifoQueue = [],
}) => {
  const totalItems = items.length;
  const totalCompleted = items.filter((i) => i.column === 'completed').length;
  const totalInProgress = items.filter((i) => i.column === 'in_progress').length;
  const totalBacklog = items.filter((i) => i.column === 'backlog').length;

  const overallFinishedPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Fallback: If fifoQueue is empty but completed items exist in local state, derive top 6
  const displayQueue: Array<{
    id: string;
    title: string;
    category: string;
    creatorOrMeta?: string;
    rating?: number;
    completedAt: string;
    durationText?: string;
    streakDays?: number;
    has3DayStreak?: boolean;
  }> = fifoQueue.length > 0 
    ? fifoQueue.slice(-6) 
    : items
        .filter((i) => i.column === 'completed')
        .sort((a, b) => new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime())
        .slice(-6)
        .map((item) => {
          const cAt = new Date(item.completedAt || Date.now()).getTime();
          const crAt = new Date(item.createdAt || Date.now()).getTime();
          const dDays = Math.max(0, Math.floor((cAt - crAt) / (1000 * 60 * 60 * 24)));
          return {
            id: item.id,
            title: item.title,
            category: item.category,
            creatorOrMeta: item.creatorOrMeta,
            rating: item.rating,
            completedAt: item.completedAt || new Date().toISOString(),
            durationText: dDays > 0 ? `${dDays}d` : '<1d',
            streakDays: 0,
            has3DayStreak: false,
          };
        });

  return (
    <div className="space-y-8">

      {/* SUMMARY BANNER */}
      <div className="p-6 sm:p-8 rounded-2xl border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black shadow-[6px_6px_0px_0px_rgba(100,100,100,0.5)] relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/30 dark:border-black/30 bg-white/10 dark:bg-black/10 text-xs font-mono-clean font-bold uppercase mb-3">
            <Award className="w-4 h-4 text-yellow-400" />
            {userName ? `Welcome back, ${userName}!` : 'Global Progress Overview'}
          </div>
          <h2 className="font-titan text-3xl sm:text-4xl tracking-wide uppercase leading-tight">
            {userName ? `${userName}'s Did I Do Hub` : 'Did I Do Summary'}
          </h2>
          <p className="font-minion text-sm sm:text-base opacity-80 mt-2">
            Tracking finished books, watched movies, completed series, and beaten games across your personal JSON metadata logs.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20">
              <p className="text-[10px] font-mono-clean uppercase opacity-75">Finished Total</p>
              <p className="font-titan text-2xl text-green-400 dark:text-green-600">{totalCompleted} items</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20">
              <p className="text-[10px] font-mono-clean uppercase opacity-75">In Progress</p>
              <p className="font-titan text-2xl text-yellow-400 dark:text-yellow-600">{totalInProgress} active</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20">
              <p className="text-[10px] font-mono-clean uppercase opacity-75">Backlog Todos</p>
              <p className="font-titan text-2xl">{totalBacklog} queued</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECENTLY FINISHED: FIFO QUEUE TRAIN CARRIAGE STRIP (TOP 0-6 SHRUNK BOXES) */}
      <div className="p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b-2 border-black dark:border-white pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500 text-white rounded-lg border border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-titan text-lg uppercase tracking-wide flex items-center gap-2">
                Recently Completed Activities
              </h3>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                FIFO Queue (Max 6 Shrunk Carriages • No Chains • Oldest Rolls Off)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-clean font-bold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded border border-black dark:border-white">
              {displayQueue.length} / 6 Carriages Active
            </span>
            <span className="text-xs font-mono-clean font-bold px-2.5 py-1 bg-green-500 text-white rounded-full">
              {totalCompleted} Total
            </span>
          </div>
        </div>

        {/* 0-6 DISCONNECTED CARRIAGES HORIZONTAL STACK (NO CHAINS/CONNECTIONS) */}
        {displayQueue.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center">
            <p className="text-xs font-mono-clean text-zinc-400 italic">
              No completed carriages yet! Move any activity to Completed column to launch carriage #1 in this FIFO track.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* HORIZONTAL CARRIAGES CONTAINER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {displayQueue.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border-2 border-black dark:border-white bg-green-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 min-h-[120px] relative overflow-hidden group"
                >
                  {/* TOP HEADER: CARRIAGE INDEX & CATEGORY */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-mono text-[9px] font-black px-1.5 py-0.5 bg-black text-white rounded uppercase">
                      #{idx + 1} FIFO
                    </span>
                    <span className="font-mono text-[8px] font-black uppercase tracking-wider text-green-100 bg-green-700/60 px-1.5 py-0.5 rounded truncate max-w-[70px]">
                      {item.category}
                    </span>
                  </div>

                  {/* SHRUNK TITLE & META */}
                  <div className="my-1">
                    <h4 
                      className="font-titan text-xs uppercase leading-tight line-clamp-2 drop-shadow-xs"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    {item.creatorOrMeta && (
                      <p className="font-mono text-[9px] text-green-100 truncate mt-0.5 opacity-90">
                        {item.creatorOrMeta}
                      </p>
                    )}
                  </div>

                  {/* BOTTOM STATS: DURATION & 3-DAY STREAK BADGE */}
                  <div className="pt-1.5 border-t border-green-400/40 flex items-center justify-between text-[9px] font-mono font-bold">
                    {/* DURATION BADGE */}
                    <div className="flex items-center gap-1 text-green-100" title={`Duration to complete: ${item.durationText || '<1d'}`}>
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.durationText || '<1d'}</span>
                    </div>

                    {/* 3-DAY CONSECUTIVE STREAK BADGE */}
                    {item.has3DayStreak ? (
                      <div 
                        className="flex items-center gap-0.5 px-1 py-0.2 bg-yellow-400 text-black font-black rounded text-[8px] shadow-xs" 
                        title={`3-Day Streak Achieved (${item.streakDays || 3} days in a row)!`}
                      >
                        <Flame className="w-2.5 h-2.5 fill-black text-black" />
                        <span>{item.streakDays}d Streak</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 text-green-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Done</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* FIFO FLOW EXPLANATION FOOTNOTE */}
            <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Carriages stack from left to right. When 7th card finishes, carriage #1 pops out.
              </span>
              <span className="hidden sm:inline">
                Synced to User Log Table
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CATEGORIES GRID OVERVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-titan text-xl uppercase tracking-wide">
            Activity Categories Breakdown
          </h3>
          <span className="text-xs font-mono-clean text-zinc-500">
            Leisure Categories
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat.id);
            const total = catItems.length;
            const completed = catItems.filter((i) => i.column === 'completed').length;
            const inProg = catItems.filter((i) => i.column === 'in_progress').length;
            const backlog = catItems.filter((i) => i.column === 'backlog').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            const isConstraintMet = inProg >= 3 && inProg <= 5;

            return (
              <div
                key={cat.id}
                className="p-5 rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-zinc-950 flex flex-col justify-between hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black">
                      {CATEGORY_ICONS[cat.iconName]}
                    </div>
                    <span
                      className={`text-[10px] font-mono-clean font-bold px-2.5 py-1 rounded-full border ${isConstraintMet
                          ? 'border-black dark:border-white bg-zinc-100 dark:bg-zinc-800'
                          : 'border-yellow-500 bg-yellow-400 text-black font-bold'
                        }`}
                    >
                      {inProg}/3-5 Active
                    </span>
                  </div>

                  <h4 className="font-titan text-xl uppercase">{cat.name}</h4>
                  <p className="text-xs font-mono-clean text-zinc-500 dark:text-zinc-400 capitalize mb-4">
                    Currently {cat.verb}
                  </p>

                  {/* MINI PROGRESS METRICS */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs font-mono-clean">
                      <span className="text-zinc-500">Completion</span>
                      <span className="font-titan text-green-600 dark:text-green-400">{completed} finished ({pct}%)</span>
                    </div>

                    {/* DUAL PROGRESS INDICATOR (GREEN FOR FINISHED, YELLOW FOR IN PROGRESS) */}
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-3 rounded-full overflow-hidden border border-black/20 dark:border-white/20 p-0.5 flex">
                      <div
                        className="bg-green-500 h-full rounded-l-full"
                        style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                        title={`${completed} finished`}
                      />
                      <div
                        className="bg-yellow-400 h-full"
                        style={{ width: `${total > 0 ? (inProg / total) * 100 : 0}%` }}
                        title={`${inProg} in progress`}
                      />
                    </div>
                  </div>

                  {/* BREAKDOWN METRICS */}
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-mono-clean p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <p className="text-zinc-400">Backlog</p>
                      <p className="font-bold">{backlog}</p>
                    </div>
                    <div>
                      <p className="text-yellow-600 dark:text-yellow-400 font-bold">In Prog</p>
                      <p className="font-bold text-yellow-600 dark:text-yellow-400">{inProg}</p>
                    </div>
                    <div>
                      <p className="text-green-600 dark:text-green-400 font-bold">Done</p>
                      <p className="font-bold text-green-600 dark:text-green-400">{completed}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectCategory(cat.id)}
                  className="mt-4 w-full py-2 px-3 rounded-xl border-2 border-black dark:border-white bg-zinc-100 dark:bg-zinc-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-xs font-mono-clean font-bold uppercase flex items-center justify-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <span>Open {cat.name} Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
