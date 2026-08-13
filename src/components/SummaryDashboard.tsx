import React from 'react';
import { ActivityCategory, CategoryInfo, TaskItem } from '../types';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/initialData';
import { CheckCircle2, BookOpen, Film, Tv, Gamepad2, ArrowRight, Activity, Award, Star, Plus } from 'lucide-react';

interface SummaryDashboardProps {
  items: TaskItem[];
  onSelectCategory: (category: ActivityCategory) => void;
  onOpenAddItem: (category: ActivityCategory, column?: 'backlog') => void;
  categories?: CategoryInfo[];
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
}) => {
  const totalItems = items.length;
  const totalCompleted = items.filter((i) => i.column === 'completed').length;
  const totalInProgress = items.filter((i) => i.column === 'in_progress').length;
  const totalBacklog = items.filter((i) => i.column === 'backlog').length;

  const overallFinishedPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Recently finished items
  const recentCompleted = items
    .filter((i) => i.column === 'completed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-8">
      
      {/* SUMMARY BANNER */}
      <div className="p-6 sm:p-8 rounded-2xl border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black shadow-[6px_6px_0px_0px_rgba(100,100,100,0.5)] relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/30 dark:border-black/30 bg-white/10 dark:bg-black/10 text-xs font-mono-clean font-bold uppercase mb-3">
            <Award className="w-4 h-4 text-yellow-400" />
            Global Progress Overview
          </div>
          <h2 className="font-titan text-3xl sm:text-4xl tracking-wide uppercase leading-tight">
            Did I Do Summary
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

      {/* CATEGORIES GRID OVERVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-titan text-xl uppercase tracking-wide">
            Activity Categories Breakdown
          </h3>
          <span className="text-xs font-mono-clean text-zinc-500">
            4 Core Media Hubs
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
                      className={`text-[10px] font-mono-clean font-bold px-2.5 py-1 rounded-full border ${
                        isConstraintMet
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
                      <p className="font-bold">{inProg}</p>
                    </div>
                    <div>
                      <p className="text-green-600 dark:text-green-400 font-bold">Done</p>
                      <p className="font-bold">{completed}</p>
                    </div>
                  </div>
                </div>

                {/* FOOTER ACTION BUTTONS */}
                <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={() => onOpenAddItem(cat.id, 'backlog')}
                    className="text-xs font-mono-clean text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add todo
                  </button>
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className="px-3 py-1.5 rounded-lg border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-titan text-xs hover:opacity-80 transition-opacity flex items-center gap-1"
                  >
                    <span>View Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECENTLY FINISHED HALL OF FAME */}
      <div className="p-6 rounded-2xl border-2 border-black dark:border-white bg-white dark:bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-titan text-xl uppercase tracking-wide">
              Recently Completed Activities
            </h3>
          </div>
          <span className="text-xs font-mono-clean font-bold px-2.5 py-1 bg-green-500 text-white rounded-full">
            {totalCompleted} Finished Total
          </span>
        </div>

        {recentCompleted.length === 0 ? (
          <p className="text-xs font-mono-clean text-zinc-400 py-6 text-center italic">
            No finished items yet! Move items to Completed column to celebrate here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentCompleted.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 space-y-2 hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-mono-clean uppercase px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                      {item.category}
                    </span>
                    <h4 className="font-titan text-sm mt-1.5 leading-tight">
                      {item.title}
                    </h4>
                    {item.creatorOrMeta && (
                      <p className="text-[10px] font-mono-clean text-zinc-500">
                        {item.creatorOrMeta}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>

                {/* 100% GREEN PROGRESS BAR */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden border border-black/20">
                  <div className="bg-green-500 h-full w-full" />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono-clean pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400">
                    {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'Completed'}
                  </span>
                  {item.rating && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-500" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
