import { prevDay } from './calories';
import { isMauritianDish } from './mauritian';

// Points, streaks and badges, worked out from the food diary itself (no extra table to keep in sync).
// Rewards consistency and eating within a healthy range, never eating less: below the safe floor
// earns nothing, so the app can't encourage under-eating.

export interface DiaryRow {
  eaten_on: string; // YYYY-MM-DD
  kcal: number;
  meal: string;
  source: string | null; // 'barcode' | 'photo' | 'search' | 'manual' (null for rows from before it existed)
  name: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  unlocked: boolean;
  progress: string; // e.g. "3/5"
}

export interface Progress {
  points: number;
  level: number;
  levelProgress: number; // 0..1 towards the next level
  streak: number; // days in a row with food logged, up to today
  longestStreak: number;
  badges: Badge[];
}

export const POINTS_PER_LEVEL = 100;

interface Stats {
  totalLogs: number;
  longestStreak: number;
  barcodeLogs: number;
  photoLogs: number;
  mauritianLogs: number;
  daysOnTarget: number;
}

const BADGES: { id: string; title: string; description: string; icon: string; goal: number; value: (s: Stats) => number }[] = [
  { id: 'first-log', title: 'First bite', description: 'Log your first food', icon: 'restaurant-outline', goal: 1, value: (s) => s.totalLogs },
  { id: 'streak-3', title: 'On a roll', description: 'Log food 3 days in a row', icon: 'flame-outline', goal: 3, value: (s) => s.longestStreak },
  { id: 'streak-7', title: 'One week strong', description: 'Log food 7 days in a row', icon: 'flame', goal: 7, value: (s) => s.longestStreak },
  { id: 'first-scan', title: 'Scanner', description: 'Add a food by its barcode', icon: 'barcode-outline', goal: 1, value: (s) => s.barcodeLogs },
  { id: 'snap-5', title: 'Food photographer', description: 'Add 5 meals from photos', icon: 'camera-outline', goal: 5, value: (s) => s.photoLogs },
  { id: 'mauritian-5', title: 'Mauritian explorer', description: 'Log 5 Mauritian dishes', icon: 'earth-outline', goal: 5, value: (s) => s.mauritianLogs },
  { id: 'target-7', title: 'Week on target', description: 'Finish 7 days within 10% of your target', icon: 'trophy-outline', goal: 7, value: (s) => s.daysOnTarget },
];

/**
 * A day is "on target" when its total is within 10% of the daily target and never below the
 * safe floor (1,500 kcal men, 1,200 women).
 */
export const onTarget = (total: number, target: number, floor: number) =>
  total >= Math.max(floor, target * 0.9) && total <= target * 1.1;

/** Points for one day: +10 for 2+ meals logged, +5 per barcode or photo log (max 3), +10 on target. */
export function dayPoints(rows: DiaryRow[], target: number, floor: number): number {
  const meals = new Set(rows.map((r) => r.meal)).size;
  const scans = rows.filter((r) => r.source === 'barcode' || r.source === 'photo').length;
  const total = rows.reduce((sum, r) => sum + r.kcal, 0);
  return (meals >= 2 ? 10 : 0) + 5 * Math.min(scans, 3) + (onTarget(total, target, floor) ? 10 : 0);
}

export function computeProgress(rows: DiaryRow[], opts: { target: number; floor: number; today: string }): Progress {
  const byDay = new Map<string, DiaryRow[]>();
  for (const r of rows) byDay.set(r.eaten_on, [...(byDay.get(r.eaten_on) ?? []), r]);
  const days = [...byDay.keys()].sort();

  let points = 0;
  let daysOnTarget = 0;
  for (const day of days) {
    const dayRows = byDay.get(day)!;
    points += dayPoints(dayRows, opts.target, opts.floor);
    if (onTarget(dayRows.reduce((sum, r) => sum + r.kcal, 0), opts.target, opts.floor)) daysOnTarget++;
  }

  // Longest run of consecutive logged days.
  let longestStreak = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && prevDay(day) === days[i - 1] ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  });

  // The current streak stays alive until today ends, so count back from today, or from yesterday
  // if nothing has been logged yet today.
  let streak = 0;
  let day = byDay.has(opts.today) ? opts.today : prevDay(opts.today);
  while (byDay.has(day)) {
    streak++;
    day = prevDay(day);
  }

  const stats: Stats = {
    totalLogs: rows.length,
    longestStreak,
    barcodeLogs: rows.filter((r) => r.source === 'barcode').length,
    photoLogs: rows.filter((r) => r.source === 'photo').length,
    mauritianLogs: rows.filter((r) => isMauritianDish(r.name)).length,
    daysOnTarget,
  };

  return {
    points,
    level: 1 + Math.floor(points / POINTS_PER_LEVEL),
    levelProgress: (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL,
    streak,
    longestStreak,
    badges: BADGES.map((b) => {
      const value = b.value(stats);
      return {
        id: b.id,
        title: b.title,
        description: b.description,
        icon: b.icon,
        unlocked: value >= b.goal,
        progress: `${Math.min(value, b.goal)}/${b.goal}`,
      };
    }),
  };
}
