import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { chartPoints, localDate, maintenanceKcal, targetKcal } from '../lib/calories';
import { haptic } from '../lib/haptics';
import { dateLocale, num, t } from '../lib/i18n';
import { cacheKey, isOffline, loadCached, saveCached } from '../lib/offline';
import { supabase } from '../lib/supabase';
import { fieldErrors, weightSchema } from '../lib/validation';
import { colors, fonts, ui } from '../lib/theme';
import { Button } from './Button';
import { Field } from './Field';

type Weighing = { logged_on: string; weight_kg: number };
const CHART_H = 120;

/** "1 Oct" for a YYYY-MM-DD date. */
const short = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
};

/**
 * Weight over time (one weighing a day, the last 90). Logging a weight also updates the goal's
 * weight, so the daily calorie target follows the user as they lose weight.
 */
export function WeightCard() {
  const { goals, session, refreshGoals } = useAuth();
  const userId = session?.user.id ?? '';
  const [weights, setWeights] = useState<Weighing[]>([]);
  const [logging, setLogging] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const key = cacheKey(userId, 'weights');

  const load = useCallback(async () => {
    const copy = await loadCached<Weighing[]>(key); // at once; the server may be slow offline
    if (copy) setWeights(copy);
    const res = await supabase.from('weight_log').select('logged_on, weight_kg').order('logged_on', { ascending: false }).limit(90).retry(false);
    if (isOffline(res)) return;
    if (res.error) return; // table not created yet: the card shows the goal's weight only
    const oldestFirst = [...res.data].reverse();
    setWeights(oldestFirst);
    saveCached(key, oldestFirst);
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    const parsed = weightSchema.safeParse({ weightKg: text });
    if (!parsed.success) {
      haptic('error');
      return setError(fieldErrors(parsed.error).weightKg);
    }
    const kg = parsed.data.weightKg;
    setError(undefined);
    setBusy(true);
    const res = await supabase.from('weight_log').upsert({ logged_on: localDate(), weight_kg: kg }, { onConflict: 'user_id,logged_on' });
    if (res.error) {
      setBusy(false);
      haptic('error');
      return Alert.alert(
        t(isOffline(res) ? "You're offline" : 'Could not save'),
        t(isOffline(res) ? 'Connect to the internet to log your weight.' : res.error.message),
      );
    }
    // Keep the calorie target in step with the new weight.
    if (goals) {
      const body = { sex: goals.sex, age: goals.age, heightCm: goals.height_cm, weightKg: kg, activity: goals.activity, weeklyLossKg: goals.weekly_loss_kg };
      const daily = targetKcal(body);
      await supabase
        .from('nutrition_goals')
        .update({ weight_kg: kg, maintenance_kcal: maintenanceKcal(body), daily_kcal: daily, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      await refreshGoals();
      if (daily !== goals.daily_kcal) {
        Alert.alert(t('Daily target updated'), t('At {kg} kg your daily target is now {kcal} kcal.', { kg, kcal: daily }));
      }
    }
    setBusy(false);
    haptic('success');
    setLogging(false);
    setText('');
    load();
  };

  const latest = weights.at(-1)?.weight_kg ?? goals?.weight_kg;
  const change = weights.length > 1 ? Math.round((weights.at(-1)!.weight_kg - weights[0].weight_kg) * 10) / 10 : null;
  const points = width && weights.length ? chartPoints(weights.map((w) => w.weight_kg), width, CHART_H) : [];

  return (
    <View style={ui.card}>
      <Text style={ui.cardTitle}>{t('Weight')}</Text>
      <View style={ui.rule} />

      <View style={styles.headline}>
        <Text style={ui.title}>{latest != null ? `${num(latest)} kg` : '–'}</Text>
        {change != null ? (
          <Text style={[ui.body, styles.bold, { color: change <= 0 ? colors.basil : colors.tomato }]}>
            {change <= 0 ? '−' : '+'}
            {t('{kg} kg since {date}', { kg: Math.abs(change), date: short(weights[0].logged_on) })}
          </Text>
        ) : (
          <Text style={ui.caption}>
            {t(weights.length ? 'Log again to see your trend' : 'From your goal. Log your weight to start a chart')}
          </Text>
        )}
      </View>

      {weights.length ? (
        <View
          onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}
          accessible
          accessibilityLabel={t('Weight chart: {from} kg to {to} kg', { from: weights[0].weight_kg, to: latest ?? 0 })}
        >
          {points.length ? (
            <Svg width={width} height={CHART_H}>
              {points.length > 1 ? (
                <Polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.basil} strokeWidth={3} strokeLinejoin="round" />
              ) : null}
              {points.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 6 : 3.5} fill={colors.basil} />
              ))}
            </Svg>
          ) : (
            <View style={{ height: CHART_H }} />
          )}
          <View style={styles.axis}>
            <Text style={ui.caption}>{short(weights[0].logged_on)}</Text>
            {weights.length > 1 ? <Text style={ui.caption}>{short(weights.at(-1)!.logged_on)}</Text> : null}
          </View>
        </View>
      ) : null}

      {logging ? (
        <View style={styles.logRow}>
          <Field
            label="Today's weight (kg)"
            keyboardType="decimal-pad"
            value={text}
            onChangeText={setText}
            error={error}
            autoFocus
            containerStyle={ui.flex}
          />
          <Button title="Save" onPress={save} loading={busy} style={styles.saveButton} />
        </View>
      ) : (
        <Button title="Log weight" icon="trending-down-outline" variant="secondary" onPress={() => setLogging(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { gap: 2 },
  bold: { fontFamily: fonts.bold },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  logRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  saveButton: { minWidth: 96 },
});
