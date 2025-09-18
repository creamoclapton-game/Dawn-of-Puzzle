
// Cloud leaderboard configuration (optional).
// To enable, create a free Supabase project, then set:
// window.DOP_SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
// window.DOP_SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
// And create a table: scores (id uuid default uuid_generate_v4(), pieces int, seconds int, when_timestamptz, mode text, created_at timestamptz default now())
// Then the leaderboard will auto-activate.
window.DOP_SUPABASE_URL = window.DOP_SUPABASE_URL || null;
window.DOP_SUPABASE_ANON_KEY = window.DOP_SUPABASE_ANON_KEY || null;
