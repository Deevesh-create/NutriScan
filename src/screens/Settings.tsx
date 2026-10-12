import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { appLock, useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DeleteAccount } from '../components/DeleteAccount';
import { mealLabel } from '../lib/calories';
import { STEP_CHOICES, WATER_CHOICES, useDailyGoals } from '../lib/dailyGoals';
import { LANGUAGES, dateLocale, num, t } from '../lib/i18n';
import { REMINDERS, type Reminder, type ReminderMeal, type Reminders, loadReminders, pickTime, saveReminders } from '../lib/reminders';
import { useRootNav } from '../navigation';
import { Button } from '../components/Button';
import { Chips } from '../components/Chips';
import { colors, radius, ui } from '../lib/theme';

export default function Settings() {
  const navigation = useRootNav();
  const { session, goals, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const [reminders, setReminders] = useState<Reminders>();
  const [lock, setLock] = useState(false);
  const [daily, setDaily] = useDailyGoals();

  useEffect(() => {
    loadReminders().then(setReminders);
    appLock.isOn().then(setLock);
  }, []);

  const changeReminder = async (meal: ReminderMeal, change: Partial<Reminder>) => {
    if (!reminders) return;
    const next = { ...reminders, [meal]: { ...reminders[meal], ...change } };
    if (await saveReminders(next)) return setReminders(next);
    Alert.alert(t('Notifications are blocked'), t('Allow notifications for NutriScan in your phone settings to get meal reminders.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Open settings'), onPress: () => Linking.openSettings() },
    ]);
  };

  const toggleLock = async (on: boolean) => {
    if (!on) {
      await appLock.turnOff();
      return setLock(false);
    }
    if (!(await appLock.biometry())) {
      return Alert.alert(t('No fingerprint set up'), t('Add a fingerprint in your phone settings first.'));
    }
    // Saving the lock and a test unlock both need a fingerprint; the lock stays off unless both pass.
    try {
      await appLock.turnOn();
    } catch {
      return;
    }
    if (await appLock.check(t('Confirm your fingerprint'))) return setLock(true);
    await appLock.turnOff();
  };

  const agreedAt = session?.user.user_metadata?.consent?.at;

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.title} accessibilityRole="header">
        {t('Settings')}
      </Text>

      <View style={[ui.card, styles.tight]}>
        <Text style={ui.caption}>{t('Signed in as')}</Text>
        <Text style={ui.body}>{session?.user.email}</Text>
      </View>

      <View style={ui.card}>
        <View style={styles.tight}>
          <Text style={ui.label}>{t('Daily target')}</Text>
          <Text style={ui.title}>{goals ? num(goals.daily_kcal) : ''} kcal</Text>
          <Text style={ui.caption}>
            {t('You burn about {kcal} kcal a day', { kcal: goals?.maintenance_kcal ?? '' })}
            {' · '}
            {goals?.weekly_loss_kg ? t('losing {kg} kg a week', { kg: goals.weekly_loss_kg }) : t('maintaining')}
          </Text>
        </View>
        <Button title="Edit goal" icon="create-outline" variant="secondary" onPress={() => navigation.navigate('Goals')} />
      </View>

      <View style={ui.card}>
        <Text style={ui.heading}>{t('Step and water goals')}</Text>
        <Text style={ui.label}>{t('Steps a day')}</Text>
        <Chips options={STEP_CHOICES.map((n) => ({ label: num(n), value: n }))} value={daily.steps} onChange={(steps) => setDaily({ ...daily, steps })} />
        <Text style={ui.label}>{t('Glasses of water a day (250 ml each)')}</Text>
        <Chips options={WATER_CHOICES.map((n) => ({ label: num(n), value: n }))} value={daily.water} onChange={(water) => setDaily({ ...daily, water })} />
      </View>

      <View style={[ui.card, styles.list]}>
        <View style={styles.listHead}>
          <Text style={ui.heading}>{t('Meal reminders')}</Text>
          <Text style={ui.caption}>{t('Every day. Tap a time to change it.')}</Text>
        </View>
        {REMINDERS.map(({ meal }) =>
          reminders ? (
            <View key={meal}>
              <View style={styles.divider} />
              <ReminderRow meal={meal} value={reminders[meal]} onChange={(change) => changeReminder(meal, change)} />
            </View>
          ) : null,
        )}
      </View>

      <View style={[ui.card, styles.list]}>
        <SwitchRow
          label={t('Fingerprint lock')}
          hint={t('Ask for your fingerprint when you open the app')}
          value={lock}
          onChange={toggleLock}
        />
      </View>

      <View style={ui.card}>
        <Text style={ui.heading}>{t('Language')}</Text>
        <Chips options={LANGUAGES} value={lang} onChange={setLang} />
        {lang === 'mfe' ? <Text style={ui.caption}>{t('Kreol Morisien is a first draft. Tell us if a word is wrong.')}</Text> : null}
      </View>

      <View style={[ui.card, styles.list]}>
        <LinkRow label={t('Help and FAQ')} onPress={() => navigation.navigate('Faq')} />
        <View style={styles.divider} />
        <LinkRow label={t('Privacy Policy')} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} />
        <View style={styles.divider} />
        <LinkRow label={t('Terms of Use')} onPress={() => navigation.navigate('Legal', { doc: 'terms' })} />
        {agreedAt ? (
          <Text style={[ui.caption, styles.agreed]}>
            {t('You agreed, and consented to your health data being stored, on {date}.', {
              date: new Date(agreedAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }),
            })}
          </Text>
        ) : null}
      </View>

      <Button title="Sign out" icon="log-out-outline" variant="danger" onPress={signOut} />
      <DeleteAccount label="Delete my account and data" />
    </ScrollView>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={[ui.row, styles.switchRow]}>
      <Text style={[ui.body, ui.flex]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

function ReminderRow({ meal, value, onChange }: { meal: ReminderMeal; value: Reminder; onChange: (change: Partial<Reminder>) => void }) {
  const name = t(mealLabel(meal));
  const time = new Date(2000, 0, 1, value.hour, value.minute).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
  const change = async () => {
    const picked = await pickTime(value.hour, value.minute);
    if (picked) onChange(picked);
  };
  return (
    <View style={[ui.row, styles.switchRow]}>
      <Text style={[ui.body, ui.flex]}>{name}</Text>
      <Pressable
        onPress={change}
        accessibilityRole="button"
        accessibilityLabel={t('{meal} reminder time: {time}. Tap to change it.', { meal: name, time })}
        style={[styles.time, !value.on && styles.timeOff]}
      >
        <Ionicons name="time-outline" size={18} color={colors.basil} />
        <Text style={[ui.body, styles.timeText]}>{time}</Text>
      </Pressable>
      <Switch
        value={value.on}
        onValueChange={(on) => onChange({ on })}
        trackColor={{ true: colors.basil, false: colors.line }}
        thumbColor={colors.white}
        accessibilityLabel={t('{meal} reminder', { meal: name })}
      />
    </View>
  );
}

function SwitchRow(props: { label: string; hint: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={[ui.row, styles.switchRow]}>
      <View style={ui.flex}>
        <Text style={ui.body}>{props.label}</Text>
        <Text style={ui.caption}>{props.hint}</Text>
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: colors.basil, false: colors.line }}
        thumbColor={colors.white}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tight: { gap: 2 },
  list: { paddingVertical: 4, gap: 0 },
  switchRow: { paddingVertical: 12, minHeight: 56 },
  listHead: { gap: 2, paddingTop: 12, paddingBottom: 8 },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.basilSoft,
  },
  timeOff: { opacity: 0.6 },
  timeText: { color: colors.basil, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.line },
  agreed: { paddingBottom: 12 },
});
