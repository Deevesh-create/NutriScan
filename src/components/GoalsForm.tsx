import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { KCAL_PER_KG, maintenanceKcal, targetKcal } from '../lib/calories';
import { fieldErrors, goalsSchema } from '../lib/validation';
import { colors, ui } from '../lib/theme';
import { num, t } from '../lib/i18n';
import { Button } from './Button';
import { Chips } from './Chips';
import { Field } from './Field';

const SEX = [
  { label: 'Female', value: 'female' as const },
  { label: 'Male', value: 'male' as const },
];
const ACTIVITY = [
  { label: 'Desk job', value: 1.2 },
  { label: 'Light exercise', value: 1.375 },
  { label: 'Exercise 3-5x a week', value: 1.55 },
  { label: 'Very active', value: 1.725 },
];
const PACE = [
  { label: 'Maintain', value: 0 },
  { label: 'Lose 0.25 kg/week', value: 0.25 },
  { label: 'Lose 0.5 kg/week', value: 0.5 },
  { label: 'Lose 0.75 kg/week', value: 0.75 },
];

const str = (n?: number) => (n == null ? '' : String(n));

/** Body details -> maintenance calories -> daily target. Used for first-time setup and for editing. */
export function GoalsForm({ onSaved }: { onSaved?: () => void }) {
  const { session, goals, refreshGoals } = useAuth();
  const [sex, setSex] = useState<'male' | 'female'>(goals?.sex ?? 'female');
  const [activity, setActivity] = useState(goals?.activity ?? 1.375);
  const [pace, setPace] = useState(goals?.weekly_loss_kg ?? 0.5);
  const [text, setText] = useState({
    age: str(goals?.age),
    heightCm: str(goals?.height_cm),
    weightKg: str(goals?.weight_kg),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const parsed = goalsSchema.safeParse({ sex, activity, weeklyLossKg: pace, ...text });
  const preview = parsed.success
    ? { maintenance: maintenanceKcal(parsed.data), target: targetKcal(parsed.data) }
    : null;

  const save = async () => {
    if (!parsed.success || !preview || !session) return setErrors(parsed.error ? fieldErrors(parsed.error) : {});
    setErrors({});
    setBusy(true);
    const b = parsed.data;
    const { error } = await supabase.from('nutrition_goals').upsert({
      user_id: session.user.id,
      sex: b.sex,
      age: b.age,
      height_cm: b.heightCm,
      weight_kg: b.weightKg,
      activity: b.activity,
      weekly_loss_kg: b.weeklyLossKg,
      maintenance_kcal: preview.maintenance,
      daily_kcal: preview.target,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return Alert.alert(t('Could not save'), t(error.message));
    await refreshGoals();
    onSaved?.();
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior="padding">
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <View style={ui.card}>
          <Text style={ui.heading}>{t('About you')}</Text>
          <Chips options={SEX} value={sex} onChange={setSex} />
          <View style={styles.row}>
            <Field
              label="Age"
              keyboardType="number-pad"
              value={text.age}
              onChangeText={(age) => setText({ ...text, age })}
              error={errors.age}
              containerStyle={ui.flex}
            />
            <Field
              label="Height cm"
              keyboardType="decimal-pad"
              value={text.heightCm}
              onChangeText={(heightCm) => setText({ ...text, heightCm })}
              error={errors.heightCm}
              containerStyle={ui.flex}
            />
            <Field
              label="Weight kg"
              keyboardType="decimal-pad"
              value={text.weightKg}
              onChangeText={(weightKg) => setText({ ...text, weightKg })}
              error={errors.weightKg}
              containerStyle={ui.flex}
            />
          </View>
        </View>

        <View style={ui.card}>
          <Text style={ui.heading}>{t('How active are you?')}</Text>
          <Chips options={ACTIVITY} value={activity} onChange={setActivity} />
        </View>

        <View style={ui.card}>
          <Text style={ui.heading}>{t('Your goal')}</Text>
          <Chips options={PACE} value={pace} onChange={setPace} />
        </View>

        <View style={[ui.card, styles.result]}>
          <Text style={ui.cardTitle}>{t('Daily target')}</Text>
          <View style={ui.rule} />
          {preview ? (
            <>
              <View style={styles.targetRow}>
                <Text style={[ui.display, { color: colors.basil }]}>{num(preview.target)}</Text>
                <Text style={[ui.body, { color: colors.muted }]}>{t('kcal a day')}</Text>
              </View>
              <Text style={ui.caption}>
                {t('You burn about {kcal} kcal a day.', { kcal: preview.maintenance })}{' '}
                {pace > 0
                  ? t('Eating {kcal} kcal less loses about {kg} kg a week.', { kcal: Math.round((pace * KCAL_PER_KG) / 7), kg: pace })
                  : t('Eating this much keeps your weight steady.')}
              </Text>
            </>
          ) : (
            <Text style={ui.caption}>{t('Fill in your details to see your daily target.')}</Text>
          )}
        </View>

        <Button title="Save goal" icon="checkmark" onPress={save} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  result: { gap: 8 },
  targetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
