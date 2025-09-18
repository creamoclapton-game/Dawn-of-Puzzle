
# 🌅 Dawn of Puzzles — Pro Build

Upgrades:
- Classic **jigsaw tab shapes** (curved tabs/holes) with precise hit-testing
- **Daily Challenge** mode: deterministic puzzle seeded by date (+ theme)
- **Cloud leaderboard** (optional via Supabase) + local highscores
- Touch support, seasonal themes, PWA offline-capable

## How to play
- **Free Play:** choose Tier and exact Pieces (10–1000), pick a theme, upload an image or use the demo, then **New Puzzle**.
- **Daily Challenge:** set Mode to Daily (piece count is chosen for the day). Everyone gets the same layout for that date.
- Drag to move, pieces snap when close. Use **Peek** to preview the full image briefly.

## Cloud Leaderboard (Optional)
1. Create a free Supabase project.
2. In the project SQL editor, ensure `uuid-ossp` and a `scores` table exist, e.g.:
   ```sql
   create extension if not exists "uuid-ossp";
   create table if not exists scores (
     id uuid primary key default uuid_generate_v4(),
     pieces int not null,
     seconds int not null,
     when_timestamptz timestamptz,
     mode text,
     created_at timestamptz default now()
   );
   ```
3. In **Authentication → Policies** add an anon insert/select policy for the `scores` table (for public posting/reading), or scope to your domain.
4. Open `config.js` and set:
   ```js
   window.DOP_SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   window.DOP_SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
   ```
5. Deploy. The **Cloud Leaderboard** panel will switch from “Not configured” to “Connected”. Press **Submit Score** after finishing a puzzle.

> Prefer a different backend? Swap the fetch calls in `main.js` for your service.

## Deploy
- **Itch.io**: zip the folder, choose “HTML” project, “This file will be played in the browser”.
- **GitHub Pages**: push to a repo root and enable Pages.
- **iPhone**: open your page in Safari → Share → **Add to Home Screen** for full-screen, offline play.

## Performance Tips
- 700–1000 pieces are heavy on mobile; close other tabs/apps for smoother dragging.
- Desktop browsers handle very high piece counts more easily.

MIT License.
