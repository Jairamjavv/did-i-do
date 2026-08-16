export type ActivityCategory = string;

export type ColumnType = 'backlog' | 'in_progress' | 'completed';

export interface SeasonDetail {
  seasonNumber: number;
  totalEpisodes: number;
  episodesCompleted?: number;
}

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
  // Series-specific season & episode tracking
  totalSeasons?: number;
  seasons?: SeasonDetail[];
  currentSeason?: number;
  currentEpisode?: number;
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

export interface DIDUser {
  did_id: string;          // e.g. "did_abc123"
  identifier: string;      // email or phone
  passcode: string;        // 6-8 digit numerical passcode
  displayName: string;     // user nickname/name
  createdAt: string;
}

export interface AuthRegistryPayload {
  users: DIDUser[];
}

export interface CompletionLogEntry {
  id: string;
  itemId: string;
  did_id: string;
  title: string;
  category: ActivityCategory;
  creatorOrMeta?: string;
  rating?: number;
  completedAt: string;
  createdAt: string;
  durationDays: number;
  durationText: string;
  streakDays: number;
  has3DayStreak: boolean;
}

export interface UserCompletionLogPayload {
  did_id: string;
  fifoQueue: CompletionLogEntry[];  // max 6 items strictly FIFO
  history: CompletionLogEntry[];    // full audit log of all completed cards
  lastUpdated: string;
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

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'books',
    name: 'Books',
    verb: 'reading',
    iconName: 'BookOpen',
    unitDefault: 'pages',
  },
  {
    id: 'movies',
    name: 'Movies',
    verb: 'watching',
    iconName: 'Film',
    unitDefault: 'mins',
  },
  {
    id: 'series',
    name: 'Series',
    verb: 'seeing',
    iconName: 'Tv',
    unitDefault: 'episodes',
  },
  {
    id: 'games',
    name: 'Games',
    verb: 'playing',
    iconName: 'Gamepad2',
    unitDefault: 'hours',
  },
];

export const EMPTY_METADATA: ActivityMetaData = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  items: [],
};
