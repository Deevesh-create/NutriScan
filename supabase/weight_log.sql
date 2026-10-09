-- Weight log (8 Oct): one weight per user per day, for the chart on History. Logging a weight also
-- updates nutrition_goals (from the app), so the calorie target follows the user's weight.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.

create table if not exists public.weight_log (
  user_id   uuid    not null default auth.uid() references auth.users on delete cascade,
  logged_on date    not null,
  weight_kg numeric not null check (weight_kg between 30 and 300),
  primary key (user_id, logged_on)
);

alter table public.weight_log enable row level security;
drop policy if exists "own weight" on public.weight_log;
create policy "own weight" on public.weight_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
