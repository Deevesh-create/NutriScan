// Every English text the app shows must have a French and a Kreol Morisien version, with the same
// {placeholders}. Run: npm run check (after the calorie checks).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FR, MFE } from '../src/lib/translations.ts';
import { computeProgress } from '../src/lib/progress.ts';
import { EXTRAS } from '../src/lib/foods.ts';
import { MEALS, mealLabel } from '../src/lib/calories.ts';
import { FAQ } from '../src/lib/faq.ts';

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const source = ['App.tsx', ...files('src').filter((f) => /\.tsx?$/.test(f) && !f.endsWith('translations.ts') && !f.endsWith('legal.ts'))]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const keys = new Set();
const collect = (re, group = 1) => {
  for (const m of source.matchAll(re)) keys.add(m[group].replace(/\\'/g, "'"));
};
collect(/\bt\(\s*'((?:[^'\\]|\\.)+)'/g); // t('…')
collect(/\bt\(\s*"([^"]+)"/g); // t("…")
collect(/\bt\(\s*\w+ \? '([^']+)' : '([^']+)'/g); // t(x ? 'a' : 'b'), first
collect(/\bt\(\s*\w+ \? '([^']+)' : '([^']+)'/g, 2); // … and second
collect(/\b(?:title|label|placeholder|text|why|hint)="([^"]+)"/g); // translated inside Button, Field, Notice…
collect(/<ScanTip>([^<]+)<\/ScanTip>/g);
collect(/const NO_CAMERA = "([^"]+)"/g);
collect(/\{ label: '([^']+)', value:/g); // chip options
collect(/name: '([A-Z][^']+)', (?:sub|screen)/g); // label-panel rows, scanner tabs
collect(/\{ key: '\w+', name: '([^']+)' \}/g);
collect(/body: '([^']+)'/g); // reminders
collect(/(?:min|regex|email|literal)\([^)]*?'([A-Z][^']+)'\)/g); // zod messages
collect(/message: '([^']+)'/g);
collect(/(?:barcode|photo|search|pending): '([^']+)'/g); // diary source labels
collect(/'(?:USDA|Open Food Facts|Mauritian foods|NutriScan users)': '([^']+)'/g);
for (const b of computeProgress([], { target: 2000, floor: 1500, today: '2026-01-01' }).badges) keys.add(b.title).add(b.description);
for (const x of EXTRAS) keys.add(x.name);
for (const [q, a] of FAQ) keys.add(q).add(a);
for (const m of MEALS) keys.add(mealLabel(m));
for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) keys.add(d);

// Texts that are the same in every language, or not words.
const SAME = new Set(['100 g', 'NutriScan', '–']);
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

for (const [name, dict] of [['French', FR], ['Kreol', MFE]]) {
  const missing = [...keys].filter((k) => !SAME.has(k) && !(k in dict));
  assert.deepEqual(missing, [], `${name} is missing: ${missing.join(' | ')}`);
  for (const [k, v] of Object.entries(dict)) assert.equal(holes(v), holes(k), `${name} "${k}" has different {placeholders}`);
}
assert.deepEqual(Object.keys(FR).sort(), Object.keys(MFE).sort(), 'French and Kreol have different keys');
console.log(`translation checks passed (${keys.size} texts, French and Kreol Morisien)`);
