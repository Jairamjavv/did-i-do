import { createClient } from '@supabase/supabase-js';
import { ActivityMetaData, CategoryInfo, CloudPayload, MetadataRecord } from '../types';

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

export type { CloudPayload, MetadataRecord };

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

