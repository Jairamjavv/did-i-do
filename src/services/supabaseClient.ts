import { createClient } from '@supabase/supabase-js';
import { 
  ActivityMetaData, 
  CategoryInfo, 
  CloudPayload, 
  MetadataRecord,
  DIDUser,
  AuthRegistryPayload,
  CompletionLogEntry,
  UserCompletionLogPayload,
  TaskItem,
  DEFAULT_CATEGORIES,
  EMPTY_METADATA 
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const DEFAULT_METADATA_ROW_ID = 'app_metadata';
export const AUTH_REGISTRY_ROW_ID = 'auth_users_registry';

export type { CloudPayload, MetadataRecord, DIDUser, CompletionLogEntry, UserCompletionLogPayload };

// ==========================================
// 0. AUTHENTICATION & USER DID_ID MANAGEMENT
// ==========================================

/**
 * Fetch the registered users registry from Supabase
 */
export async function fetchAuthRegistry(): Promise<DIDUser[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('data')
      .eq('id', AUTH_REGISTRY_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchAuthRegistry error:', error.message);
      return [];
    }

    if (data && data.data && Array.isArray((data.data as any).users)) {
      return (data.data as any).users as DIDUser[];
    }
  } catch (err) {
    console.error('Failed to fetch auth registry:', err);
  }
  return [];
}

/**
 * Save the entire users list to the auth registry
 */
