// Pure helpers that turn each food database's answer into one shape. No imports, so
// scripts/check-calories.mjs can test them in plain Node.

export type FoodSource = 'Mauritian foods' | 'USDA' | 'Open Food Facts' | 'NutriScan users';

/** One food from any database, nutrients per 100 g, ready to fill the Add food form. */
export interface FoodResult {
  key: string;
  name: string;
  brand?: string;
  source: FoodSource;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  // Optional: not every database or label gives them.
  satFat100?: number;
  sugars100?: number;
  fiber100?: number;
  salt100?: number;
  servings: { label: string; grams: number }[]; // e.g. "1 banana" = 126 g
  barcode?: string;
  imageUrl?: string;
}

/** The optional nutrients: per-100 g key, diary column (grams eaten) and name. */
export const EXTRAS = [
  { key: 'satFat100', column: 'sat_fat_g', name: 'Sat. fat' },
  { key: 'sugars100', column: 'sugars_g', name: 'Sugars' },
  { key: 'fiber100', column: 'fiber_g', name: 'Fibre' },
  { key: 'salt100', column: 'salt_g', name: 'Salt' },
] as const;

const round1 = (n: unknown) => Math.round((Number(n) || 0) * 10) / 10;
/** An optional value: undefined when missing, rounded otherwise. */
const opt = (n: unknown) => (n == null || n === '' || !Number.isFinite(Number(n)) ? undefined : round1(n));
/** Salt from sodium, both in g: salt = sodium x 2.5. */
const saltOf = (sodiumG: unknown) => (sodiumG == null ? undefined : opt(Number(sodiumG) * 2.5));

