import { supabase } from './supabase';
import { type FoodResult, barcodeVariants, fromCommunity, fromMauritian, fromUsda, rankResults } from './foods';
import { fetchProduct, searchDishKcal, searchOff } from './openFoodFacts';
import { searchTerm } from './mauritian';

const notNull = (f: FoodResult | null): f is FoodResult => f !== null;

// Plain foods ("Banana, raw") vs packaged products with a brand and barcode.
const GENERIC = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];
const BRANDED = ['Branded'];

/**
 * USDA FoodData Central search, through NutriScan's Supabase Edge Function
 * (supabase/functions/usda-search), which holds the USDA key so it isn't in the app. Signed-in users only.
 */
async function searchUsda(query: string, dataType: string[], pageSize: number): Promise<FoodResult[]> {
  const { data, error } = await supabase.functions.invoke('usda-search', { body: { query, dataType, pageSize } });
  if (error) throw error;
  return (data.foods ?? []).map(fromUsda).filter(notNull);
}

/** Foods in one of NutriScan's own tables whose name contains the query. */
async function searchOwn(table: string, toFood: (r: any) => FoodResult | null, query: string): Promise<FoodResult[]> {
  const { data, error } = await supabase.from(table).select('*').ilike('name', `%${query}%`).limit(10);
  if (error) return []; // table not created yet, or offline: just no results from it
  return data.map(toFood).filter(notNull);
}

/**
 * MyFitnessPal-style search across every source at once. Throws only when no source answered,
 * which almost always means there's no internet.
 */
export async function searchFoods(query: string): Promise<{ results: FoodResult[]; alias?: string }> {
  const { term, alias } = searchTerm(query);
  const answers = await Promise.allSettled([
    searchOwn('mauritian_foods', fromMauritian, query.trim()),
    searchOwn('community_foods', fromCommunity, query.trim()),
    searchUsda(term, GENERIC, 10),
    searchOff(term),
    searchUsda(term, BRANDED, 10),
  ]);
  // NutriScan's own tables never throw, so "offline" = all three outside databases failed.
  if (answers.slice(2).every((a) => a.status === 'rejected')) throw new Error("Couldn't reach the food databases");
  const found = answers.flatMap((a) => (a.status === 'fulfilled' ? a.value : []));
  return { results: rankResults(term, found).slice(0, 30), alias };
}

/**
 * Barcode lookup: Open Food Facts first (worldwide), then USDA's branded foods (strong on US
 * products), trying the 12- and 13-digit forms of the code, then products NutriScan users typed in
 * from the label. Null when nobody knows it.
 */
export async function lookupBarcode(code: string): Promise<FoodResult | null> {
  let offFailed = false;
  try {
    const found = await fetchProduct(code);
    if (found) return found;
  } catch {
    offFailed = true;
  }

  const variants = barcodeVariants(code);
  try {
    for (const v of variants) {
      const usda = await searchUsda(v, BRANDED, 5);
      const match = usda.find((f) => f.barcode && barcodeVariants(f.barcode).some((b) => variants.includes(b)));
      if (match) return { ...match, barcode: code };
    }
  } catch {
    if (offFailed) throw new Error("Couldn't reach the food databases");
  }

  const { data } = await supabase.from('community_foods').select('*').in('barcode', variants).limit(1);
  const mine = data?.[0] ? fromCommunity(data[0]) : null;
  return mine ? { ...mine, barcode: code } : null;
}

/**
 * Saves a product that no database knew, as typed in from its label, so the next scan of this
 * barcode (by any NutriScan user) finds it. Best effort: the diary entry is already saved, and a
 * duplicate barcode (someone added it first) is simply refused by the database.
 */
export async function shareProduct(p: {
  barcode: string;
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  satFat100?: number;
  sugars100?: number;
  fiber100?: number;
  salt100?: number;
  grams: number;
}) {
  const { error } = await supabase.from('community_foods').insert({
    barcode: p.barcode,
    name: p.name,
    kcal_100g: p.kcal100,
    protein_100g: p.protein100,
    carbs_100g: p.carbs100,
    fat_100g: p.fat100,
    sat_fat_100g: p.satFat100 ?? null,
    sugars_100g: p.sugars100 ?? null,
    fiber_100g: p.fiber100 ?? null,
    salt_100g: p.salt100 ?? null,
    serving_g: p.grams,
  });
  if (error) console.warn('Product not shared:', error.message);
}

/**
 * Nutrition estimate for a photographed dish: the best USDA plain-food match (with macros),
 * else the median kcal of similar Open Food Facts products. Null when nothing matches.
 */
export async function estimateDish(dish: string): Promise<FoodResult | null> {
  const usda = await searchUsda(dish, GENERIC, 5).catch(() => []);
  const best = rankResults(dish, usda)[0];
  if (best) return best;
  const kcal100 = await searchDishKcal(dish).catch(() => null);
  return kcal100 == null
    ? null
    : { key: 'estimate', name: dish, source: 'Open Food Facts', kcal100, protein100: 0, carbs100: 0, fat100: 0, servings: [] };
}
