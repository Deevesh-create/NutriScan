-- How each food was added: drives the diary labels and the Scanner / Food photographer badges.
-- Run once in Supabase Dashboard -> SQL Editor (new projects get it from schema.sql).
alter table public.food_entries
  add column if not exists source text not null default 'manual'
  check (source in ('barcode', 'photo', 'search', 'manual'));
