// Copy this file to env.ts and paste in your values from Supabase Dashboard -> Project Settings -> API.
// Both are public by design: Row Level Security protects the data. Real secrets (the USDA key) live
// only on the server, as Supabase Edge Function secrets (see supabase/functions/usda-search).
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
