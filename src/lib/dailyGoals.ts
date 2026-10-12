import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { STEP_GOAL, WATER_GOAL } from './calories';
import { loadCached, saveCached } from './offline';

/** Daily step and water goals (glasses of 250 ml), chosen in Settings and kept on this phone. */
export type DailyGoals = { steps: number; water: number };

export const STEP_CHOICES = [5000, 7500, 10000, 12500, 15000];
export const WATER_CHOICES = [6, 8, 10, 12];

const KEY = 'daily-goals';

/** The goals, read again each time the screen comes into view, and a function that saves new ones. */
export function useDailyGoals() {
  const [goals, setGoals] = useState<DailyGoals>({ steps: STEP_GOAL, water: WATER_GOAL });
  useFocusEffect(
    useCallback(() => {
      loadCached<DailyGoals>(KEY).then((saved) => saved && setGoals((old) => ({ ...old, ...saved })));
    }, []),
  );
  const save = (next: DailyGoals) => {
    setGoals(next);
    saveCached(KEY, next);
  };
  return [goals, save] as const;
}
