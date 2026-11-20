import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';
import { type DayCount, nextDayCount } from './calories';

/**
 * Step counts from Health Connect, Android's shared health store. Samsung Health (and Google Fit,
 * Fitbit…) share their steps there; NutriScan only reads them, with the user's permission.
 */
export type Steps =
  | { state: 'unsupported' } // not Android
  | { state: 'no-app' } // Health Connect missing or needs an update (Android 13 and older install it from Play)
  | { state: 'not-connected' } // the user hasn't allowed NutriScan to read steps
  | { state: 'ok'; steps: number };

const READ_STEPS = { accessType: 'read', recordType: 'Steps' } as const;
let initialized = false;

async function ready(): Promise<boolean> {
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  initialized ||= await initialize();
  return initialized;
}

/** Total steps on one local day (YYYY-MM-DD), midnight to midnight. */
export async function readSteps(day: string): Promise<Steps> {
  if (Platform.OS !== 'android') return { state: 'unsupported' };
  try {
    if (!(await ready())) return { state: 'no-app' };
    const granted = await getGrantedPermissions();
    if (!granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read')) return { state: 'not-connected' };
    const [y, m, d] = day.split('-').map(Number);
    const { COUNT_TOTAL } = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(y, m - 1, d).toISOString(),
        endTime: new Date(y, m - 1, d + 1).toISOString(),
      },
    });
    return { state: 'ok', steps: COUNT_TOTAL };
  } catch (e) {
    console.warn('Steps:', e instanceof Error ? e.message : e);
    return { state: 'no-app' };
  }
}

/** Shows Health Connect's own permission screen for reading steps. True when allowed. */
export async function connectSteps(): Promise<boolean> {
  if (!(await ready())) return false;
  const granted = await requestPermission([READ_STEPS]);
  return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
}

export { openHealthConnectSettings };

/* The phone's own step sensor (native module StepCounterModule.kt). It works without any other app,
   which matters because Samsung Health doesn't always share its steps with Health Connect. */
const RECOGNITION = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
export const phoneStepsAllowed = async () => Platform.OS === 'android' && PermissionsAndroid.check(RECOGNITION);
export const allowPhoneSteps = async () => (await PermissionsAndroid.request(RECOGNITION)) === PermissionsAndroid.RESULTS.GRANTED;

/**
 * One day's steps from the phone's sensor, counted from the first time NutriScan reads it that day
 * (the sensor itself only counts from when the phone was switched on). Kept on the phone only.
 * Past days show their last reading; null when there is nothing to show.
 * Limitation: steps before the day's first reading are missed; a midnight alarm could take that reading.
 */
export async function phoneSteps(day: string, isToday: boolean): Promise<{ steps: number; since: number } | null> {
  const key = `steps-${day}`;
  let count: DayCount | null = null;
  try {
    count = JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
  } catch {}
  if (isToday && (await phoneStepsAllowed())) {
    const now: number | null = await NativeModules.StepCounter?.read();
    if (now != null) {
      count = nextDayCount(count, now, Date.now());
      AsyncStorage.setItem(key, JSON.stringify(count)).catch(() => {});
    }
  }
  return count && { steps: Math.round(count.last - count.base), since: count.since };
}
