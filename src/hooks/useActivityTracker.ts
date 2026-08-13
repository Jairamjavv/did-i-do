import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityMetaData, ActivityCategory, ColumnType, TaskItem, CategoryInfo } from '../types';
import { INITIAL_METADATA, CATEGORIES as DEFAULT_CATEGORIES } from '../data/initialData';
import confetti from 'canvas-confetti';
import {
  fetchCloudMetadata,
  saveCloudMetadata,
  isSupabaseConfigured,
} from '../services/supabaseClient';

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'error' | 'disconnected';

export function useActivityTracker() {
  const [categories, setCategories] = useState<CategoryInfo[]>(DEFAULT_CATEGORIES);
  const [data, setData] = useState<ActivityMetaData>(INITIAL_METADATA);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'loading' : 'disconnected'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isInitialLoad = useRef(true);
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // 1. Initial Load: Fetch JSON metadata state from Supabase Cloud DB
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSyncStatus('disconnected');
      return;
    }

    async function loadCloudData() {
      setSyncStatus('loading');
      const cloudPayload = await fetchCloudMetadata();

      if (cloudPayload) {
        if (cloudPayload.data && Array.isArray(cloudPayload.data.items)) {
          setData(cloudPayload.data);
        }
        if (cloudPayload.categories && Array.isArray(cloudPayload.categories)) {
          setCategories(cloudPayload.categories);
        }
        setSyncStatus('synced');
      } else {
        // First run or table empty - initialize cloud with default metadata
        setSyncStatus('synced');
      }
      isInitialLoad.current = false;
    }

    loadCloudData();
  }, []);

  // 2. Cloud Sync: Automatically save data & categories to Supabase on state change
  useEffect(() => {
    // Skip saving during initial fetch load
    if (isInitialLoad.current || !isSupabaseConfigured) return;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    setSyncStatus('saving');

    saveDebounceTimer.current = setTimeout(async () => {
      const success = await saveCloudMetadata(data, categories);
      if (success) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
        showToast('⚠️ Cloud sync error! Failed to save metadata to Supabase DB.');
      }
    }, 800);

    return () => {
      if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    };
  }, [data, categories, showToast]);

  // Force light mode on document
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Get in_progress items count for a category
  const getInProgressCount = useCallback(
    (category: ActivityCategory) => {
      return data.items.filter((item) => item.category === category && item.column === 'in_progress').length;
    },
    [data.items]
  );

  // Add Item to Backlog
  const addItem = useCallback(
    (itemData: Omit<TaskItem, 'id' | 'createdAt' | 'progress' | 'column'> & { column?: ColumnType; progress?: number }) => {
      const newItem: TaskItem = {
        ...itemData,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        column: itemData.column || 'backlog',
        progress: itemData.progress || 0,
        createdAt: new Date().toISOString(),
      };

      // Check constraint if adding directly to in_progress
      if (newItem.column === 'in_progress') {
        const count = getInProgressCount(newItem.category);
        if (count >= 5) {
          showToast(`⚠️ Max Limit Reached! You already have 5 items in progress for ${newItem.category.toUpperCase()}. Added to Backlog instead.`);
          newItem.column = 'backlog';
        }
      }

      setData((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        items: [newItem, ...prev.items],
      }));

      return newItem;
    },
    [getInProgressCount, showToast]
  );

  // Update Item
  const updateItem = useCallback((id: string, updates: Partial<TaskItem>) => {
    setData((prev) => {
      let isCompletedNow = false;
      const updatedItems = prev.items.map((item) => {
        if (item.id !== id) return item;

        let newProgress = updates.progress !== undefined ? updates.progress : item.progress;
        
        // Recalculate progress if currentUnit and totalUnits change
        const currentU = updates.currentUnit !== undefined ? updates.currentUnit : item.currentUnit;
        const totalU = updates.totalUnits !== undefined ? updates.totalUnits : item.totalUnits;

        if (currentU !== undefined && totalU && totalU > 0) {
          newProgress = Math.min(100, Math.max(0, Math.round((currentU / totalU) * 100)));
        }

        let newColumn = updates.column !== undefined ? updates.column : item.column;

        // Auto move to completed if progress reaches 100%
        if (newProgress >= 100 && item.column !== 'completed') {
          newColumn = 'completed';
          isCompletedNow = true;
        }

        return {
          ...item,
          ...updates,
          progress: newProgress,
          column: newColumn,
          completedAt: newColumn === 'completed' && !item.completedAt ? new Date().toISOString() : item.completedAt,
        };
      });

      if (isCompletedNow) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#eab308', '#ffffff', '#000000'],
        });
      }

      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        items: updatedItems,
      };
    });
  }, []);

  // Move item between columns with min 3 / max 5 validation rules!
  const moveItem = useCallback(
    (id: string, targetColumn: ColumnType) => {
      const item = data.items.find((i) => i.id === id);
      if (!item) return false;

      if (item.column === targetColumn) return true;

      const category = item.category;
      const currentInProgressCount = getInProgressCount(category);

      // Rule 1: Cannot exceed MAX 5 items in InProgress
      if (targetColumn === 'in_progress' && item.column !== 'in_progress') {
        if (currentInProgressCount >= 5) {
          showToast(`🚫 Limit Exceeded! Max 5 tasks allowed in 'In Progress' for ${category.toUpperCase()}. Finish or move one item back first!`);
          return false;
        }
      }

      // Rule 2: Moving OUT of InProgress - warn if drops below 3
      if (item.column === 'in_progress' && targetColumn !== 'in_progress') {
        const nextCount = currentInProgressCount - 1;
        if (nextCount < 3) {
          showToast(`⚠️ Note: 'In Progress' now has ${nextCount} task(s). Recommended minimum is 3 tasks to keep momentum!`);
        }
      }

      let newProgress = item.progress;
      let completedAt = item.completedAt;

      if (targetColumn === 'completed') {
        newProgress = 100;
        completedAt = new Date().toISOString();
        if (item.totalUnits) {
          item.currentUnit = item.totalUnits;
        }
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#eab308', '#ffffff'],
        });
      } else if (targetColumn === 'backlog' && item.progress === 100) {
        newProgress = 0;
        if (item.totalUnits) item.currentUnit = 0;
      }

      setData((prev) => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        items: prev.items.map((i) =>
          i.id === id
            ? {
                ...i,
                column: targetColumn,
                progress: newProgress,
                completedAt,
                startedAt: targetColumn === 'in_progress' && !i.startedAt ? new Date().toISOString() : i.startedAt,
              }
            : i
        ),
      }));

      return true;
    },
    [data.items, getInProgressCount, showToast]
  );

  // Delete Item
  const deleteItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  // Import JSON metadata with validation
  const importJSON = useCallback((jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.items)) {
        return { success: false, message: 'Invalid JSON schema: Missing "items" array.' };
      }

      // Check required fields for each item
      for (const item of parsed.items) {
        if (!item.id || !item.category || !item.title || !item.column) {
          return { success: false, message: 'Invalid item data in JSON. Items must have id, category, title, and column.' };
        }
      }

      setData({
        version: parsed.version || '1.0.0',
        lastUpdated: new Date().toISOString(),
        items: parsed.items,
      });

      return { success: true, message: `Successfully imported ${parsed.items.length} items from JSON!` };
    } catch (e: any) {
      return { success: false, message: `JSON Syntax Error: ${e.message}` };
    }
  }, []);

  // Export JSON
  const exportJSON = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  // Add a new Category dynamically
  const addCategory = useCallback(
    (newCat: Omit<CategoryInfo, 'id'> & { id?: string }) => {
      const catId = newCat.id || newCat.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (categories.some((c) => c.id === catId)) {
        showToast(`⚠️ Category "${newCat.name}" already exists!`);
        return catId;
      }

      const categoryObj: CategoryInfo = {
        id: catId,
        name: newCat.name,
        verb: newCat.verb || 'tracking',
        iconName: newCat.iconName || 'Sparkles',
        unitDefault: newCat.unitDefault || 'units',
      };

      setCategories((prev) => [...prev, categoryObj]);
      showToast(`✨ Created new category "${newCat.name}"!`);
      return catId;
    },
    [categories, showToast]
  );

  // Reset to default sample JSON
  const resetToDefault = useCallback(() => {
    setData(INITIAL_METADATA);
    setCategories(DEFAULT_CATEGORIES);
    showToast('🔄 Restored default metadata sample!');
  }, [showToast]);

  return {
    data,
    categories,
    syncStatus,
    addCategory,
    toastMessage,
    showToast,
    addItem,
    updateItem,
    moveItem,
    deleteItem,
    getInProgressCount,
    importJSON,
    exportJSON,
    resetToDefault,
  };
}
