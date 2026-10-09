import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { appLock, useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DeleteAccount } from '../components/DeleteAccount';
import { LANGUAGES, dateLocale, num, t } from '../lib/i18n';
import { disableReminders, enableReminders, remindersEnabled } from '../lib/reminders';
import { useRootNav } from '../navigation';
import { Button } from '../components/Button';
import { Chips } from '../components/Chips';
import { colors, ui } from '../lib/theme';

export default function Settings() {
  const navigation = useRootNav();
  const { session, goals, signOut } = useAuth();
  const { lang, setLang } = useLanguage();
  const [reminders, setReminders] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    remindersEnabled().then(setReminders);
    appLock.isOn().then(setLock);
  }, []);

  const toggleReminders = async (on: boolean) => {
    if (!on) {
      await disableReminders();
      return setReminders(false);
    }
    if (await enableReminders()) return setReminders(true);
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

      <View style={[ui.card, styles.list]}>
        <SwitchRow label={t('Meal reminders')} hint={t('8:30, 13:00 and 19:30 every day')} value={reminders} onChange={toggleReminders} />
        <View style={styles.divider} />
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
  divider: { height: 1, backgroundColor: colors.line },
  agreed: { paddingBottom: 12 },
});
