import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { stepKcal } from '../lib/calories';
import { useDailyGoals } from '../lib/dailyGoals';
import { haptic } from '../lib/haptics';
import { dateLocale, num, t } from '../lib/i18n';
import {
  type Steps,
  allowPhoneSteps,
  connectSteps,
  openHealthConnectSettings,
  phoneSteps,
  phoneStepsAllowed,
  readSteps,
} from '../lib/steps';
import { colors, radius, ui } from '../lib/theme';
import { Button } from './Button';

/**
 * One day's steps, with an estimate of kcal burned walking. The whole-day count in Health Connect
 * (from Samsung Health or another app) when there is one, otherwise the phone's own step sensor.
 */
export function StepsCard({ day, isToday }: { day: string; isToday: boolean }) {
  const { goals } = useAuth();
  const [{ steps: goal }] = useDailyGoals();
  const [hc, setHc] = useState<Steps>();
  const [phone, setPhone] = useState<{ steps: number; since: number } | null>(null);
  const [allowed, setAllowed] = useState(true);

  const load = useCallback(() => {
    readSteps(day).then(setHc);
    phoneSteps(day, isToday).then(setPhone);
    phoneStepsAllowed().then(setAllowed);
  }, [day, isToday]);

  useFocusEffect(load);

  const allow = async () => {
    if (await allowPhoneSteps()) {
      haptic('success');
      return load();
    }
    Alert.alert(t('Step counting not allowed'), t('Allow Physical activity for NutriScan in your phone settings to count your steps.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Open settings'), onPress: () => Linking.openSettings() },
    ]);
  };

  const connect = async () => {
    if (await connectSteps()) {
      haptic('success');
      return load();
    }
    Alert.alert(t('Steps not allowed'), t('NutriScan can only show your steps if Health Connect allows it.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Open Health Connect'), onPress: openHealthConnectSettings },
    ]);
  };

  if (!hc || hc.state === 'unsupported') return null;
  const fromHc = hc.state === 'ok' && hc.steps > 0;
  const steps = fromHc ? hc.steps : phone?.steps;
  const askSensor = steps == null && isToday && !allowed;
  if (steps == null && !askSensor) return null;

  return (
    <View style={ui.card}>
      <Text style={ui.heading} accessibilityRole="header">
        {t('Steps')}
      </Text>
      {steps != null ? (
        <>
          <View style={styles.figures} accessible accessibilityLabel={`${steps} / ${goal}`}>
            <Text style={ui.title}>{num(steps)}</Text>
            <Text style={ui.caption}>{t('of {n}', { n: goal })}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (steps / goal) * 100)}%` }]} />
          </View>
          <Text style={ui.caption}>
            {fromHc
              ? t('About {kcal} kcal burned walking, from Health Connect. Not added to your calorie target.', {
                  kcal: stepKcal(steps, goals?.weight_kg ?? 70),
                })
              : t('About {kcal} kcal burned walking, counted by this phone since {time}. Not added to your calorie target.', {
                  kcal: stepKcal(steps, goals?.weight_kg ?? 70),
                  time: new Date(phone!.since).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }),
                })}
          </Text>
        </>
      ) : (
        <>
          <Text style={ui.body}>{t("Count your steps with your phone's step sensor, and see about how many calories walking burned.")}</Text>
          <Button title="Count my steps" icon="walk-outline" variant="secondary" onPress={allow} />
        </>
      )}
      {isToday && hc.state === 'not-connected' ? (
        <Button title="Use Samsung Health steps" icon="fitness-outline" variant="secondary" onPress={connect} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  figures: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.basil },
});
