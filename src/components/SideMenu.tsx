import React from 'react';
import { ActivityCategory, CategoryInfo, TaskItem } from '../types';
import {
  LayoutDashboard,
  BookOpen,
  Film,
  Tv,
  Gamepad2,
  Headphones,
  Radio,
  GraduationCap,
  Dumbbell,
  Music,
  Bookmark,
  Sparkles,
  Layers,
  Plus,
  Clock,
  X,
} from 'lucide-react';

interface SideMenuProps {
  selectedCategory: ActivityCategory | 'dashboard';
  onSelectCategory: (category: ActivityCategory | 'dashboard') => void;
  categories: CategoryInfo[];
  items: TaskItem[];
  onOpenAddCategory: () => void;
  autoCloseSeconds?: number | null;
  onClose?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-4 h-4" />,
  Film: <Film className="w-4 h-4" />,
  Tv: <Tv className="w-4 h-4" />,
  Gamepad2: <Gamepad2 className="w-4 h-4" />,
  Headphones: <Headphones className="w-4 h-4" />,
  Radio: <Radio className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  Dumbbell: <Dumbbell className="w-4 h-4" />,
  Music: <Music className="w-4 h-4" />,
  Bookmark: <Bookmark className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
};

export const SideMenu: React.FC<SideMenuProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
  items,
  onOpenAddCategory,
  autoCloseSeconds = null,
  onClose,
}) => {
  const totalItems = items.length;
  const totalCompleted = items.filter((i) => i.column === 'completed').length;
  const overallProgressPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return (
    <aside className="w-full h-full flex flex-col justify-between bg-white text-black border-r-2 border-black transition-colors duration-200 overflow-y-auto">
      
      <div className="p-5 space-y-6">
        
        {/* TOP AUTO-CLOSE COUNTDOWN NOTIFICATION BAR IF OPENED VIA HAMBURGER */}
        {autoCloseSeconds !== null && (
          <div className="p-2 bg-yellow-400 border-2 border-black text-black flex items-center justify-between text-xs font-mono font-bold uppercase">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Auto closing in {autoCloseSeconds}s</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* SECTION TITLE & ADD CATEGORY BUTTON */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            Navigation Menu
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 border border-black text-xs font-mono font-bold hover:bg-black hover:text-white"
            >
              Close ✕
            </button>
          )}
        </div>

        {/* VERTICAL NAVIGATION */}
        <nav className="space-y-2">
          
          {/* DASHBOARD BUTTON */}
          <button
            onClick={() => {
              onSelectCategory('dashboard');
              if (onClose) onClose();
            }}
            className={`w-full px-3 py-2.5 transition-colors flex items-center justify-between text-left ${
              selectedCategory === 'dashboard'
                ? 'bg-black text-white border-2 border-black'
                : 'hover:bg-gray-100 border-2 border-transparent hover:border-black text-black'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="font-bold uppercase text-sm">Dashboard</span>
            </div>
            <span className="text-[10px] font-mono opacity-70 font-bold">
              {totalCompleted}
            </span>
          </button>

          {/* CATEGORIES HEADER & PLUS ICON BUTTON */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              Categories
            </p>
            {/* PLUS ICON BUTTON TO ADD A NEW CATEGORY */}
            <button
              onClick={onOpenAddCategory}
              className="px-2 py-0.5 border border-black bg-black text-white hover:bg-yellow-400 hover:text-black transition-all flex items-center gap-1 text-[10px] font-mono font-black uppercase"
              title="Add New Category"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          {/* CATEGORY BUTTONS */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const categoryItems = items.filter((i) => i.category === cat.id);
            const totalCat = categoryItems.length;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  if (onClose) onClose();
                }}
                className={`w-full px-3 py-2 transition-colors flex items-center justify-between text-left ${
                  isSelected
                    ? 'bg-black text-white border-2 border-black'
                    : 'hover:bg-gray-100 border-2 border-transparent hover:border-black text-black'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ICON_MAP[cat.iconName] || <Layers className="w-4 h-4" />}
                  <span className="font-bold uppercase text-sm">{cat.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold opacity-70">
                  {totalCat < 10 ? `0${totalCat}` : totalCat}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ACTIVE JSON METADATA PREVIEW BLOCK */}
        <div className="bg-gray-100 p-3.5 border border-dashed border-black">
          <p className="text-[10px] font-black uppercase mb-1.5 text-black tracking-wider">
            Active JSON Metadata
          </p>
          <pre className="text-[8px] leading-tight font-mono text-gray-800 overflow-x-auto">
            {JSON.stringify(
              {
                cat: selectedCategory === 'dashboard' ? 'All' : selectedCategory,
                limit: [3, 5],
                items: totalItems,
                sync: true,
              },
              null,
              2
            )}
          </pre>
        </div>

      </div>

      {/* TOTAL PROGRESS FOOTER */}
      <div className="p-5 border-t-2 border-black bg-black text-white">
        <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest">
          Total Progress
        </p>
        <p className="text-3xl font-black italic mt-0.5">
          {overallProgressPct}%
        </p>
      </div>
    </aside>
  );
};
