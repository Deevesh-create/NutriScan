// Pure calorie maths and date helpers. No imports, so scripts/check-calories.mjs can run it in plain Node.

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

export const KCAL_PER_KG = 7700; // energy in 1 kg of body fat

export interface Body {
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activity: number; // 1.2 desk job ... 1.725 very active
  weeklyLossKg: number;
}

/** Calories burned per day: Mifflin-St Jeor BMR x activity factor. */
export function maintenanceKcal(b: Body): number {
  const bmr = 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (b.sex === 'male' ? 5 : -161);
  return Math.round(bmr * b.activity);
}

/** The least anyone should eat a day without medical supervision. */
export const safeFloor = (sex: Body['sex']) => (sex === 'male' ? 1500 : 1200);

/** Daily target = maintenance minus the deficit for the chosen weekly loss, never below a safe floor. */
export function targetKcal(b: Body): number {
  const deficit = (b.weeklyLossKg * KCAL_PER_KG) / 7;
  return Math.max(safeFloor(b.sex), Math.round(maintenanceKcal(b) - deficit));
}

/** A YYYY-MM-DD date moved by n calendar days (negative = earlier). */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

export const prevDay = (isoDate: string) => addDays(isoDate, -1);

/** Labels give nutrients per 100 g; scale to the amount eaten. */
export const kcalFor = (per100g: number, grams: number) => Math.round((per100g * grams) / 100);
export const gramsFor = (per100g: number, grams: number) => Math.round((per100g * grams) / 10) / 10;
/** The other way round, for editing a diary entry: 122 kcal in 126 g = 96.8 kcal per 100 g. */
export const per100g = (amount: number, grams: number) => Math.round((amount * 1000) / grams) / 10;

/**
 * Daily grams of carbs, protein and fat for a calorie target: 45% / 20% / 35% of the kcal
 * (inside the usual adult ranges), at 4, 4 and 9 kcal per gram.
 * ponytail: one fixed split; add a macro-goal editor if users ask for other diets.
 */
export const macroTargets = (kcal: number) => ({
  carbs: Math.round((kcal * 0.45) / 4),
  protein: Math.round((kcal * 0.2) / 4),
  fat: Math.round((kcal * 0.35) / 9),
});

/** Share of the eaten kcal that came from each macro (0-100), or 0s before anything is logged. */
export function macroShares(g: { carbs: number; protein: number; fat: number }) {
  const kcal = { carbs: g.carbs * 4, protein: g.protein * 4, fat: g.fat * 9 };
  const total = kcal.carbs + kcal.protein + kcal.fat;
  const pct = (k: number) => (total ? Math.round((k / total) * 100) : 0);
  return { carbs: pct(kcal.carbs), protein: pct(kcal.protein), fat: pct(kcal.fat) };
}

/**
 * Points for a line chart of `values` in a `w` x `h` box (SVG coordinates: y grows downwards),
 * leaving `pad` px inside the edges. The lowest value sits at the bottom, the highest at the top;
 * a flat line (one value, or all equal) sits in the middle.
 */
export function chartPoints(values: number[], w: number, h: number, pad = 8) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const stepX = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: Math.round((values.length > 1 ? pad + i * stepX : w / 2) * 10) / 10,
    y: Math.round((span ? h - pad - ((v - min) / span) * (h - 2 * pad) : h / 2) * 10) / 10,
  }));
}

/** Steps: kcal burned walking, about 0.5 kcal per kg of body weight per 1,000 steps (an estimate). */
export const STEP_GOAL = 10000;
export const stepKcal = (steps: number, weightKg: number) => Math.round((steps / 1000) * 0.5 * weightKg);

/**
 * One day of the phone's step sensor (lib/steps.ts). The sensor counts from when the phone was
 * switched on, so the day's first reading is its starting point: today's steps = last - base.
 */
export type DayCount = { base: number; last: number; since: number };
export function nextDayCount(saved: DayCount | null, now: number, at: number): DayCount {
  if (!saved) return { base: now, last: now, since: at };
  // The phone restarted, so its counter began again at 0: keep the steps already counted today.
  const base = now < saved.last ? saved.base - saved.last : saved.base;
  return { base, last: now, since: saved.since };
}

/** Water: glasses of 250 ml, 8 a day (2 litres). Salt: at most 6 g a day (adult reference intake). */
export const WATER_GOAL = 8;
export const GLASS_ML = 250;
export const SALT_MAX_G = 6;

/**
 * Deficit = maintenance - eaten, summed over days that have food logged.
 * Days with nothing logged are unknown, not 0 kcal, so they are skipped.
 */
export function weekSummary(dailyTotals: number[], maintenance: number) {
  const logged = dailyTotals.filter((t) => t > 0);
  const eaten = logged.reduce((sum, t) => sum + t, 0);
  const deficit = logged.length * maintenance - eaten;
  return {
    daysLogged: logged.length,
    avgEaten: logged.length ? Math.round(eaten / logged.length) : 0,
    deficit,
    fatKg: deficit / KCAL_PER_KG,
  };
}

/** Guess the meal from the time of day so the common case needs no tap. */
export function mealForHour(hour: number): Meal {
  return hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snack';
}

export const mealLabel = (m: string) => m[0].toUpperCase() + m.slice(1);

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
export function localDate(d = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** The last n local dates, oldest first, ending today. */
export function lastDays(n: number, today = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - 1 - i));
    return localDate(d);
  });
}

/** Next time the clock shows hour:minute, as a timestamp: later today, or tomorrow if that time has passed. */
export function nextReminderAt(hour: number, minute: number, now = new Date()): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function weekdayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
}
