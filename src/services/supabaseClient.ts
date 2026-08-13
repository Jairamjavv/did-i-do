import { createClient } from '@supabase/supabase-js';
import { ActivityMetaData, CategoryInfo } from '../types';

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

const METADATA_ROW_ID = 'app_metadata';

export interface CloudPayload {
  data: ActivityMetaData;
  categories: CategoryInfo[];
}

/**
 * Fetch the latest JSON metadata state from Supabase cloud database.
 */
export async function fetchCloudMetadata(): Promise<CloudPayload | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('metadata')
      .select('data')
      .eq('id', METADATA_ROW_ID)
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
 * Save / Upsert JSON metadata state directly to Supabase cloud database.
 */
export async function saveCloudMetadata(
  activityData: ActivityMetaData,
  categories: CategoryInfo[]
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const payload: CloudPayload = {
      data: activityData,
      categories,
    };

    const { error } = await supabase.from('metadata').upsert({
      id: METADATA_ROW_ID,
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
