-- Saturated fat, sugars, fibre and salt on every food, plus the daily water count (8 Oct).
-- Run once in Supabase Dashboard -> SQL Editor, BEFORE installing the app version that uses them.
-- Safe to re-run. All new nutrient columns are optional: empty means "not known".

-- Grams eaten, like protein_g / carbs_g / fat_g.
alter table public.food_entries
  add column if not exists sat_fat_g numeric check (sat_fat_g >= 0),
  add column if not exists sugars_g  numeric check (sugars_g >= 0),
  add column if not exists fiber_g   numeric check (fiber_g >= 0),
  add column if not exists salt_g    numeric check (salt_g >= 0);

-- Per 100 g, like kcal_100g.
alter table public.community_foods
  add column if not exists sat_fat_100g numeric check (sat_fat_100g between 0 and 100),
  add column if not exists sugars_100g  numeric check (sugars_100g between 0 and 100),
  add column if not exists fiber_100g   numeric check (fiber_100g between 0 and 100),
  add column if not exists salt_100g    numeric check (salt_100g between 0 and 100);

alter table public.mauritian_foods
  add column if not exists sat_fat_100g numeric check (sat_fat_100g between 0 and 100),
  add column if not exists sugars_100g  numeric check (sugars_100g between 0 and 100),
  add column if not exists fiber_100g   numeric check (fiber_100g between 0 and 100),
  add column if not exists salt_100g    numeric check (salt_100g between 0 and 100);

-- Glasses of water (250 ml) per day. One row per user per day; only you can see or change yours.
create table if not exists public.water_intake (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  drunk_on date not null,
  glasses  int  not null check (glasses between 0 and 40),
  primary key (user_id, drunk_on)
);

alter table public.water_intake enable row level security;
drop policy if exists "own water" on public.water_intake;
create policy "own water" on public.water_intake for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