/** USDA brand names come in capitals ("PEANUT BUTTER"); show them like normal words. */
export function tidyName(name: string): string {
  const s = name.trim().replace(/\s+/g, ' ');
  if (s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

/** Drops entries that can't be real food per 100 g (and that the database rules would reject). */
function valid(f: FoodResult): FoodResult | null {
  const ok =
    f.name.length > 0 &&
    f.kcal100 >= 0 &&
    f.kcal100 <= 900 &&
    [f.protein100, f.carbs100, f.fat100].every((g) => g >= 0 && g <= 100);
  if (!ok) return null;
  // An impossible optional value (a database typo) is dropped rather than the whole food.
  const extras = Object.fromEntries(EXTRAS.map(({ key }) => [key, f[key] != null && f[key]! >= 0 && f[key]! <= 100 ? f[key] : undefined]));
  return { ...f, ...extras, name: f.name.slice(0, 120) };
}

const uniqueServings = (list: { label: string; grams: number }[]) => {
  const seen = new Set<string>();
  return list.filter((s) => s.grams > 0 && !seen.has(s.label) && seen.add(s.label)).slice(0, 4);
};

// USDA nutrient ids: energy (kcal, or the Atwater kcal values Foundation foods use), protein, fat, carbs;
// optional: saturated fat 1258, total sugars 2000 (1063 in Foundation foods), fibre 1079, sodium 1093 (mg).
// supabase/functions/usda-search keeps only these, so add any new id there too.
const KCAL_IDS = [1008, 2047, 2048];

/** One food from a USDA FoodData Central search. Its nutrients are already per 100 g. */
export function fromUsda(f: any): FoodResult | null {
  const get = (id: number) => f.foodNutrients?.find((n: any) => n.nutrientId === id)?.value;
  const kcal = KCAL_IDS.map(get).find((v) => v != null);
  if (kcal == null) return null;

  const servings = (f.foodMeasures ?? [])
    .filter((m: any) => m.gramWeight > 0 && m.disseminationText && m.disseminationText !== 'Quantity not specified')
    .map((m: any) => ({ label: m.disseminationText, grams: Math.round(m.gramWeight) }));
  // Branded foods give one label serving instead; ml is close enough to g for drinks.
  if (f.servingSize > 0 && /^(g|grm|ml|mlt)$/i.test(f.servingSizeUnit ?? '')) {
    servings.push({ label: tidyName(f.householdServingFullText || '1 serving'), grams: Math.round(f.servingSize) });
  }

  // Put servings named after the food first ("1 banana" before "1 cup, mashed"): that's the default.
  const name = tidyName(String(f.description ?? ''));
  const word = name.split(/[\s,]/)[0].toLowerCase().replace(/e?s$/, '');
  const mentions = (s: { label: string }) => (word && s.label.toLowerCase().includes(word) ? 0 : 1);
  servings.sort((a: { label: string }, b: { label: string }) => mentions(a) - mentions(b));

  return valid({
    key: `usda-${f.fdcId}`,
    name,
    brand: f.brandName || f.brandOwner ? tidyName(f.brandName || f.brandOwner) : undefined,
    source: 'USDA',
    kcal100: round1(kcal),
    protein100: round1(get(1003)),
    carbs100: round1(get(1005)),
    fat100: round1(get(1004)),
    satFat100: opt(get(1258)),
    sugars100: opt(get(2000) ?? get(1063)),
    fiber100: opt(get(1079)),
    salt100: get(1093) == null ? undefined : saltOf(get(1093) / 1000),
    servings: uniqueServings(servings),
    barcode: f.gtinUpc || undefined,
  });
}

/** One product from Open Food Facts (barcode lookup or search). */
export function fromOff(p: any): FoodResult | null {
  const n = p.nutriments ?? {};
  // Some products only list energy in kJ.
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g != null ? Number(n.energy_100g) / 4.184 : undefined);
  const name = String(p.product_name ?? '').trim();
  if (kcal == null || !name) return null;
  const brand = [].concat(p.brands ?? []).join(', ').split(',')[0].trim();
  const servingGrams = Number(p.serving_quantity);

  return valid({
    key: `off-${p.code ?? name}`,
    name,
    brand: brand || undefined,
    source: 'Open Food Facts',
    kcal100: round1(kcal),
    protein100: round1(n.proteins_100g),
    carbs100: round1(n.carbohydrates_100g),
    fat100: round1(n.fat_100g),
    satFat100: opt(n['saturated-fat_100g']),
    sugars100: opt(n.sugars_100g),
    fiber100: opt(n.fiber_100g),
    salt100: opt(n.salt_100g) ?? saltOf(n.sodium_100g),
    servings: servingGrams > 0 ? [{ label: p.serving_size || '1 serving', grams: Math.round(servingGrams) }] : [],
    barcode: p.code || undefined,
    imageUrl: p.image_front_small_url || undefined,
  });
}

/** A row of one of NutriScan's own Supabase tables, which share the same nutrient columns. */
const fromRow = (r: any, source: FoodSource, key: string): FoodResult | null =>
  valid({
    key,
    name: String(r.name ?? ''),
    source,
    kcal100: round1(r.kcal_100g),
    protein100: round1(r.protein_100g),
    carbs100: round1(r.carbs_100g),
    fat100: round1(r.fat_100g),
    satFat100: opt(r.sat_fat_100g),
    sugars100: opt(r.sugars_100g),
    fiber100: opt(r.fiber_100g),
    salt100: opt(r.salt_100g),
    servings: r.serving_g > 0 ? [{ label: r.serving_label || '1 serving', grams: Math.round(r.serving_g) }] : [],
    barcode: r.barcode || undefined,
  });

/** One row of the mauritian_foods table. */
export const fromMauritian = (r: any) => fromRow(r, 'Mauritian foods', `mu-${r.id}`);

/** A product a NutriScan user typed in from its label (community_foods table). */
export const fromCommunity = (r: any) => fromRow(r, 'NutriScan users', `user-${r.barcode}`);

/**
 * The same product can be stored as UPC-A (12 digits) or as EAN-13 with a leading 0,
 * and USDA sometimes pads to 14. Try each form so a scan finds it in either database.
 */
export function barcodeVariants(code: string): string[] {
  const out = new Set([code]);
  if (code.length === 12) out.add(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.add(code.slice(1));
  if (code.length === 14 && code.startsWith('00')) out.add(code.slice(2));
  return [...out];
}

/**
 * Order search results the way people expect: your own Mauritian foods, then plain foods
 * ("Banana, raw"), then branded products. Within each group, names that start with what
 * you typed come first, then shorter (simpler) names. Duplicates are dropped.
 * ponytail: simple heuristic, not full-text relevance; good enough for 3 short lists.
 */
export function rankResults(query: string, items: FoodResult[]): FoodResult[] {
  const first = query.trim().toLowerCase().split(/\s+/)[0] ?? '';
  const group = (f: FoodResult) =>
    f.source === 'Mauritian foods' ? 0 : f.source === 'USDA' && !f.brand ? 1 : f.source === 'USDA' ? 3 : 2;
  const starts = (f: FoodResult) => (f.name.toLowerCase().startsWith(first) ? 0 : 1);
  const seen = new Set<string>();
  return items
    .filter((f) => {
      const k = `${f.name}|${f.brand ?? ''}`.toLowerCase();
      return !seen.has(k) && !!seen.add(k);
    })
    .map((f, i) => ({ f, i }))
    .sort((a, b) => group(a.f) - group(b.f) || starts(a.f) - starts(b.f) || a.f.name.length - b.f.name.length || a.i - b.i)
    .map((x) => x.f);
}

/** The newest diary row for each different food name, newest first, for the "Recent" list. */
export function recentFoods<T extends { name: string }>(rows: T[], count = 8): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = r.name.trim().toLowerCase();
    return !seen.has(k) && !!seen.add(k);
  }).slice(0, count);
}
