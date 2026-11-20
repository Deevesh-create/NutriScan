// Turns the text ML Kit reads from a photo of a nutrition table into kcal and macros per 100 g.
// No imports, so scripts/check-calories.mjs can test it in plain Node.

/** One line of text found in the photo, with its box in pixels (from LabelReaderModule.kt). */
export interface OcrLine {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What could be read; a field is missing when the label didn't show it clearly. */
export interface LabelValues {
  kcal100?: number;
  protein100?: number;
  carbs100?: number;
  fat100?: number;
  satFat100?: number;
  sugars100?: number;
  fiber100?: number;
  salt100?: number;
  servingG?: number;
}

// Row names in English and French (packs sold in Mauritius use both).
const NAMES = {
  kcal: /[eé]nerg|calorie/i,
  fat: /\bfat\b|lipid|grasses|graisses/i,
  carbs: /carbohydrate|\bcarbs?\b|glucide/i,
  protein: /prot[eé]in/i,
};
// "of which saturates", "dont sucres", "Calories from fat"… are parts of a row above, not the total.
const SUB_ROW = /saturat|satur[eé]|trans|of which|dont|sugar|sucre|fib(re|er)|polyol|starch|amidon|from fat/i;
// The optional rows. Salt can also be given as sodium (US labels, in mg): salt = sodium x 2.5.
const EXTRA = {
  satFat: /saturat|satur[eé]/i,
  sugars: /sugar|sucre/i,
  fiber: /fib(re|er)/i,
  salt: /\bsalt\b|\bsel\b/i,
  sodium: /sodium/i,
};
const NOT_EXTRA = /added|ajout|mono|poly|trans/i; // "Includes added sugars", "monounsaturates"
const NUMBER = /(\d+(?:[.,]\d+)?)(?![\d.,]|\s*%)/g; // "9,5" or "9.5", but not "10%" (US daily values)

const toNum = (s: string) => Number(s.replace(',', '.'));
const round1 = (n: number) => Math.round(n * 10) / 10;
/** The words before the first number: "Energy (kcal)", "Total Fat". */
const rowName = (text: string) => text.split(/\d/)[0];
const middle = (l: OcrLine) => l.y + l.h / 2;

/** A row name's line plus every line to its right on the same row: ML Kit often returns table columns separately. */
function rowText(name: OcrLine, lines: OcrLine[]): string {
  return lines
    .filter((l) => l === name || (l.x > name.x && Math.abs(middle(l) - middle(name)) < name.h * 0.6))
    .sort((a, b) => a.x - b.x)
    .map((l) => l.text)
    .join(' ');
}

/** kcal from an energy row: "1046 kJ / 250 kcal", "Energy (kcal) 250", "Energy kJ/kcal 1046/250", "Calories 230". */
function kcalIn(text: string): number | undefined {
  const name = rowName(text).toLowerCase();
  const nums = [...text.matchAll(NUMBER)].map((m) => toNum(m[1]));
  if (name.includes('kcal')) return name.includes('kj') ? nums[1] : nums[0];
  const kcal = text.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
  if (kcal) return toNum(kcal[1]);
  const kj = text.match(/(\d+(?:[.,]\d+)?)\s*kj/i);
  if (kj) return toNum(kj[1]) / 4.184;
  if (nums[0] == null) return undefined;
  return name.includes('kj') ? nums[0] / 4.184 : nums[0];
}

/** Grams from a nutrient row: the first number, which is the per-100 g column on EU labels. */
const gramsIn = (text: string) => {
  const first = text.slice(rowName(text).length).match(NUMBER)?.[0];
  return first == null ? undefined : toNum(first);
};

/**
 * Reads kcal, fat, carbs and protein per 100 g from a nutrition table. EU and Mauritian labels give
 * per 100 g (first column); US labels give per serving, converted with the serving size in grams.
 * Limitation: row matching by position and keywords, not a layout model; covers the common table layouts.
 */
export function parseLabel(lines: OcrLine[]): LabelValues {
  const all = lines.map((l) => l.text).join(' ');
  const serving = all.match(/(?:serving size|per serving|portion)[\s\S]{0,40}?(\d+(?:[.,]\d+)?)\s*(?:g|ml)\b/i);
  const servingG = serving ? toNum(serving[1]) : undefined;
  // Only US-style labels list values per serving. An EU photo that cut off "per 100 g" must not be scaled.
  const perServing = /nutrition facts|serving size/i.test(all) && !/100\s*(?:g|ml)\b/i.test(all);
  const scale = perServing && servingG ? 100 / servingG : 1;

  const topDown = [...lines].sort((a, b) => a.y - b.y);
  const find = (name: RegExp, read: (row: string) => number | undefined, skip = SUB_ROW, max = 100) => {
    for (const line of topDown) {
      const label = rowName(line.text);
      if (!name.test(label) || skip.test(label)) continue;
      const value = read(rowText(line, lines));
      if (value != null && value * scale <= max) return round1(value * scale);
    }
    return undefined;
  };

  const values: LabelValues = {
    kcal100: find(NAMES.kcal, kcalIn, SUB_ROW, 900),
    fat100: find(NAMES.fat, gramsIn),
    satFat100: find(EXTRA.satFat, gramsIn, NOT_EXTRA),
    carbs100: find(NAMES.carbs, gramsIn),
    sugars100: find(EXTRA.sugars, gramsIn, NOT_EXTRA),
    fiber100: find(EXTRA.fiber, gramsIn, NOT_EXTRA),
    protein100: find(NAMES.protein, gramsIn),
    salt100: find(EXTRA.salt, gramsIn, NOT_EXTRA) ?? find(EXTRA.sodium, saltFromSodium, NOT_EXTRA),
    servingG,
  };
  // Only what was actually read, so values from several photos can be merged.
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v != null));
}

/** Salt in grams from a sodium row: "Sodium 160mg" (US) or "Sodium 0.4 g". */
const saltFromSodium = (row: string) => {
  const sodium = gramsIn(row);
  if (sodium == null) return undefined;
  return (/\d\s*mg/i.test(row) ? sodium / 1000 : sodium) * 2.5;
};

/**
 * All four values were read and they agree: kcal is close to 4 per gram of protein and carbs plus
 * 9 per gram of fat. That check catches a misread digit, so the scanner keeps looking instead.
 */
export function labelComplete(v: LabelValues): boolean {
  const { kcal100: kcal, protein100: p, carbs100: c, fat100: f } = v;
  if (kcal == null || p == null || c == null || f == null) return false;
  return Math.abs(4 * p + 4 * c + 9 * f - kcal) <= Math.max(40, kcal * 0.25);
}
