# D.I.D — Did I Do

A pure, local-first web application for keeping track of your activity logs: finished books, watched movies, completed series, and beaten games.

## Features
- **Cloud Database Sync & Full CRUD**: Powered by Supabase PostgreSQL `metadata` table for cross-device metadata sync, version snapshotting, insert/fetch/update/delete operations without relying on browser `localStorage`.
- **JSON Metadata Engine**: In-browser inspector, full export/import, and direct schema-backed JSON editor.
- **Free Vercel Deployment**: Host for free with global CDN and automatic continuous deployment.

## Supabase Database Setup

Run the following SQL snippet in your **Supabase SQL Editor** to create the `metadata` table and configure Row Level Security (RLS):

```sql
-- Create the metadata table for activity logs
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

### Supported Metadata CRUD Operations
- **CREATE**: Insert a new metadata snapshot / version row (`createMetadataRecord`).
- **READ**: Fetch active metadata (`fetchCloudMetadata`) or list all snapshots in table (`fetchAllMetadataRecords`).
- **UPDATE / UPSERT**: Update an existing row (`updateMetadataRecord`) or upsert state (`saveCloudMetadata`).
- **DELETE**: Delete a specific row (`deleteMetadataRecord`) or purge table (`deleteAllMetadataRecords`).

## Run Locally

**Prerequisites:** Node.js (v18+)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy `.env.example` to `.env` and add your Supabase project credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

3. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

