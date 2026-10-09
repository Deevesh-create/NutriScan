-- NutriScan database. Run once in Supabase Dashboard -> SQL Editor.

create table public.nutrition_goals (
  user_id          uuid primary key references auth.users on delete cascade,
  sex              text    not null check (sex in ('male', 'female')),
  age              int     not null check (age between 13 and 100),
  height_cm        numeric not null check (height_cm between 100 and 250),
  weight_kg        numeric not null check (weight_kg between 30 and 300),
  activity         numeric not null check (activity between 1.2 and 1.9),
  weekly_loss_kg   numeric not null check (weekly_loss_kg between 0 and 1),
  maintenance_kcal int     not null check (maintenance_kcal > 0),
  daily_kcal       int     not null check (daily_kcal between 1200 and 10000),
  updated_at       timestamptz not null default now()
);

create table public.food_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  eaten_on   date not null,
  meal       text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name       text not null check (char_length(name) between 1 and 120),
  barcode    text check (barcode ~ '^[0-9]{6,14}$'),
  grams      numeric not null check (grams > 0 and grams <= 2000),
  kcal       int not null check (kcal between 0 and 18000),
  protein_g  numeric check (protein_g >= 0),
  carbs_g    numeric check (carbs_g >= 0),
  fat_g      numeric check (fat_g >= 0),
  source     text not null default 'manual' check (source in ('barcode', 'photo', 'search', 'manual')),
  created_at timestamptz not null default now()
);

create index food_entries_user_day on public.food_entries (user_id, eaten_on);

-- Row Level Security: a signed-in user can only read and change their own rows.
alter table public.nutrition_goals enable row level security;
alter table public.food_entries enable row level security;

create policy "own goals" on public.nutrition_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own food" on public.food_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mauritian foods (also in mauritian_foods.sql, for projects created before it existed)
create table if not exists public.mauritian_foods (
  id            bigint generated always as identity primary key,
  name          text    not null check (char_length(name) between 1 and 120),
  kcal_100g     numeric not null check (kcal_100g between 0 and 900),
  protein_100g  numeric not null default 0 check (protein_100g between 0 and 100),
  carbs_100g    numeric not null default 0 check (carbs_100g between 0 and 100),
  fat_100g      numeric not null default 0 check (fat_100g between 0 and 100),
  serving_label text,
  serving_g     numeric check (serving_g > 0),
  source        text    not null check (char_length(source) > 0) -- e.g. 'INDB recipe: dal puri', 'USDA FNDDS 2709225'
);

-- Reference data: any signed-in user can read it; only the dashboard can change it.
alter table public.mauritian_foods enable row level security;
drop policy if exists "read mauritian foods" on public.mauritian_foods;
create policy "read mauritian foods" on public.mauritian_foods for select to authenticated using (true);

-- (also in community_foods.sql, for projects created before it existed)

-- Shared: any signed-in user's next scan of the barcode finds it. Users can only add rows as themselves.
create table if not exists public.community_foods (
  barcode      text    primary key check (barcode ~ '^[0-9]{6,14}$'),
  name         text    not null check (char_length(name) between 1 and 120),
  kcal_100g    numeric not null check (kcal_100g between 0 and 900),
  protein_100g numeric not null default 0 check (protein_100g between 0 and 100),
  carbs_100g   numeric not null default 0 check (carbs_100g between 0 and 100),
  fat_100g     numeric not null default 0 check (fat_100g between 0 and 100),
  serving_g    numeric check (serving_g > 0 and serving_g <= 2000),
  created_by   uuid    default auth.uid() references auth.users on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.community_foods enable row level security;
drop policy if exists "read community foods" on public.community_foods;
create policy "read community foods" on public.community_foods for select to authenticated using (true);
drop policy if exists "add community foods" on public.community_foods;
create policy "add community foods" on public.community_foods for insert to authenticated
  with check (created_by = auth.uid());

-- Users can't delete their own login, so this runs as the database owner (security definer).
-- It only ever deletes the caller (auth.uid()). Their goal and diary go with it (on delete cascade);
-- products they added stay, with created_by set to null.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- (also in nutrients_and_water.sql, for projects created before it existed)
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


-- (also in weight_log.sql, for projects created before it existed)
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
