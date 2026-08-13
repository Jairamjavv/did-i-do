# D.I.D — Did I Do

A pure, local-first web application for keeping track of your activity logs: finished books, watched movies, completed series, and beaten games.

## Features
- **Cloud Database Sync**: Powered by Supabase PostgreSQL for cross-device metadata sync without relying on browser `localStorage`.
- **Free Vercel Deployment**: Host for free with global CDN and automatic continuous deployment.

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
