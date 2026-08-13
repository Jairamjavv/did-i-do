export type ActivityCategory = string;

export type ColumnType = 'backlog' | 'in_progress' | 'completed';

export interface TaskItem {
  id: string;
  category: ActivityCategory;
  title: string;
  creatorOrMeta?: string; // Author, Director, Showrunner, Platform/Studio
  column: ColumnType;
  progress: number; // 0 to 100 percentage
  totalUnits?: number; // e.g. 400 pages, 10 episodes, 60 hours, 120 mins
  currentUnit?: number; // e.g. 180 pages read
  unitName?: string; // 'pages', 'episodes', 'hours', 'mins'
  priority?: 'low' | 'medium' | 'high';
  rating?: number; // 1 to 5
  notes?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ActivityMetaData {
  version: string;
  lastUpdated: string;
  items: TaskItem[];
}

export interface CategoryInfo {
  id: ActivityCategory;
  name: string;
  verb: string;
  iconName: string;
  unitDefault: string;
}

export interface CloudPayload {
  data: ActivityMetaData;
  categories: CategoryInfo[];
}

export interface MetadataRecord {
  id: string;
  data: CloudPayload;
  updated_at: string;
}

export type ThemeMode = 'dark' | 'light';
