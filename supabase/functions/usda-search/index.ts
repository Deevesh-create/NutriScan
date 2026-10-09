// Supabase Edge Function "usda-search": the app's only way to reach USDA FoodData Central. The USDA
// key lives here as a Supabase secret (USDA_API_KEY), never in the app. Only signed-in NutriScan
// users can call it, and only for a small food search, so it can't be used as an open USDA gateway.
//
// Deploy: Supabase Dashboard -> Edge Functions -> Deploy a new function -> Via Editor,
// name it "usda-search", paste this file, Deploy. Then Edge Functions -> Secrets -> add USDA_API_KEY.

const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];
// Energy (kcal and the two Atwater kcal values), protein, fat, carbs, saturated fat, sugars (two ids),
// fibre and sodium: all the app reads. Dropping the other ~50 nutrients makes each answer several
// times smaller on mobile data.
const NUTRIENTS = new Set([1008, 2047, 2048, 1003, 1004, 1005, 1258, 2000, 1063, 1079, 1093]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // Signed-in users only: Supabase Auth says whose login token this is (an anon key alone fails).
  const user = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: req.headers.get('Authorization') ?? '', apikey: req.headers.get('apikey') ?? '' },
  });
  if (!user.ok) return json({ error: 'Sign in first' }, 401);

  const { query, dataType, pageSize } = await req.json().catch(() => ({}));
  const valid =
    typeof query === 'string' &&
    query.trim().length > 0 &&
    query.length <= 100 &&
    Array.isArray(dataType) &&
    dataType.length > 0 &&
    dataType.every((t) => DATA_TYPES.includes(t)) &&
    Number.isInteger(pageSize) &&
    pageSize >= 1 &&
    pageSize <= 25;
  if (!valid) return json({ error: 'Bad search' }, 400);

  // POST, not GET: with "Survey (FNDDS)" in the URL, USDA answers 400 Bad Request about half the time.
  const key = encodeURIComponent(Deno.env.get('USDA_API_KEY') ?? '');
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim(), dataType, pageSize }),
  });
  if (!res.ok) return json({ error: `USDA error ${res.status}` }, 502);

  const { foods = [] } = await res.json();
  return json({
    foods: foods.map((f: { foodNutrients?: { nutrientId: number; value: number }[] }) => ({
      ...f,
      foodNutrients: (f.foodNutrients ?? [])
        .filter((n) => NUTRIENTS.has(n.nutrientId))
        .map(({ nutrientId, value }) => ({ nutrientId, value })),
    })),
  });
});
