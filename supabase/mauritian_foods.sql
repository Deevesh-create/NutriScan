-- Mauritian foods that USDA and Open Food Facts don't have (dholl puri, gâteau piment, rougaille…).
-- Mauritius has no national food composition table, so each row records where its values came from.
-- Run once in Supabase Dashboard -> SQL Editor. Fill it with Table Editor -> mauritian_foods -> Import data from CSV
-- (template: supabase/mauritian_foods_template.csv). Values are per 100 g.

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
