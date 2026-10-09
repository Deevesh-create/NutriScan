import { median } from './classify';
import { type FoodResult, fromOff } from './foods';

// Open Food Facts asks apps to identify themselves.
const headers = { 'User-Agent': 'NutriScan/1.0 (student coursework app)' };

/** Looks a barcode up on Open Food Facts (free, no API key). Returns null if the product is unknown. */
export async function fetchProduct(barcode: string): Promise<FoodResult | null> {
  // Only digits ever reach the URL.
  if (!/^\d{6,14}$/.test(barcode)) throw new Error('Invalid barcode');

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` +
      '?fields=code,product_name,brands,image_front_small_url,nutriments,serving_size,serving_quantity',
    { headers },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Food database error ${res.status}`);

  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;
  return fromOff({ code: barcode, ...json.product });
}

/** Branded products matching a name, e.g. "nutella". */
export async function searchOff(term: string): Promise<FoodResult[]> {
  const res = await fetch(
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(term)}&page_size=15` +
      '&fields=code,product_name,brands,image_front_small_url,nutriments,serving_size,serving_quantity',
    { headers },
  );
  if (!res.ok) throw new Error(`Food database error ${res.status}`);
  const json = await res.json();
  return (json.hits ?? []).map(fromOff).filter((f: FoodResult | null): f is FoodResult => f !== null);
}

/**
 * Estimated kcal per 100 g for a dish name: the median of the top 5 Open Food Facts search hits.
 * Null when nothing useful comes back. Used only when USDA has no match for a photographed dish.
 */
export async function searchDishKcal(dish: string): Promise<number | null> {
  const res = await fetch(
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(dish)}&page_size=5&fields=product_name,nutriments`,
    { headers },
  );
  if (!res.ok) throw new Error(`Food database error ${res.status}`);
  const json = await res.json();
  const kcal = (json.hits ?? [])
    .map((h: { nutriments?: Record<string, unknown> }) => Number(h.nutriments?.['energy-kcal_100g']))
    .filter((n: number) => n > 0 && n <= 900);
  const m = median(kcal);
  return m == null ? null : Math.round(m);
}
