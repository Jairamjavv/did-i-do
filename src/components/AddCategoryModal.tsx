import React, { useState } from 'react';
import { CategoryInfo } from '../types';
import { X, Plus, Sparkles, BookOpen, Film, Tv, Gamepad2, Headphones, Radio, GraduationCap, Dumbbell, Music, Bookmark, Layers } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (cat: Omit<CategoryInfo, 'id'>) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Headphones', icon: <Headphones className="w-5 h-5" /> },
  { name: 'Radio', icon: <Radio className="w-5 h-5" /> },
  { name: 'GraduationCap', icon: <GraduationCap className="w-5 h-5" /> },
  { name: 'Dumbbell', icon: <Dumbbell className="w-5 h-5" /> },
  { name: 'Music', icon: <Music className="w-5 h-5" /> },
  { name: 'Bookmark', icon: <Bookmark className="w-5 h-5" /> },
  { name: 'Sparkles', icon: <Sparkles className="w-5 h-5" /> },
  { name: 'BookOpen', icon: <BookOpen className="w-5 h-5" /> },
  { name: 'Film', icon: <Film className="w-5 h-5" /> },
  { name: 'Tv', icon: <Tv className="w-5 h-5" /> },
  { name: 'Gamepad2', icon: <Gamepad2 className="w-5 h-5" /> },
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [verb, setVerb] = useState('');
  const [unitDefault, setUnitDefault] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Headphones');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCategory({
      name: name.trim(),
      verb: verb.trim() || 'tracking',
      unitDefault: unitDefault.trim() || 'units',
      iconName: selectedIcon,
    });

    setName('');
    setVerb('');
    setUnitDefault('');
    setSelectedIcon('Headphones');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border-2 border-black dark:border-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-black text-white dark:bg-white dark:text-black font-black">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-impact text-xl uppercase tracking-wide">
              Add New Category
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Podcasts, Anime, Courses, Workouts..."
              className="w-full px-3 py-2 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-sm focus:outline-none uppercase font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Activity Verb
              </label>
              <input
                type="text"
                value={verb}
                onChange={(e) => setVerb(e.target.value)}
                placeholder="listening, studying, exercising..."
                className="w-full px-3 py-2 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono-clean font-bold uppercase mb-1">
                Default Unit
              </label>
              <input
                type="text"
                value={unitDefault}
                onChange={(e) => setUnitDefault(e.target.value)}
                placeholder="episodes, modules, mins..."
                className="w-full px-3 py-2 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-mono-clean text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* ICON SELECTOR */}
          <div>
            <label className="block text-xs font-mono-clean font-bold uppercase mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900">
              {AVAILABLE_ICONS.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setSelectedIcon(item.name)}
                  className={`p-2 border flex flex-col items-center gap-1 transition-all ${
                    selectedIcon === item.name
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-bold'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-black dark:hover:border-white'
                  }`}
                >
                  {item.icon}
                  <span className="text-[8px] font-mono uppercase truncate w-full text-center">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t-2 border-black dark:border-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 font-mono-clean text-xs uppercase font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-mono-clean font-black text-xs uppercase hover:opacity-90 flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
