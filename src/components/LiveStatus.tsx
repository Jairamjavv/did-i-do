import React, { useState } from 'react';
import { ActivityCategory, TaskItem } from '../types';
import { Activity, AlertTriangle, CheckCircle, Clock, ChevronUp, ChevronDown, Sliders, X } from 'lucide-react';

interface LiveStatusProps {
  items: TaskItem[];
  selectedCategory: ActivityCategory | 'dashboard';
  onUpdateProgress: (id: string, newProgress: number) => void;
  autoCloseSeconds?: number | null;
  onClose?: () => void;
}

export const LiveStatus: React.FC<LiveStatusProps> = ({
  items,
  selectedCategory,
  onUpdateProgress,
  autoCloseSeconds = null,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter items in progress
  const categoryInProgress = items.filter(
    (i) => i.column === 'in_progress' && (selectedCategory === 'dashboard' || i.category === selectedCategory)
  );

  const inProgCount = categoryInProgress.length;
  const isMinMet = inProgCount >= 3;
  const isMaxMet = inProgCount <= 5;
  const isOptimal = isMinMet && isMaxMet;

  const totalFinished = items.filter((i) => i.column === 'completed').length;
  const totalItems = items.length;
  const overallCompletionRate = totalItems > 0 ? Math.round((totalFinished / totalItems) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col justify-between bg-white text-black border-l-2 border-black transition-colors duration-200 overflow-y-auto">
      <div className="p-4 space-y-4">
        
        {/* TOP AUTO-CLOSE COUNTDOWN NOTIFICATION BAR IF EXPANDED VIA LIVE BUTTON */}
        {autoCloseSeconds !== null && (
          <div className="p-2 bg-yellow-400 border-2 border-black text-black flex items-center justify-between text-xs font-mono font-bold uppercase animate-pulse">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Live Pulse Auto Closing ({autoCloseSeconds}s)</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 border border-black bg-black text-white">
              <Activity className="w-4 h-4 animate-pulse text-red-500" />
            </div>
            <div>
              <h3 className="font-impact text-sm uppercase tracking-wider">
                Live Status Pulse
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Real-time activity tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 border border-black text-xs font-mono font-bold hover:bg-black hover:text-white"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 border border-black hover:bg-zinc-100 lg:hidden"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            
            {/* CONSTRAINT GAUGE CARD (MIN 3, MAX 5 IN PROGRESS RULE) */}
            <div className="p-3 border-2 border-black bg-zinc-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-impact uppercase tracking-wide flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  In Progress Meter
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.5 border ${
                    isOptimal
                      ? 'border-black bg-black text-white'
                      : 'border-black bg-yellow-400 text-black'
                  }`}
                >
                  {inProgCount} / [3-5]
                </span>
              </div>

              {/* VISUAL CAPACITY GAUGE (5 BARS) */}
              <div className="grid grid-cols-5 gap-1 my-2">
                {[1, 2, 3, 4, 5].map((slot) => {
                  const filled = slot <= inProgCount;
                  return (
                    <div
                      key={slot}
                      className={`h-3 border transition-all ${
                        filled
                          ? 'bg-yellow-400 border-black'
                          : 'bg-zinc-200 border-dashed border-zinc-400'
                      }`}
                    />
                  );
                })}
              </div>

              {/* STATUS COMMENTARY */}
              {!isMinMet && (
                <div className="mt-1.5 p-1.5 bg-yellow-100 border border-yellow-500 text-[10px] font-mono text-black flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                  <span>
                    Need <strong>{3 - inProgCount} more</strong> to hit minimum 3 tasks!
                  </span>
                </div>
              )}

              {inProgCount > 5 && (
                <div className="mt-1.5 p-1.5 bg-red-100 border border-red-500 text-[10px] font-mono text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>
                    Limit exceeded! Max is 5 items.
                  </span>
                </div>
              )}

              {isOptimal && (
                <div className="mt-1.5 p-1 bg-zinc-200 text-[10px] font-mono text-zinc-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span>Optimal flow zone (3-5 active).</span>
                </div>
              )}
            </div>

            {/* LIVE ACTIVE TASKS QUICK PROGRESS RUNNER */}
            <div className="p-3 border-2 border-black bg-white space-y-2.5">
              <div className="flex items-center justify-between border-b border-black pb-1.5">
                <span className="text-[10px] font-impact uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Active Progress
                </span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">
                  {categoryInProgress.length} active
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {categoryInProgress.length === 0 ? (
                  <p className="text-xs font-mono text-zinc-400 py-3 text-center italic">
                    No active tasks in progress. Drag items from Backlog!
                  </p>
                ) : (
                  categoryInProgress.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 border border-black bg-zinc-50 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="font-impact text-xs leading-snug truncate">
                            {item.title}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase">
                            {item.category} • {item.creatorOrMeta || 'Media'}
                          </p>
                        </div>
                        <span className="font-mono text-xs px-1 py-0.5 border border-black bg-yellow-400 text-black font-black">
                          {item.progress}%
                        </span>
                      </div>

                      {/* YELLOW PROGRESS BAR */}
                      <div className="w-full bg-zinc-200 h-2 border border-black overflow-hidden">
                        <div
                          className="bg-yellow-400 h-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      {/* QUICK INCREMENT BUTTONS */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className="text-[9px] font-mono text-zinc-500">
                          {item.currentUnit && item.totalUnits
                            ? `${item.currentUnit}/${item.totalUnits}`
                            : `${item.progress}%`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateProgress(item.id, Math.min(100, item.progress + 10))}
                            className="text-[9px] font-mono font-bold px-1 py-0.5 border border-black bg-white hover:bg-black hover:text-white transition-colors"
                          >
                            +10%
                          </button>
                          <button
                            onClick={() => onUpdateProgress(item.id, Math.min(100, item.progress + 25))}
                            className="text-[9px] font-mono font-bold px-1 py-0.5 border border-black bg-white hover:bg-black hover:text-white transition-colors"
                          >
                            +25%
                          </button>
                          <button
                            onClick={() => onUpdateProgress(item.id, 100)}
                            className="text-[9px] font-impact px-1.5 py-0.5 bg-green-600 text-white hover:bg-green-700 transition-colors uppercase"
                            title="Finish task!"
                          >
                            Finish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GLOBAL COMPLETION METRIC */}
            <div className="p-3 border-2 border-black bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                  Overall Completion
                </span>
                <span className="font-impact text-sm">{overallCompletionRate}%</span>
              </div>
              <div className="w-full bg-zinc-700 h-2 border border-white overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{ width: `${overallCompletionRate}%` }}
                />
              </div>
              <p className="text-[9px] font-mono opacity-70 mt-1.5 text-right">
                {totalFinished} of {totalItems} total items finished
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
