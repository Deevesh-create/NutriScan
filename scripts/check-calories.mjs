// Self-check for the calorie maths. Run: npm run check
import assert from 'node:assert/strict';
import {
  addDays,
  chartPoints,
  kcalFor,
  lastDays,
  localDate,
  macroShares,
  macroTargets,
  maintenanceKcal,
  mealForHour,
  nextDayCount,
  nextReminderAt,
  per100g,
  stepKcal,
  targetKcal,
  weekSummary,
  weekdayShort,
} from '../src/lib/calories.ts';
import { median, toRgb, topSuggestions } from '../src/lib/classify.ts';
import { barcodeVariants, fromCommunity, fromOff, fromUsda, rankResults, recentFoods, tidyName } from '../src/lib/foods.ts';
import { isMauritianDish, localName, searchTerm } from '../src/lib/mauritian.ts';
import { computeProgress, onTarget } from '../src/lib/progress.ts';
import { labelComplete, parseLabel } from '../src/lib/nutritionLabel.ts';
import { consentRecord, hasConsented } from '../src/lib/legal.ts';

const man = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 1.2, weeklyLossKg: 0.5 };
assert.equal(maintenanceKcal(man), 2136); // (800 + 1125 - 150 + 5) x 1.2
assert.equal(targetKcal(man), 1586); // 2136 - 0.5 x 7700 / 7

const small = { sex: 'female', age: 40, heightCm: 160, weightKg: 50, activity: 1.2, weeklyLossKg: 0.75 };
assert.equal(targetKcal(small), 1200); // would be 542, clamped to the safe floor

