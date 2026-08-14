# D.I.D — Did I Do

**D.I.D (Did I Do)** is a Neo-Brutalist, personal leisure activity velocity tracker designed to keep track of your reading, viewing, and gaming pursuits without clutter or distractions.

---

## 🚀 Key Features & Additions

### 1. 🌟 Welcome Landing Page
- **Neo-Brutalist Design Aesthetic**: Bold borders, vibrant contrast, tactile shadows (`shadow-[6px_6px_0px_0px_#000]`), and clean architectural grid layout.
- **Horizontal Rotating Showcase**: Auto-rotating static live cards showcasing category workflows (**Books**, **Movies**, **Series**, **Games**) with progress bars, unit trackers, ratings, and quotes.
- **Keep It Simple Architecture**: Zero clutter, fast interaction, and instant feedback.

### 2. 🔐 Passcode Authentication & User-Specific `did_id`
- **Fast Passcode Access**: Register or sign in using an **Email or Phone Number** and a **6–8 numerical digit passcode**.
- **Registration Name / Short Name**: Collects user name during registration to personalize dashboards and badges.
- **Strict Input Sanitization**: Defends against script injection and XSS by sanitizing text, identifiers, and enforcing numerical-only passcode formats.
- **Isolated User Storage**: Every user gets a unique `did_id` (e.g. `did_u_...`). All kanban boards, categories, and logs are strictly scoped to the authenticated user's `did_id`.

### 3. 🚂 "Train Carriage" FIFO Queue (Recently Completed Activities)
- **Visual Disconnected Carriages**: Completed activities are displayed as horizontally stacked green standalone carriage boxes (0 to 6 max, `#1 FIFO` to `#6 FIFO`).
- **Strict FIFO Logic**: New completions enter from the right. When a 7th card is completed, carriage #1 pops off and remaining cards advance sequentially.
- **Completion Metrics**:
  - ⏱️ **Total Duration**: Elapsed time to completion (e.g. `2d`, `5h`, `<1h`).
  - 🔥 **3-Day Consecutive Streak**: Calculates consecutive daily completion logs and awards a glowing streak badge for users active 3+ days in a row.
- **Always-Shrunk Completed Cards**: Completed task cards on boards stay in their compact, streamlined format.

### 4. ☁️ Supabase Cloud DB, Realtime Sync & OCC Locking
- **Instant Cross-Device Sync**: Uses Supabase Realtime Channels (`supabase.channel`) to live-broadcast task and board changes across tabs and devices without page reloads.
- **Optimistic Concurrency Control (OCC)**: Tracks `lastKnownUpdated` timestamps and applies an intelligent non-destructive item merge (`mergeCloudPayloads`) when concurrent edits occur, preventing overwriting unsynced changes.
- **JSON Metadata Engine**: In-browser inspector, full export/import, snapshot management, and raw JSON editor.

---

## 🗄️ Supabase Database Schema

Run the following SQL snippet in your **Supabase SQL Editor** to initialize the `metadata` table and Row Level Security (RLS):

```sql
-- Create the metadata table for activity logs & user registries
CREATE TABLE IF NOT EXISTS metadata (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for app usage
CREATE POLICY "Allow anon select on metadata" ON metadata FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on metadata" ON metadata FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on metadata" ON metadata FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete on metadata" ON metadata FOR DELETE TO anon USING (true);
```

### Table Storage Structure
- `auth_users_registry`: Holds the list of registered users (`did_id`, identifier, passcode, displayName).
- `did_u_{id}`: Isolated activity metadata and board state for each user.
- `completed_logs_{did_id}`: FIFO queue (top 6) and completion audit history with duration and streak tracking.

---

## 🛠️ Run Locally

**Prerequisites:** Node.js (v18+)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and provide your Supabase credentials:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Lint & Build:**
   ```bash
   npm run lint   # Type-check via tsc --noEmit
   npm run build  # Production build via Vite
   ```
