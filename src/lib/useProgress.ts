import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from './supabase';
import { localDate, safeFloor } from './calories';
import { type Progress, computeProgress } from './progress';

/** Points, streak and badges from the whole diary, reloaded whenever the screen comes into view. */
export function useProgress() {
  const { goals } = useAuth();
  const [progress, setProgress] = useState<Progress>();

  const reload = useCallback(async () => {
    if (!goals) return;
    // ponytail: reads every diary row (Supabase returns up to 1,000); move to a SQL view once diaries get long.
    const { data, error } = await supabase.from('food_entries').select('eaten_on, kcal, meal, source, barcode, name');
    if (error) return; // the screen shows its own "could not load" message for the diary
    // Foods saved before the `source` column existed got 'manual'; a barcode means it was scanned.
    const rows = data.map((r) => ({ ...r, source: r.barcode ? 'barcode' : r.source }));
    setProgress(computeProgress(rows, { target: goals.daily_kcal, floor: safeFloor(goals.sex), today: localDate() }));
  }, [goals]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { progress, reload };
}
