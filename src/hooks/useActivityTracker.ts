import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityMetaData,
  ActivityCategory,
  ColumnType,
  TaskItem,
  CategoryInfo,
  MetadataRecord,
  DEFAULT_CATEGORIES,
  EMPTY_METADATA,
} from '../types';
import confetti from 'canvas-confetti';
import {
  supabase,
  fetchCloudMetadata,
  saveCloudMetadata,
  createMetadataRecord,
  getMetadataRecordById,
  fetchAllMetadataRecords,
  updateMetadataRecord,
  deleteMetadataRecord,
  deleteCloudMetadata,
  deleteAllMetadataRecords,
  isSupabaseConfigured,
  DEFAULT_METADATA_ROW_ID,
  fetchUserCompletionLogs,
  logCompletedCard,
} from '../services/supabaseClient';
import { CompletionLogEntry } from '../types';

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'error' | 'disconnected';

export function useActivityTracker(didId?: string) {
  const [categories, setCategories] = useState<CategoryInfo[]>(DEFAULT_CATEGORIES);
  const [data, setData] = useState<ActivityMetaData>(EMPTY_METADATA);
  const [fifoCompletedQueue, setFifoCompletedQueue] = useState<CompletionLogEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'loading' : 'disconnected'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isInitialLoad = useRef(true);
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownUpdatedRef = useRef<string>(new Date().toISOString());
  const currentDidId = didId || DEFAULT_METADATA_ROW_ID;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // 1. Initial Load: Fetch JSON metadata state from Supabase Cloud DB for this user's didId
  useEffect(() => {
    if (!isSupabaseConfigured || !didId) {
      setSyncStatus('disconnected');
      return;
    }

    async function loadCloudData() {
      setSyncStatus('loading');
      isInitialLoad.current = true;
      const [cloudPayload, completionLogs] = await Promise.all([
        fetchCloudMetadata(currentDidId),
        fetchUserCompletionLogs(didId),
      ]);

      if (completionLogs && Array.isArray(completionLogs.fifoQueue)) {
        setFifoCompletedQueue(completionLogs.fifoQueue);
      }

      if (cloudPayload) {
        if (cloudPayload.data && Array.isArray(cloudPayload.data.items)) {
          setData(cloudPayload.data);
        } else {
          setData(EMPTY_METADATA);
        }
        if (cloudPayload.categories && Array.isArray(cloudPayload.categories)) {
          setCategories(cloudPayload.categories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
        lastKnownUpdatedRef.current = cloudPayload.data?.lastUpdated || new Date().toISOString();
        setSyncStatus('synced');
      } else {
        // First run or row empty - initialize user cloud metadata
        setData(EMPTY_METADATA);
        setCategories(DEFAULT_CATEGORIES);
        await saveCloudMetadata(EMPTY_METADATA, DEFAULT_CATEGORIES, currentDidId);
        lastKnownUpdatedRef.current = new Date().toISOString();
        setSyncStatus('synced');
      }
      isInitialLoad.current = false;
    }

    loadCloudData();
  }, [currentDidId, didId]);

  // 1.5 Realtime Multi-Tab / Multi-Device Synchronization via Supabase Realtime Channel
  useEffect(() => {
    if (!isSupabaseConfigured || !didId || !supabase) return;

    // Listen to live database changes on this user's metadata row
    const channel = supabase
      .channel(`realtime_did_${didId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metadata',
          filter: `id=eq.${didId}`,
        },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.data && newRecord.data.data) {
            const remotePayload = newRecord.data;
            const remoteUpdated = newRecord.updated_at || remotePayload.data?.lastUpdated;

            // Only update local state if remote update is from another tab/device
            if (remoteUpdated && remoteUpdated !== lastKnownUpdatedRef.current) {
              console.log('[Supabase Realtime] Received live update from another tab/device:', remoteUpdated);
              isInitialLoad.current = true;
              lastKnownUpdatedRef.current = remoteUpdated;

              if (remotePayload.data && Array.isArray(remotePayload.data.items)) {
                setData(remotePayload.data);
              }
              if (remotePayload.categories && Array.isArray(remotePayload.categories)) {
                setCategories(remotePayload.categories);
              }
              setSyncStatus('synced');

              setTimeout(() => {
                isInitialLoad.current = false;
              }, 200);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [didId]);

  // 2. Cloud Sync: Automatically save data & categories to Supabase with OCC conflict prevention
  useEffect(() => {
    // Skip saving during initial fetch load or if no active didId
    if (isInitialLoad.current || !isSupabaseConfigured || !didId) return;

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    setSyncStatus('saving');

    saveDebounceTimer.current = setTimeout(async () => {
      const nowIso = new Date().toISOString();
      const saveRes = await saveCloudMetadata(
        data, 
        categories, 
        currentDidId, 
        lastKnownUpdatedRef.current
      );

      if (saveRes.success) {
        lastKnownUpdatedRef.current = nowIso;
        
        // If a collision was resolved by merging, update the React state with the merged result
        if (saveRes.mergedPayload) {
          isInitialLoad.current = true;
          if (saveRes.mergedPayload.data) setData(saveRes.mergedPayload.data);
          if (saveRes.mergedPayload.categories) setCategories(saveRes.mergedPayload.categories);
          showToast('⚡ Live sync merged changes from another device/tab!');
          setTimeout(() => { isInitialLoad.current = false; }, 200);
        }
        
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
        showToast('⚠️ Cloud sync error! Failed to save metadata to Supabase DB.');
      }
    }, 800);

    return () => {
      if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    };
  }, [data, categories, currentDidId, didId, showToast]);

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

        let newSeasons = updates.seasons !== undefined ? updates.seasons : item.seasons;
        let currentU = updates.currentUnit !== undefined ? updates.currentUnit : item.currentUnit;
        let totalU = updates.totalUnits !== undefined ? updates.totalUnits : item.totalUnits;

        // If seasons were updated, compute currentUnit and totalUnits from seasons
        if (newSeasons && newSeasons.length > 0) {
          const sumEps = newSeasons.reduce((acc, s) => acc + (s.totalEpisodes || 0), 0);
          const compEps = newSeasons.reduce((acc, s) => acc + (s.episodesCompleted || 0), 0);
          totalU = sumEps;
          currentU = compEps;
        }

        let newProgress = updates.progress !== undefined ? updates.progress : item.progress;
        
        // Recalculate progress if currentUnit and totalUnits are known
        if (currentU !== undefined && totalU && totalU > 0) {
          newProgress = Math.min(100, Math.max(0, Math.round((currentU / totalU) * 100)));
        }

        let newColumn = updates.column !== undefined ? updates.column : item.column;

        // Auto move to completed if progress reaches 100%
        if (newProgress >= 100 && item.column !== 'completed') {
          newColumn = 'completed';
          isCompletedNow = true;
          if (newSeasons && newSeasons.length > 0) {
            newSeasons = newSeasons.map((s) => ({ ...s, episodesCompleted: s.totalEpisodes }));
          }
        }

        return {
          ...item,
          ...updates,
          seasons: newSeasons,
          currentUnit: currentU,
          totalUnits: totalU,
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

        // Asynchronously record completion log & FIFO queue in user table
        if (didId) {
          const completedTask = updatedItems.find((i) => i.id === id);
          if (completedTask) {
            logCompletedCard(didId, completedTask).then((res) => {
              if (res && res.fifoQueue) {
                setFifoCompletedQueue(res.fifoQueue);
              }
            });
          }
        }
      }

      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        items: updatedItems,
      };
    });
  }, [didId]);

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
      let newCurrentUnit = item.currentUnit;
      let newSeasons = item.seasons;
      let newCurrentSeason = item.currentSeason;
      let newCurrentEpisode = item.currentEpisode;

      if (targetColumn === 'completed') {
        newProgress = 100;
        completedAt = new Date().toISOString();
        if (item.totalUnits) {
          newCurrentUnit = item.totalUnits;
        }
        if (item.seasons && item.seasons.length > 0) {
          newSeasons = item.seasons.map((s) => ({ ...s, episodesCompleted: s.totalEpisodes }));
          newCurrentSeason = item.seasons.length;
          newCurrentEpisode = item.seasons[item.seasons.length - 1].totalEpisodes;
        }
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#eab308', '#ffffff'],
        });

        // Asynchronously record completion log & FIFO queue in user table
        if (didId) {
          const completedTask: TaskItem = {
            ...item,
            column: 'completed',
            progress: 100,
            completedAt,
            currentUnit: newCurrentUnit,
            seasons: newSeasons,
            currentSeason: newCurrentSeason,
            currentEpisode: newCurrentEpisode,
          };
          logCompletedCard(didId, completedTask).then((res) => {
            if (res && res.fifoQueue) {
              setFifoCompletedQueue(res.fifoQueue);
            }
          });
        }
      } else if (targetColumn === 'backlog' && item.progress === 100) {
        newProgress = 0;
        if (item.totalUnits) newCurrentUnit = 0;
        if (item.seasons && item.seasons.length > 0) {
          newSeasons = item.seasons.map((s) => ({ ...s, episodesCompleted: 0 }));
          newCurrentSeason = 1;
          newCurrentEpisode = 0;
        }
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
                currentUnit: newCurrentUnit,
                seasons: newSeasons,
                currentSeason: newCurrentSeason,
                currentEpisode: newCurrentEpisode,
                startedAt: targetColumn === 'in_progress' && !i.startedAt ? new Date().toISOString() : i.startedAt,
              }
            : i
        ),
      }));

      return true;
    },
    [data.items, didId, getInProgressCount, showToast]
  );

  // Delete Item
  const deleteItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      lastUpdated: new Date().toISOString(),
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  // Import JSON metadata with validation and immediate DB sync
  const importJSON = useCallback(
    (jsonString: string): { success: boolean; message: string; data?: ActivityMetaData } => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || !Array.isArray(parsed.items)) {
          return { success: false, message: 'Invalid JSON schema: Missing "items" array.' };
        }

        // Check required fields for each item
        for (const item of parsed.items) {
          if (!item.id || !item.category || !item.title || !item.column) {
            return {
              success: false,
              message: 'Invalid item data in JSON. Items must have id, category, title, and column.',
            };
          }
        }

        const newData: ActivityMetaData = {
          version: parsed.version || '1.0.0',
          lastUpdated: new Date().toISOString(),
          items: parsed.items,
        };

        const targetCategories = Array.isArray(parsed.categories) ? parsed.categories : categories;

        setData(newData);
        if (Array.isArray(parsed.categories)) {
          setCategories(parsed.categories);
        }

        // Cancel pending debounce and immediately sync to DB
        if (saveDebounceTimer.current) {
          clearTimeout(saveDebounceTimer.current);
          saveDebounceTimer.current = null;
        }

        if (isSupabaseConfigured) {
          setSyncStatus('saving');
          saveCloudMetadata(newData, targetCategories, DEFAULT_METADATA_ROW_ID).then((success) => {
            if (success) {
              setSyncStatus('synced');
            } else {
              setSyncStatus('error');
              showToast('⚠️ Imported locally, but failed to save to Supabase DB.');
            }
          });
        }

        return {
          success: true,
          message: `Successfully imported ${parsed.items.length} items & synced to DB!`,
          data: newData,
        };
      } catch (e: any) {
        return { success: false, message: `JSON Syntax Error: ${e.message}` };
      }
    },
    [categories, showToast]
  );

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

  // Reset to default clean state with immediate Supabase DB sync & state reload
  const resetToDefault = useCallback(async (): Promise<ActivityMetaData> => {
    // Clear any pending debounce timer to prevent race conditions
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }

    const freshData: ActivityMetaData = {
      version: EMPTY_METADATA.version,
      lastUpdated: new Date().toISOString(),
      items: [],
    };
    const freshCategories: CategoryInfo[] = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));

    setData(freshData);
    setCategories(freshCategories);

    if (isSupabaseConfigured) {
      setSyncStatus('saving');
      const success = await saveCloudMetadata(freshData, freshCategories, DEFAULT_METADATA_ROW_ID);
      if (success) {
        setSyncStatus('synced');
        showToast('🔄 Reset complete: Data reset and synced with Supabase DB!');
      } else {
        setSyncStatus('error');
        showToast('⚠️ Reset applied locally, but failed to save to Supabase DB.');
      }
    } else {
      showToast('🔄 Restored clean metadata state!');
    }

    return freshData;
  }, [showToast]);

  // ============================================================
  // Supabase Metadata Table CRUD Operations
  // ============================================================

  // 1. CREATE: Insert a new metadata snapshot / record
  const createCloudSnapshot = useCallback(
    async (customId?: string): Promise<{ success: boolean; data?: MetadataRecord; error?: string }> => {
      if (!isSupabaseConfigured) {
        showToast('⚠️ Supabase is not configured. Please set your .env credentials.');
        return { success: false, error: 'Supabase is not configured.' };
      }
      const recordId = customId?.trim() || `snapshot_${Date.now()}`;
      setSyncStatus('saving');
      const res = await createMetadataRecord(recordId, data, categories);
      if (res.success) {
        setSyncStatus('synced');
        showToast(`☁️ Created new metadata record "${recordId}" in Supabase!`);
      } else {
        setSyncStatus('error');
        showToast(`⚠️ Failed to create metadata: ${res.error}`);
      }
      return res;
    },
    [data, categories, showToast]
  );

  // 2. READ: Pull metadata from cloud by ID
  const fetchFromCloud = useCallback(
    async (rowId: string = DEFAULT_METADATA_ROW_ID): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('⚠️ Supabase is not configured.');
        return false;
      }
      setSyncStatus('loading');
      const cloudPayload = await fetchCloudMetadata(rowId);
      if (cloudPayload) {
        if (cloudPayload.data && Array.isArray(cloudPayload.data.items)) {
          setData(cloudPayload.data);
        }
        if (cloudPayload.categories && Array.isArray(cloudPayload.categories)) {
          setCategories(cloudPayload.categories);
        }
        setSyncStatus('synced');
        showToast(`☁️ Successfully pulled metadata ("${rowId}") from Supabase!`);
        return true;
      } else {
        setSyncStatus('synced');
        showToast(`⚠️ No metadata found for row ID "${rowId}".`);
        return false;
      }
    },
    [showToast]
  );

  // 3. READ (LIST): List all metadata records from table
  const listCloudSnapshots = useCallback(async (): Promise<MetadataRecord[]> => {
    if (!isSupabaseConfigured) return [];
    return await fetchAllMetadataRecords();
  }, []);

  // 4. UPDATE: Explicitly update an existing metadata record
  const updateCloudRecord = useCallback(
    async (rowId: string = DEFAULT_METADATA_ROW_ID): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured) {
        showToast('⚠️ Supabase is not configured.');
        return { success: false, error: 'Supabase is not configured.' };
      }
      setSyncStatus('saving');
      const res = await updateMetadataRecord(rowId, data, categories);
      if (res.success) {
        setSyncStatus('synced');
        showToast(`☁️ Updated metadata record "${rowId}" in Supabase!`);
      } else {
        setSyncStatus('error');
        showToast(`⚠️ Failed to update metadata: ${res.error}`);
      }
      return res;
    },
    [data, categories, showToast]
  );

  // 5. UPSERT: Save current state to cloud
  const saveToCloud = useCallback(
    async (rowId: string = DEFAULT_METADATA_ROW_ID): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('⚠️ Supabase is not configured.');
        return false;
      }
      setSyncStatus('saving');
      const res = await saveCloudMetadata(data, categories, rowId, lastKnownUpdatedRef.current);
      if (res.success) {
        setSyncStatus('synced');
        showToast(`☁️ Saved & upserted metadata ("${rowId}") to Supabase!`);
        return true;
      } else {
        setSyncStatus('error');
        showToast('⚠️ Failed to save metadata to Supabase DB.');
        return false;
      }
    },
    [data, categories, showToast]
  );

  // 6. DELETE: Delete a metadata record by ID
  const deleteFromCloud = useCallback(
    async (rowId: string = DEFAULT_METADATA_ROW_ID): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        showToast('⚠️ Supabase is not configured.');
        return false;
      }
      const res = await deleteMetadataRecord(rowId);
      if (res.success) {
        showToast(`🗑️ Deleted metadata record "${rowId}" from Supabase!`);
        return true;
      } else {
        showToast(`⚠️ Failed to delete metadata: ${res.error}`);
        return false;
      }
    },
    [showToast]
  );

  // 7. DELETE ALL: Clear all records in metadata table
  const clearAllCloudSnapshots = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      showToast('⚠️ Supabase is not configured.');
      return false;
    }
    const res = await deleteAllMetadataRecords();
    if (res.success) {
      showToast('🗑️ Cleared all records from Supabase metadata table!');
      return true;
    } else {
      showToast(`⚠️ Failed to clear metadata: ${res.error}`);
      return false;
    }
  }, [showToast]);

  return {
    data,
    categories,
    fifoCompletedQueue,
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
    // Metadata CRUD Operations
    createCloudSnapshot,
    fetchFromCloud,
    listCloudSnapshots,
    updateCloudRecord,
    saveToCloud,
    deleteFromCloud,
    clearAllCloudSnapshots,
    isSupabaseConfigured,
  };
}
