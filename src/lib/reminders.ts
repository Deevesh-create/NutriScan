import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, RepeatFrequency, TriggerType } from 'react-native-notify-kit';
import { nextReminderAt } from './calories';
import { t } from './i18n';
import { loadCached, saveCached } from './offline';

/** The meals with a reminder, and their default times. Each can be moved or switched off in Settings. */
export const REMINDERS = [
  { meal: 'breakfast', hour: 8, minute: 30, body: 'Log your breakfast' },
  { meal: 'lunch', hour: 13, minute: 0, body: 'Log your lunch' },
  { meal: 'dinner', hour: 19, minute: 30, body: 'Log your dinner' },
] as const;

export type ReminderMeal = (typeof REMINDERS)[number]['meal'];
export type Reminder = { on: boolean; hour: number; minute: number };
export type Reminders = Record<ReminderMeal, Reminder>;

const KEY = 'reminders';
const DEFAULTS = Object.fromEntries(REMINDERS.map((r) => [r.meal, { on: false, hour: r.hour, minute: r.minute }])) as Reminders;

/** The saved reminders. Version 1.0 saved none and had one switch for all three, at the default times. */
export async function loadReminders(): Promise<Reminders> {
  const saved = await loadCached<Reminders>(KEY);
  if (saved) return { ...DEFAULTS, ...saved };
  const allOn = (await notifee.getTriggerNotificationIds()).length > 0;
  return Object.fromEntries(REMINDERS.map((r) => [r.meal, { ...DEFAULTS[r.meal], on: allOn }])) as Reminders;
}

/**
 * Saves the reminders and schedules the ones that are on. Asks for the notification permission
 * first (Android 13+); returns false, changing nothing, if it is refused.
 */
export async function saveReminders(r: Reminders): Promise<boolean> {
  if (REMINDERS.some((d) => r[d.meal].on) && Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  await schedule(r);
  await saveCached(KEY, r);
  return true;
}

/**
 * Sets the saved reminders again, in the current language. Called at start and when the language
 * changes, so the reminder text follows it (and 1.0's reminders get their per-meal ids).
 */
export async function restoreReminders() {
  const r = await loadReminders();
  if (!REMINDERS.some((d) => r[d.meal].on)) return;
  await schedule(r);
  await saveCached(KEY, r);
}

async function schedule(r: Reminders) {
  const channelId = await notifee.createChannel({ id: 'reminders', name: 'Meal reminders', importance: AndroidImportance.DEFAULT });
  await notifee.cancelTriggerNotifications();
  for (const d of REMINDERS.filter((x) => r[x.meal].on)) {
    const { hour, minute } = r[d.meal];
    await notifee.createTriggerNotification(
      { id: `reminder-${d.meal}`, title: 'NutriScan', body: t(d.body), android: { channelId, pressAction: { id: 'default' } } },
      // Exact alarm: notify-kit declares SCHEDULE_EXACT_ALARM, which Android 13 grants at install.
      // Where it isn't granted (Android 14+ by default), Android delivers it a few minutes late instead.
      { type: TriggerType.TIMESTAMP, timestamp: nextReminderAt(hour, minute), repeatFrequency: RepeatFrequency.DAILY },
    );
  }
}

export const disableReminders = () => notifee.cancelTriggerNotifications();

/** Android's own clock picker (android/app/.../TimePickerModule.kt). Null when cancelled. */
export const pickTime = (hour: number, minute: number): Promise<{ hour: number; minute: number } | null> =>
  NativeModules.TimePicker.pick(hour, minute);
