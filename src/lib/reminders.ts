import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, RepeatFrequency, TriggerType } from 'react-native-notify-kit';
import { nextReminderAt } from './calories';
import { t } from './i18n';

export const REMINDERS = [
  { hour: 8, minute: 30, body: 'Log your breakfast' },
  { hour: 13, minute: 0, body: 'Log your lunch' },
  { hour: 19, minute: 30, body: 'Log your dinner' },
];

/** Asks for permission (Android 13+), then schedules the daily meal reminders. Returns false if refused. */
export async function enableReminders(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  const channelId = await notifee.createChannel({
    id: 'reminders',
    name: 'Meal reminders',
    importance: AndroidImportance.DEFAULT,
  });

  await notifee.cancelTriggerNotifications();
  for (const r of REMINDERS) {
    await notifee.createTriggerNotification(
      { title: 'NutriScan', body: t(r.body), android: { channelId, pressAction: { id: 'default' } } },
      // Inexact alarm: may arrive a few minutes late, but needs no exact-alarm permission.
      { type: TriggerType.TIMESTAMP, timestamp: nextReminderAt(r.hour, r.minute), repeatFrequency: RepeatFrequency.DAILY },
    );
  }
  return true;
}

export const disableReminders = () => notifee.cancelTriggerNotifications();

export const remindersEnabled = async () => (await notifee.getTriggerNotificationIds()).length > 0;