export async function saveAuthRegistry(users: DIDUser[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('metadata').upsert({
      id: AUTH_REGISTRY_ROW_ID,
      data: { users },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase saveAuthRegistry error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save auth registry:', err);
    return false;
  }
}

/**
 * Register a new user in Supabase with a unique did_id and initialize their metadata row
 */
export async function registerDIDUser(
  identifier: string,
  passcode: string,
  displayName: string
): Promise<{ success: boolean; user?: DIDUser; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Cloud database is not configured.' };
  }

  try {
    const users = await fetchAuthRegistry();
    const cleanId = identifier.trim().toLowerCase();
    
    // Check if user already exists
    const existing = users.find((u) => u.identifier.toLowerCase() === cleanId);
    if (existing) {
      return { success: false, error: 'An account with this email or phone already exists. Please Sign In.' };
    }

    // Generate unique did_id (e.g. did_u_1723659281923)
    const did_id = `did_u_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: DIDUser = {
      did_id,
      identifier: cleanId,
      passcode: passcode.trim(),
      displayName: displayName.trim() || 'Member',
      createdAt: new Date().toISOString(),
    };

    // 1. Initialize user's isolated metadata row in Supabase
    const initialPayload: CloudPayload = {
      data: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        items: [],
      },
      categories: DEFAULT_CATEGORIES,
    };

    await supabase.from('metadata').upsert({
      id: did_id,
      data: initialPayload,
      updated_at: new Date().toISOString(),
    });

    // 2. Initialize user's completion log & FIFO queue table row
    const initialLog: UserCompletionLogPayload = {
      did_id,
      fifoQueue: [],
      history: [],
      lastUpdated: new Date().toISOString(),
    };

    await supabase.from('metadata').upsert({
      id: `completed_logs_${did_id}`,
      data: initialLog,
      updated_at: new Date().toISOString(),
    });

    // 3. Add user to auth registry
    const updatedUsers = [...users, newUser];
    const saved = await saveAuthRegistry(updatedUsers);
    if (!saved) {
      return { success: false, error: 'Failed to record user registration in cloud registry.' };
    }

    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: err?.message || 'Failed to complete registration.' };
  }
}

/**
 * Verify user login credentials against Supabase registered users
 */
export async function verifyDIDLogin(
  identifier: string,
  passcode: string
): Promise<{ success: boolean; user?: DIDUser; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Cloud database is not configured.' };
  }

  try {
    const users = await fetchAuthRegistry();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passcode.trim();

    const matchedUser = users.find((u) => u.identifier.toLowerCase() === cleanId);
    if (!matchedUser) {
      return { success: false, error: 'Account not found. Please check your credentials or register first.' };
    }

    if (matchedUser.passcode !== cleanPass) {
      return { success: false, error: 'Incorrect passcode. Please try again.' };
    }

    return { success: true, user: matchedUser };
  } catch (err: any) {
    console.error('Login verification error:', err);
    return { success: false, error: err?.message || 'Failed to verify credentials.' };
  }
}

// ==========================================
// 0.5 COMPLETION LOGS & FIFO QUEUE (TOP 6)
// ==========================================

export const COMPLETION_LOG_PREFIX = 'completed_logs_';

/**
 * Fetch the user's completed card log and top 6 FIFO queue from Supabase
 */
export async function fetchUserCompletionLogs(didId: string): Promise<UserCompletionLogPayload> {
  const defaultLog: UserCompletionLogPayload = {
    did_id: didId,
    fifoQueue: [],
    history: [],
    lastUpdated: new Date().toISOString(),
  };

  if (!supabase || !didId) return defaultLog;

  try {
    const rowId = `${COMPLETION_LOG_PREFIX}${didId}`;
    const { data, error } = await supabase
      .from('metadata')
      .select('data')
      .eq('id', rowId)
      .maybeSingle();

    if (error) {
      console.warn('fetchUserCompletionLogs error:', error.message);
      return defaultLog;
    }

    if (data && data.data) {
      const payload = data.data as any;
      return {
        did_id: didId,
        fifoQueue: Array.isArray(payload.fifoQueue) ? payload.fifoQueue : [],
        history: Array.isArray(payload.history) ? payload.history : [],
        lastUpdated: payload.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Failed to fetch completion logs:', err);
  }

  return defaultLog;
}

/**
 * Calculates consecutive daily streak from a history of completion timestamps
 */
function calculateStreakDays(allCompletions: { completedAt: string }[]): number {
  if (!allCompletions || allCompletions.length === 0) return 0;

  // Extract unique calendar day strings in YYYY-MM-DD
  const dateSet = new Set<string>();
  allCompletions.forEach((c) => {
    if (c.completedAt) {
      const d = new Date(c.completedAt);
      if (!isNaN(d.getTime())) {
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dateSet.add(ymd);
      }
    }
  });

  const sortedDays = Array.from(dateSet).sort().reverse(); // newest first
  if (sortedDays.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYMD = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  // If the newest entry is today or yesterday, count backwards consecutive days
  const newestDay = sortedDays[0];
  if (newestDay !== todayYMD && newestDay !== yesterdayYMD) {
    return 0; // streak broken
  }

  let expectedDate = new Date(newestDay);
  for (const dayStr of sortedDays) {
    const curr = new Date(dayStr);
    const diffMs = expectedDate.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      streak += 1;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break; // gap encountered
    }
  }

  return streak;
}

/**
 * Record a completed card: updates history, recalculates duration & 3-day streak,
 * and maintains a strict FIFO queue of at most 6 items.
 */
export async function logCompletedCard(
  didId: string,
  item: TaskItem
): Promise<UserCompletionLogPayload | null> {
  if (!supabase || !didId) return null;

  try {
    const existingLog = await fetchUserCompletionLogs(didId);
    
    // Calculate total duration it took to complete
    const createdDate = new Date(item.createdAt || Date.now());
    const completedDate = new Date(item.completedAt || Date.now());
    const durationMs = Math.max(0, completedDate.getTime() - createdDate.getTime());
    const durationDays = Math.max(0, Math.floor(durationMs / (1000 * 60 * 60 * 24)));
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    
    let durationText = `${durationDays}d`;
    if (durationDays === 0) {
      durationText = durationHours > 0 ? `${durationHours}h` : '<1h';
    }

    // Build unique log entry
    const entryId = `log_${item.id}_${Date.now()}`;
    const allHistorySoFar = [...existingLog.history, { completedAt: item.completedAt || new Date().toISOString() }];
    const streakDays = calculateStreakDays(allHistorySoFar);
    const has3DayStreak = streakDays >= 3;

    const newEntry: CompletionLogEntry = {
      id: entryId,
      itemId: item.id,
      did_id: didId,
      title: item.title,
      category: item.category,
      creatorOrMeta: item.creatorOrMeta,
      rating: item.rating,
      completedAt: item.completedAt || new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString(),
      durationDays,
      durationText,
      streakDays,
      has3DayStreak,
    };

    // FIFO Queue logic: Keep last 6 completed items
    // Start from one end and keep adding. When 7th arrives, shift oldest off.
    let updatedFifo = [...existingLog.fifoQueue, newEntry];
    if (updatedFifo.length > 6) {
      updatedFifo = updatedFifo.slice(updatedFifo.length - 6); // Keep last 6 in FIFO order
    }

    const updatedHistory = [newEntry, ...existingLog.history];

    const updatedPayload: UserCompletionLogPayload = {
      did_id: didId,
      fifoQueue: updatedFifo,
      history: updatedHistory,
      lastUpdated: new Date().toISOString(),
    };

    const rowId = `${COMPLETION_LOG_PREFIX}${didId}`;
    const { error } = await supabase.from('metadata').upsert({
      id: rowId,
      data: updatedPayload,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save completion log:', error.message);
      return null;
    }

    return updatedPayload;
  } catch (err) {
    console.error('Error logging completed card:', err);
    return null;
  }
}

// ==========================================
// 1. CREATE: Insert a new metadata row
// ==========================================
/**
 * Create/Insert a new record in the `metadata` table.
 * Fails if a record with the same `id` already exists.
 */
export async function createMetadataRecord(
  id: string,
  activityData: ActivityMetaData,
  categories: CategoryInfo[]
): Promise<{ success: boolean; data?: MetadataRecord; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client is not configured.' };

  try {
    const payload: CloudPayload = {
      data: activityData,
      categories,
    };

    const newRecord = {
      id: id.trim() || `snapshot_${Date.now()}`,
      data: payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('metadata')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('Supabase createMetadataRecord error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MetadataRecord };
  } catch (err: any) {
    console.error('Failed to create metadata in Supabase:', err);
    return { success: false, error: err?.message || 'Unknown error occurred.' };
  }
}

// ==========================================
// 2. READ: Fetch metadata records
// ==========================================
/**
 * Fetch the latest JSON metadata payload from Supabase cloud database.
 * Default row ID is `app_metadata`.
 */
export async function fetchCloudMetadata(
  rowId: string = DEFAULT_METADATA_ROW_ID
): Promise<CloudPayload | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('data')
      .eq('id', rowId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch notice:', error.message);
      return null;
    }

    if (data && data.data) {
      return data.data as CloudPayload;
    }
  } catch (err) {
    console.error('Failed to fetch metadata from Supabase cloud:', err);
  }

  return null;
}

/**
 * Fetch a single complete metadata record (including id, data, updated_at).
 */
export async function getMetadataRecordById(
  id: string
): Promise<MetadataRecord | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('id, data, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getMetadataRecordById notice:', error.message);
      return null;
    }

    return data as MetadataRecord | null;
  } catch (err) {
    console.error('Failed to get metadata record by id:', err);
    return null;
  }
}

/**
 * Read / List all metadata records present in the `metadata` table.
 */
export async function fetchAllMetadataRecords(): Promise<MetadataRecord[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('id, data, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase fetchAllMetadataRecords error:', error.message);
      return [];
    }

    return (data || []) as MetadataRecord[];
  } catch (err) {
    console.error('Failed to list all metadata records:', err);
    return [];
  }
}

/**
 * Check if a metadata row exists in the table.
 */
export async function checkMetadataExists(id: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

// ==========================================
// 3. UPDATE / UPSERT: Modify metadata
// ==========================================
/**
 * Update an existing metadata record in Supabase.
 * Returns error if the record does not exist.
 */
export async function updateMetadataRecord(
  id: string,
  activityData: ActivityMetaData,
  categories: CategoryInfo[]
): Promise<{ success: boolean; data?: MetadataRecord; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client is not configured.' };

  try {
    const payload: CloudPayload = {
      data: activityData,
      categories,
    };

    const updatePayload = {
      data: payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('metadata')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase updateMetadataRecord error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MetadataRecord };
  } catch (err: any) {
    console.error('Failed to update metadata in Supabase:', err);
    return { success: false, error: err?.message || 'Unknown error occurred.' };
  }
}

/**
 * Save / Upsert JSON metadata state directly to Supabase cloud database.
 * If the record exists it updates it; if not, it inserts it.
 */
export async function saveCloudMetadata(
  activityData: ActivityMetaData,
  categories: CategoryInfo[],
  rowId: string = DEFAULT_METADATA_ROW_ID
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const payload: CloudPayload = {
      data: activityData,
      categories,
    };

    const { error } = await supabase.from('metadata').upsert({
      id: rowId,
      data: payload,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save metadata to Supabase cloud:', err);
    return false;
  }
}

// ==========================================
// 4. DELETE: Remove metadata records
// ==========================================
/**
 * Delete a specific metadata record by ID.
 */
export async function deleteMetadataRecord(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client is not configured.' };

  try {
    const { error } = await supabase
      .from('metadata')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase deleteMetadataRecord error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete metadata record:', err);
    return { success: false, error: err?.message || 'Unknown error occurred.' };
  }
}

/**
 * Delete the active cloud metadata record ('app_metadata').
 */
export async function deleteCloudMetadata(
  rowId: string = DEFAULT_METADATA_ROW_ID
): Promise<boolean> {
  const res = await deleteMetadataRecord(rowId);
  return res.success;
}

/**
 * Delete all records in the `metadata` table.
 */
export async function deleteAllMetadataRecords(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client is not configured.' };

  try {
    // Delete all rows where id is not empty
    const { error } = await supabase
      .from('metadata')
      .delete()
      .neq('id', '');

    if (error) {
      console.error('Supabase deleteAllMetadataRecords error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete all metadata records:', err);
    return { success: false, error: err?.message || 'Unknown error occurred.' };
  }
}

