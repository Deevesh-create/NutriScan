-- Products no food database knew, typed in by NutriScan users from the pack's label, plus
-- "Delete my account" in Settings. Run once in Supabase Dashboard -> SQL Editor (safe to re-run).

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