assert.equal(kcalFor(539, 15), 81); // 15 g of Nutella
assert.equal(localDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
assert.deepEqual(lastDays(3, new Date(2026, 2, 1)), ['2026-02-27', '2026-02-28', '2026-03-01']);
assert.equal(weekdayShort('2026-10-04'), 'Sun');
assert.equal(mealForHour(8), 'breakfast');
assert.equal(mealForHour(22), 'snack');

const week = weekSummary([2000, 0, 1500], 2136);
assert.equal(week.daysLogged, 2);
assert.equal(week.avgEaten, 1750);
assert.equal(week.deficit, 772); // (2136 - 2000) + (2136 - 1500); the empty day is skipped

const morning = new Date(2026, 9, 5, 7, 0);
assert.equal(nextReminderAt(8, 30, morning), new Date(2026, 9, 5, 8, 30).getTime()); // later today
assert.equal(nextReminderAt(6, 0, morning), new Date(2026, 9, 6, 6, 0).getTime()); // already passed: tomorrow

// Meal recognition helpers
// 2x1 image, BGRA, each row padded to 12 bytes: pixels (10,20,30) and (40,50,60) come out as RGB.
const bgra = Uint8Array.from([30, 20, 10, 255, 60, 50, 40, 255, 0, 0, 0, 0]);
assert.deepEqual([...toRgb(bgra, 'BGRA', 2, 1)], [10, 20, 30, 40, 50, 60]);
assert.deepEqual([...toRgb(Uint8Array.from([255, 1, 2, 3]), 'ARGB', 1, 1)], [1, 2, 3]);
const top = topSuggestions([250, 10, 200, 30, 120], ['bg', 'a', 'b', 'c', 'd'], 255);
assert.deepEqual(top.map((t) => t.name), ['b', 'd', 'c']); // background (index 0) skipped
assert.equal(Math.round(top[0].score * 100), 78); // 200 / 255
assert.equal(median([245, 104, 161, 117, 169]), 161); // Pad Thai, PLAN.md section 9
assert.equal(median([2, 4]), 3);
assert.equal(median([]), null);

// Food search: every database becomes the same per-100 g shape
const banana = fromUsda({
  fdcId: 1, dataType: 'Survey (FNDDS)', description: 'Banana, raw',
  foodNutrients: [
    { nutrientId: 1008, value: 97 }, { nutrientId: 1003, value: 0.74 }, { nutrientId: 1005, value: 22.71 }, { nutrientId: 1004, value: 0.28 },
    { nutrientId: 2000, value: 15.8 }, { nutrientId: 1079, value: 1.7 }, { nutrientId: 1093, value: 400 }, // sodium in mg
  ],
  foodMeasures: [{ disseminationText: 'Quantity not specified', gramWeight: 126 }, { disseminationText: '1 cup, mashed', gramWeight: 225 }, { disseminationText: '1 banana', gramWeight: 126 }],
});
assert.deepEqual([banana.kcal100, banana.protein100, banana.carbs100, banana.fat100], [97, 0.7, 22.7, 0.3]);
assert.deepEqual(banana.servings, [{ label: '1 banana', grams: 126 }, { label: '1 cup, mashed', grams: 225 }]); // servings named after the food first
const branded = fromUsda({
  fdcId: 2, description: 'PEANUT BUTTER', brandOwner: 'ACME FOODS', gtinUpc: '016459200441',
  servingSize: 32, servingSizeUnit: 'g', householdServingFullText: '2 Tbsp',
  foodNutrients: [{ nutrientId: 1008, value: 588 }],
});
assert.equal(branded.name, 'Peanut Butter');
assert.equal(branded.brand, 'Acme Foods');
assert.deepEqual(branded.servings, [{ label: '2 Tbsp', grams: 32 }]);
assert.equal(fromUsda({ fdcId: 3, description: 'Mystery', foodNutrients: [] }), null); // no energy value
assert.equal(fromUsda({ fdcId: 4, description: 'Bad', foodNutrients: [{ nutrientId: 1008, value: 2000 }] }), null); // > 900 kcal/100 g
const nutella = fromOff({ code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero, Nutella', serving_quantity: 15, serving_size: '15 g', nutriments: { energy_100g: 2252, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, 'saturated-fat_100g': 10.6, sugars_100g: 56.3, salt_100g: 0.107 } });
assert.deepEqual([nutella.satFat100, nutella.sugars100, nutella.fiber100, nutella.salt100], [10.6, 56.3, undefined, 0.1]); // fibre not given: unknown, not 0
assert.deepEqual([banana.sugars100, banana.fiber100, banana.satFat100, banana.salt100], [15.8, 1.7, undefined, 1]); // 400 mg sodium = 1 g salt
assert.equal(fromOff({ product_name: 'Odd', nutriments: { 'energy-kcal_100g': 50, salt_100g: 250 } }).salt100, undefined); // impossible value dropped, food kept
assert.equal(fromOff({ product_name: 'Soup', nutriments: { 'energy-kcal_100g': 40, sodium_100g: 0.4 } }).salt100, 1); // sodium only: x 2.5
assert.equal(nutella.kcal100, 538.2); // only kJ given: 2252 / 4.184
assert.equal(nutella.brand, 'Ferrero');
assert.deepEqual(nutella.servings, [{ label: '15 g', grams: 15 }]);
assert.equal(fromOff({ product_name: '', nutriments: { 'energy-kcal_100g': 100 } }), null); // no name
assert.equal(tidyName('HONEY NUT CHEERIOS'), 'Honey Nut Cheerios');
assert.equal(tidyName('Banana, raw'), 'Banana, raw');
assert.deepEqual(barcodeVariants('016459200441'), ['016459200441', '0016459200441']); // UPC-A <-> EAN-13
assert.deepEqual(barcodeVariants('0016459200441'), ['0016459200441', '016459200441']);
assert.deepEqual(barcodeVariants('3017620422003'), ['3017620422003']);
const ranked = rankResults('banana', [
  { ...branded, name: 'Banana Chips', key: 'a' },
  { ...nutella, name: 'Banana spread', key: 'b' },
  { ...banana, name: 'Bananas, dehydrated, or banana powder', key: 'c' },
  { ...banana, key: 'd' },
  { ...banana, key: 'e' }, // duplicate name: dropped
]);
assert.deepEqual(ranked.map((f) => f.key), ['d', 'c', 'b', 'a']); // plain foods, then OFF brands, then USDA brands

// Products typed in from the label by NutriScan users
const typedIn = fromCommunity({ barcode: '6001234567890', name: 'Gato piment (Snack Co)', kcal_100g: 320, protein_100g: 14, carbs_100g: 30, fat_100g: 16, serving_g: 25 });
assert.equal(typedIn.source, 'NutriScan users');
assert.equal(typedIn.barcode, '6001234567890');
assert.deepEqual(typedIn.servings, [{ label: '1 serving', grams: 25 }]);
assert.equal(fromCommunity({ barcode: '1234567', name: 'Bad', kcal_100g: 1200 }), null); // impossible kcal: dropped
assert.deepEqual(rankResults('gato', [{ ...branded, name: 'Gato', key: 'usda' }, typedIn]).map((f) => f.key), [typedIn.key, 'usda']); // with OFF, above USDA brands

// Mauritian names
assert.equal(localName('Hyderabadi biryani'), 'Briani');
assert.equal(localName('Pizza'), 'Pizza');
assert.deepEqual(searchTerm('  Mine Frite '), { term: 'chow mein', alias: 'chow mein' });
assert.deepEqual(searchTerm('banana'), { term: 'banana' });

assert.equal(isMauritianDish('Briani'), true);
assert.equal(isMauritianDish('Biryani with chicken'), true); // logged via a "briani" search
assert.equal(isMauritianDish('Sandals'), false); // whole words only ("dal")

// Points, streaks and badges
const row = (eaten_on, meal, kcal, source, name = 'Food') => ({ eaten_on, meal, kcal, source, name });
const diary = [
  row('2026-10-03', 'breakfast', 500, 'barcode'),
  row('2026-10-03', 'lunch', 700, 'search'),
  row('2026-10-03', 'dinner', 600, 'photo'), // 1800 kcal: on target -> 10 + 10 + 10
  row('2026-10-04', 'lunch', 400, 'manual', 'Briani'), // 1 meal, under the floor -> 0
  row('2026-10-06', 'breakfast', 300, 'barcode'),
  row('2026-10-06', 'snack', 200, 'barcode'),
  row('2026-10-06', 'lunch', 1000, 'photo'),
  row('2026-10-06', 'dinner', 100, 'barcode'), // 4 meals, 4 scans capped at 3, 1600 kcal -> 10 + 15 + 0
];
const prog = computeProgress(diary, { target: 2000, floor: 1500, today: '2026-10-06' });
assert.equal(prog.points, 55);
assert.equal(prog.level, 1);
assert.equal(prog.levelProgress, 0.55);
assert.equal(prog.streak, 1); // 5 Oct missing breaks the run
assert.equal(prog.longestStreak, 2); // 3-4 Oct
const badge = (id) => prog.badges.find((b) => b.id === id);
assert.equal(badge('first-log').unlocked, true);
assert.equal(badge('first-scan').unlocked, true);
assert.equal(badge('streak-3').progress, '2/3');
assert.equal(badge('snap-5').progress, '2/5');
assert.equal(badge('mauritian-5').progress, '1/5');
assert.equal(computeProgress(diary.slice(0, 4), { target: 2000, floor: 1500, today: '2026-10-05' }).streak, 2); // today not logged yet: streak still alive
assert.equal(onTarget(1000, 1100, 1200), false); // within 10% of target but below the safe floor: no reward
assert.equal(computeProgress([], { target: 2000, floor: 1500, today: '2026-10-06' }).badges.some((b) => b.unlocked), false);

// Past days, editing and recent foods
assert.equal(addDays('2026-10-31', 1), '2026-11-01');
assert.equal(addDays('2026-03-01', -1), '2026-02-28');
assert.equal(per100g(122, 126), 96.8); // banana entry -> per 100 g ...
assert.equal(kcalFor(per100g(122, 126), 126), 122); // ... and back to the same kcal when saved unchanged
const rows = [{ name: 'Apple, raw' }, { name: 'Banana' }, { name: 'apple, raw ' }, { name: 'Tea' }];
assert.deepEqual(recentFoods(rows, 2).map((r) => r.name), ['Apple, raw', 'Banana']); // newest of each name, capped

// Nutrition label scanning: [text, x, y] lines as ML Kit returns them (each line 30 px tall)
const ocr = (rows) => rows.map(([text, x, y]) => ({ text, x, y, w: 150, h: 30 }));
// EU table: names and each column come back as separate lines; use the per-100 g column.
const eu = parseLabel(ocr([
  ['Nutrition information', 40, 40], ['Typical values', 40, 100], ['Per 100g', 400, 100], ['Per serving (30g)', 600, 100],
  ['Energy', 40, 150], ['1046 kJ / 250 kcal', 400, 152], ['314 kJ / 75 kcal', 600, 149],
  ['Fat', 40, 200], ['9.5 g', 400, 201], ['2.9 g', 600, 199],
  ['of which saturates', 40, 250], ['4.1 g', 400, 250], ['1.2 g', 600, 250],
  ['Carbohydrate', 40, 300], ['30 g', 400, 300], ['9 g', 600, 300],
  ['of which sugars', 40, 350], ['12 g', 400, 350], ['3.6 g', 600, 350],
  ['Fibre', 40, 380], ['3,1 g', 400, 381], ['0,9 g', 600, 380],
  ['Protein', 40, 420], ['9,8 g', 400, 422], ['2,9 g', 600, 421],
  ['Salt', 40, 460], ['0.9 g', 400, 460], ['0.27 g', 600, 461],
]));
assert.deepEqual(eu, { kcal100: 250, fat100: 9.5, satFat100: 4.1, carbs100: 30, sugars100: 12, fiber100: 3.1, protein100: 9.8, salt100: 0.9, servingG: 30 });
assert.equal(labelComplete(eu), true); // 4 x 9.8 + 4 x 30 + 9 x 9.5 = 245, close to 250
// US label: values per serving, converted with the serving size; % daily values and the footnote ignored.
const us = parseLabel(ocr([
  ['Nutrition Facts', 40, 40], ['Serving size 2/3 cup (55g)', 40, 100], ['Calories', 40, 160], ['230', 500, 158],
  ['Total Fat 8g', 40, 220], ['10%', 600, 220], ['Saturated Fat 1g', 60, 260], ['5%', 600, 260],
  ['Sodium 160mg', 40, 280], ['7%', 600, 280],
  ['Total Carbohydrate 37g', 40, 300], ['13%', 600, 300], ['Total Sugars 12g', 60, 320], ['Includes 10g Added Sugars', 80, 330],
  ['Protein 3g', 40, 340],
  ['2,000 calories a day is used for general nutrition advice.', 40, 400],
]));
// Sodium 160 mg per 55 g serving = 0.4 g salt = 0.7 g per 100 g; "Added Sugars" is part of total sugars, not read.
assert.deepEqual(us, { kcal100: 418.2, fat100: 14.5, satFat100: 1.8, carbs100: 67.3, sugars100: 21.8, protein100: 5.5, salt100: 0.7, servingG: 55 });
assert.equal(labelComplete(us), true);
// French label, energy given as kJ then kcal on separate rows.
const fr = parseLabel(ocr([
  ['Valeurs nutritionnelles moyennes', 40, 40], ['pour 100 g', 500, 40],
  ['Énergie (kJ)', 40, 100], ['1046', 500, 100], ['Énergie (kcal)', 40, 140], ['250', 500, 141],
  ['Matières grasses', 40, 180], ['9,5 g', 500, 180], ['dont acides gras saturés', 40, 220], ['4,1 g', 500, 220],
  ['Glucides', 40, 260], ['30 g', 500, 260], ['dont sucres', 40, 300], ['12 g', 500, 300], ['Protéines', 40, 340], ['9,8 g', 500, 340],
]));
assert.equal(Math.round(fr.kcal100), 250); // 1046 kJ / 4.184, from the first energy row
assert.deepEqual([fr.fat100, fr.carbs100, fr.protein100, fr.satFat100, fr.sugars100], [9.5, 30, 9.8, 4.1, 12]);

// Macro targets: 45 / 20 / 35 % of the calorie target
assert.deepEqual(macroTargets(1850), { carbs: 208, protein: 93, fat: 72 });
assert.deepEqual(macroShares({ carbs: 150, protein: 48, fat: 42 }), { carbs: 51, protein: 16, fat: 32 }); // 600 + 192 + 378 kcal
assert.deepEqual(macroShares({ carbs: 0, protein: 0, fat: 0 }), { carbs: 0, protein: 0, fat: 0 });
const cropped = parseLabel(ocr([['Per serving (30g)', 600, 100], ['Energy', 40, 150], ['1046 kJ / 250 kcal', 400, 152]]));
assert.equal(cropped.kcal100, 250); // EU photo without the "per 100 g" header: not scaled as if per serving
assert.equal(labelComplete({ kcal100: 250, fat100: 95, carbs100: 30, protein100: 9.8 }), false); // misread 9.5 -> 95: keep scanning
assert.equal(labelComplete({ kcal100: 250, fat100: 9.5, carbs100: 30 }), false); // protein not read yet

// Weight chart and steps
const pts = chartPoints([80, 79, 78], 200, 100, 10);
assert.deepEqual(pts, [{ x: 10, y: 10 }, { x: 100, y: 50 }, { x: 190, y: 90 }]); // heaviest at the top, lightest at the bottom
assert.deepEqual(chartPoints([75], 200, 100), [{ x: 100, y: 50 }]); // one weighing: a dot in the middle
assert.deepEqual(chartPoints([75, 75], 200, 100, 0).map((p) => p.y), [50, 50]); // no change: a flat line, not a division by 0
assert.equal(stepKcal(10000, 80), 400); // 0.5 kcal per kg per 1,000 steps
{
  // Phone step sensor: first reading starts the day, later ones add up, a restart keeps the count.
  let c = nextDayCount(null, 5000, 1);
  assert.deepEqual(c, { base: 5000, last: 5000, since: 1 });
  c = nextDayCount(c, 5600, 2);
  assert.equal(c.last - c.base, 600);
  c = nextDayCount(c, 200, 3); // phone restarted: counter back near 0
  assert.equal(c.last - c.base, 800);
  assert.equal(c.since, 1);
}

// Consent gate: only the current policy version counts
assert.equal(hasConsented(consentRecord()), true);
assert.equal(hasConsented({ consent: { version: '2020-01-01' } }), false); // policy changed since: ask again
assert.equal(hasConsented({}), false); // account made before consent was asked for
assert.equal(hasConsented(undefined), false);

console.log('calorie, recognition, food search, progress, label and consent checks passed');
