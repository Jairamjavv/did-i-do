import React, { useState, useEffect } from 'react';
import { TaskItem, ColumnType, SeasonDetail } from '../types';
import {
  Star,
  GripVertical,
  Trash2,
  Edit3,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Tv,
} from 'lucide-react';

interface TaskCardProps {
  item: TaskItem;
  onMoveColumn: (id: string, targetColumn: ColumnType) => void;
  onUpdateProgress: (id: string, newProgress: number) => void;
  onUpdateUnit: (id: string, currentUnit: number) => void;
  onUpdateRating: (id: string, rating: number) => void;
  onEditItem: (item: TaskItem) => void;
  onDeleteItem: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<TaskItem>) => void;
  isShrunk?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  item,
  onMoveColumn,
  onUpdateProgress,
  onUpdateUnit,
  onUpdateRating,
  onEditItem,
  onDeleteItem,
  onDragStart,
  onUpdateItem,
  isShrunk: propIsShrunk = false,
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLocallyShrunk, setIsLocallyShrunk] = useState<boolean | null>(null);

  // Series season tracking state
  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(item.currentSeason || 1);

  // Reset local override when the global board view mode changes
  useEffect(() => {
    setIsLocallyShrunk(null);
  }, [propIsShrunk]);

  // Keep active season in sync if item updates from outside
  useEffect(() => {
    if (item.currentSeason) {
      setActiveSeasonNum(item.currentSeason);
    }
  }, [item.currentSeason]);

  const isShrunk = isLocallyShrunk !== null ? isLocallyShrunk : propIsShrunk;

  const isBacklog = item.column === 'backlog';
  const isInProgress = item.column === 'in_progress';
  const isCompleted = item.column === 'completed';

  const isSeries = item.category === 'series' || Boolean(item.seasons && item.seasons.length > 0);

  // Derive resolved season list
  const seasonList: SeasonDetail[] = (item.seasons && item.seasons.length > 0)
    ? item.seasons
    : item.totalSeasons && item.totalSeasons > 0
    ? Array.from({ length: item.totalSeasons }, (_, i) => ({
        seasonNumber: i + 1,
        totalEpisodes: item.totalUnits ? Math.ceil(item.totalUnits / item.totalSeasons!) : 10,
        episodesCompleted: 0,
      }))
    : [{ seasonNumber: 1, totalEpisodes: item.totalUnits || 10, episodesCompleted: item.currentUnit || 0 }];

  // Currently active season detail object
  const currentSeasonObj = seasonList.find((s) => s.seasonNumber === activeSeasonNum) || seasonList[0];

  // Handler to update completed episodes for a selected season
  const handleSeasonEpisodeChange = (targetSeasonNum: number, targetEpisodeCount: number) => {
    const validEps = Math.max(0, targetEpisodeCount);
    const updatedSeasons: SeasonDetail[] = seasonList.map((s) => {
      if (s.seasonNumber < targetSeasonNum) {
        // Earlier seasons are fully completed
        return { ...s, episodesCompleted: s.totalEpisodes };
      } else if (s.seasonNumber === targetSeasonNum) {
        // Current selected season has targetEpisodeCount completed
        return { ...s, episodesCompleted: Math.min(s.totalEpisodes, validEps) };
      } else {
        // Later seasons not started yet
        return { ...s, episodesCompleted: 0 };
      }
    });

    const totalCompleted = updatedSeasons.reduce((acc, s) => acc + (s.episodesCompleted || 0), 0);
    const totalEps = updatedSeasons.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
    const newProgress = totalEps > 0 ? Math.min(100, Math.max(0, Math.round((totalCompleted / totalEps) * 100))) : 0;

    setActiveSeasonNum(targetSeasonNum);

    if (onUpdateItem) {
      onUpdateItem(item.id, {
        seasons: updatedSeasons,
        totalSeasons: updatedSeasons.length,
        currentSeason: targetSeasonNum,
        currentEpisode: Math.min(currentSeasonObj.totalEpisodes, validEps),
        currentUnit: totalCompleted,
        totalUnits: totalEps,
        progress: newProgress,
      });
    } else {
      onUpdateUnit(item.id, totalCompleted);
      onUpdateProgress(item.id, newProgress);
    }
  };

  /* ======================================================================== */
  /* SHRUNK / COMPACT CARD RENDER                                             */
  /* ======================================================================== */
  if (isShrunk) {
    // 1. SHRUNK IN PROGRESS: Card itself is a progress bar + name is clearly visible
    if (isInProgress) {
      return (
        <div
          draggable
          onDragStart={(e) => onDragStart(e, item.id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative overflow-hidden rounded-xl border-2 border-black dark:border-white bg-zinc-200 dark:bg-zinc-800 shadow-[3px_3px_0px_0px_rgba(234,179,8,1)] transition-all duration-200 select-none hover:scale-[1.01]"
        >
          {/* PROGRESS BAR FILL (YELLOW) */}
          <div
            className="absolute inset-y-0 left-0 bg-yellow-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
          />

          {/* CARD CONTENT LAYER ON TOP */}
          <div className="relative z-10 p-2.5 sm:p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="cursor-grab active:cursor-grabbing text-black/70 hover:text-black flex-shrink-0"
                title="Drag card"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <h4
                className="font-titan text-xs sm:text-sm font-bold text-black drop-shadow-sm truncate"
                title={item.title}
              >
                {item.title}
              </h4>
              {isSeries && (
                <span className="font-mono-clean font-bold text-[9px] px-1.5 py-0.5 rounded bg-black/15 text-black flex-shrink-0">
                  S{item.currentSeason || 1} E{item.currentEpisode || 0}
                </span>
              )}
            </div>

            {/* CONTROLS & PERCENT BADGE */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-titan text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border border-black/30 bg-white/90 text-black font-black shadow-xs">
                {item.progress}%
              </span>

              {/* EXPAND TOGGLE */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocallyShrunk(false);
                }}
                className="p-1 rounded hover:bg-black/10 text-black transition-colors"
                title="Expand card details"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* MOVE TO COMPLETED */}
              <button
                onClick={() => onMoveColumn(item.id, 'completed')}
                className="p-1 rounded bg-black text-white hover:bg-zinc-800 transition-colors"
                title="Mark as Completed"
              >
                <ArrowRight className="w-3 h-3" />
              </button>

              {/* EDIT ITEM */}
              <button
                onClick={() => onEditItem(item)}
                className="p-1 rounded hover:bg-black/10 text-black/80 hover:text-black"
                title="Edit item"
              >
                <Edit3 className="w-3 h-3" />
              </button>

              {/* DELETE ITEM */}
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1 rounded hover:bg-black/10 text-black/80 hover:text-red-700"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. SHRUNK COMPLETED: Completely green card with white text
    if (isCompleted) {
      return (
        <div
          draggable
          onDragStart={(e) => onDragStart(e, item.id)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative rounded-xl border-2 border-black dark:border-white bg-green-500 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-white transition-all duration-200 select-none hover:scale-[1.01]"
        >
          <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="cursor-grab active:cursor-grabbing text-white/80 hover:text-white flex-shrink-0"
                title="Drag card"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
              <h4
                className="font-titan text-xs sm:text-sm font-bold text-white truncate"
                title={item.title}
              >
                {item.title}
              </h4>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.rating && (
                <div className="hidden sm:flex items-center gap-0.5 mr-1">
                  <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                  <span className="text-[11px] font-mono-clean font-bold">{item.rating}</span>
                </div>
              )}

              {/* EXPAND TOGGLE */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocallyShrunk(false);
                }}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                title="Expand card details"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* MOVE BACK TO IN PROGRESS */}
              <button
                onClick={() => onMoveColumn(item.id, 'in_progress')}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                title="Move back to In Progress"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>

              {/* EDIT ITEM */}
              <button
                onClick={() => onEditItem(item)}
                className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-white"
                title="Edit item"
              >
                <Edit3 className="w-3 h-3" />
              </button>

              {/* DELETE ITEM */}
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-red-200"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 3. SHRUNK BACKLOG / OTHER: Show name of card cleanly
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative p-2.5 sm:p-3 rounded-xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-black dark:hover:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-200 select-none hover:scale-[1.01]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-black dark:hover:text-white flex-shrink-0"
              title="Drag card"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <h4
              className="font-titan text-xs sm:text-sm font-bold text-black dark:text-white truncate"
              title={item.title}
            >
              {item.title}
            </h4>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {item.priority && (
              <span
                className={`text-[9px] font-mono-clean font-bold uppercase px-1.5 py-0.5 rounded border hidden sm:inline-block ${
                  item.priority === 'high'
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {item.priority}
              </span>
            )}

            {/* EXPAND TOGGLE */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLocallyShrunk(false);
              }}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
              title="Expand card details"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* START BUTTON */}
            <button
              onClick={() => onMoveColumn(item.id, 'in_progress')}
              className="px-2 py-0.5 rounded border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-titan text-[9px] hover:opacity-80 transition-opacity flex items-center gap-1"
              title="Start - Move to In Progress"
            >
              <span>Start</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>

            {/* EDIT ITEM */}
            <button
              onClick={() => onEditItem(item)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white"
              title="Edit item"
            >
              <Edit3 className="w-3 h-3" />
            </button>

            {/* DELETE ITEM */}
            <button
              onClick={() => onDeleteItem(item.id)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
              title="Delete item"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ======================================================================== */
  /* EXPANDED CARD RENDER (FULL DETAILS)                                       */
  /* ======================================================================== */
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative p-4 rounded-xl border-2 transition-all duration-200 select-none ${
        isInProgress
          ? 'border-black dark:border-white bg-white dark:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]'
          : isCompleted
          ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900/90 shadow-[4px_4px_0px_0px_rgba(34,197,94,1)]'
          : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-black dark:hover:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]'
      }`}
    >
      {/* CARD HEADER & DRAG HANDLE */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1">
          <div
            className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-black dark:hover:text-white pt-0.5"
            title="Drag to reorder or shift columns"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-titan text-sm leading-snug text-black dark:text-white">
              {item.title}
            </h4>
            {item.creatorOrMeta && (
              <p className="text-[11px] font-mono-clean text-zinc-500 dark:text-zinc-400 mt-0.5">
                {item.creatorOrMeta}
              </p>
            )}
          </div>
        </div>

        {/* HEADER CONTROLS (PRIORITY & SHRINK BUTTON) */}
        <div className="flex items-center gap-1.5">
          {item.priority && (
            <span
              className={`text-[9px] font-mono-clean font-bold uppercase px-2 py-0.5 rounded border ${
                item.priority === 'high'
                  ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {item.priority}
            </span>
          )}

          {/* SHRINK CARD BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLocallyShrunk(true);
            }}
            className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
            title="Shrink card"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR SECTION */}
      <div className="my-3 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono-clean">
          <span className="text-zinc-500 dark:text-zinc-400">
            {item.totalUnits && item.totalUnits > 0 ? (
              <>
                {item.currentUnit || 0} / {item.totalUnits} {item.unitName || 'units'}
              </>
            ) : (
              'Progress'
            )}
          </span>
          <span className="font-titan text-xs font-bold">
            {item.progress}%
          </span>
        </div>

        {/* COLOR SPECIFIC PROGRESS BAR (YELLOW FOR IN_PROGRESS, GREEN FOR COMPLETED) */}
        <div className="w-full h-3 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-black dark:border-white p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-green-500'
                : isInProgress
                ? 'bg-yellow-400'
                : 'bg-zinc-400 dark:bg-zinc-600'
            }`}
            style={{ width: `${item.progress}%` }}
          />
        </div>

        {/* INTERACTIVE CONTROLS FOR IN_PROGRESS ITEMS */}
        {isInProgress && (
          <div className="pt-2 space-y-2.5">
            {isSeries ? (
              <div className="p-2.5 rounded-xl border-2 border-black dark:border-white bg-yellow-50/60 dark:bg-yellow-950/30 space-y-2">
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono-clean font-bold">
                  <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                    <Tv className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    <span>Season:</span>
                  </div>
                  <select
                    value={activeSeasonNum}
                    onChange={(e) => setActiveSeasonNum(Number(e.target.value))}
                    className="px-2 py-1 text-xs font-mono-clean font-bold rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white focus:outline-none cursor-pointer"
                  >
                    {seasonList.map((s) => (
                      <option key={s.seasonNumber} value={s.seasonNumber}>
                        Season {s.seasonNumber} ({s.episodesCompleted || 0}/{s.totalEpisodes} eps)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 dark:border-white/10">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono-clean font-bold uppercase text-zinc-500">
                      Season {activeSeasonNum} Episode:
                    </span>
                    <p className="font-titan text-xs text-black dark:text-white truncate">
                      {currentSeasonObj.episodesCompleted || 0} of {currentSeasonObj.totalEpisodes} done
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleSeasonEpisodeChange(
                          activeSeasonNum,
                          (currentSeasonObj.episodesCompleted || 0) - 1
                        )
                      }
                      disabled={(currentSeasonObj.episodesCompleted || 0) <= 0}
                      className="p-1.5 rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="-1 Episode"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <select
                      value={currentSeasonObj.episodesCompleted || 0}
                      onChange={(e) =>
                        handleSeasonEpisodeChange(activeSeasonNum, Number(e.target.value))
                      }
                      className="px-2 py-1 text-xs font-mono-clean font-bold rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-800 text-center cursor-pointer"
                    >
                      <option value={0}>0 (Start)</option>
                      {Array.from({ length: currentSeasonObj.totalEpisodes }, (_, i) => i + 1).map(
                        (ep) => (
                          <option key={ep} value={ep}>
                            Ep {ep} {ep === currentSeasonObj.totalEpisodes ? '🏁' : ''}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        handleSeasonEpisodeChange(
                          activeSeasonNum,
                          (currentSeasonObj.episodesCompleted || 0) + 1
                        )
                      }
                      disabled={(currentSeasonObj.episodesCompleted || 0) >= currentSeasonObj.totalEpisodes}
                      className="p-1.5 rounded-lg border border-black dark:border-white bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="+1 Episode"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={item.progress}
                  onChange={(e) => onUpdateProgress(item.id, Number(e.target.value))}
                  className="w-full accent-yellow-500 cursor-pointer h-1.5"
                />

                {item.totalUnits && item.totalUnits > 0 && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] font-mono-clean text-zinc-500">
                      Update {item.unitName || 'unit'}:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateUnit(item.id, Math.max(0, (item.currentUnit || 0) - 10))}
                        className="p-1 rounded border border-black dark:border-white hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        title="-10 units"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-mono-clean font-bold px-1 min-w-[2.5rem] text-center">
                        {item.currentUnit || 0}
                      </span>
                      <button
                        onClick={() => onUpdateUnit(item.id, Math.min(item.totalUnits || 100, (item.currentUnit || 0) + 10))}
                        className="p-1 rounded border border-black dark:border-white hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        title="+10 units"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* COMPLETED RATING STARS */}
      {isCompleted && (
        <div className="mb-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
          <span className="text-[10px] font-mono-clean text-zinc-500">Rating:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onUpdateRating(item.id, star)}
                className="hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    (item.rating || 0) >= star
                      ? 'fill-yellow-400 text-yellow-500'
                      : 'text-zinc-300 dark:text-zinc-700'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NOTES TOGGLE */}
      {item.notes && (
        <div className="my-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-[10px] font-mono-clean text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" />
            {showNotes ? 'Hide notes' : 'View notes'}
          </button>
          {showNotes && (
            <p className="mt-1.5 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono-clean text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 italic">
              "{item.notes}"
            </p>
          )}
        </div>
      )}

      {/* CARD FOOTER & QUICK COLUMN SHIFT CONTROLS */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] font-mono-clean text-zinc-400">
        <span className="capitalize">
          {isCompleted && item.completedAt
            ? `Done ${new Date(item.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : item.category}
        </span>

        <div className="flex items-center gap-1.5">
          {/* MOVE BACK TO BACKLOG */}
          {!isBacklog && (
            <button
              onClick={() => onMoveColumn(item.id, isCompleted ? 'in_progress' : 'backlog')}
              className="p-1 rounded border border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-black dark:text-white transition-colors"
              title={isCompleted ? 'Move to In Progress' : 'Move to Backlog'}
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}

          {/* MOVE FORWARD COLUMN */}
          {!isCompleted && (
            <button
              onClick={() => onMoveColumn(item.id, isBacklog ? 'in_progress' : 'completed')}
              className="px-2 py-1 rounded border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-titan text-[9px] hover:opacity-80 transition-opacity flex items-center gap-1"
              title={isBacklog ? 'Move to In Progress' : 'Mark as Completed'}
            >
              <span>{isBacklog ? 'Start' : 'Complete'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* EDIT ITEM */}
          <button
            onClick={() => onEditItem(item)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white"
            title="Edit item"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {/* DELETE ITEM */}
          <button
            onClick={() => onDeleteItem(item.id)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
            title="Delete item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
