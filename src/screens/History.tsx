import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { lastDays, localDate, weekSummary, weekdayShort } from '../lib/calories';
import { cacheKey, isOffline, loadCached, saveCached } from '../lib/offline';
import { POINTS_PER_LEVEL, type Progress } from '../lib/progress';
import { useProgress } from '../lib/useProgress';
import type { TabParamList } from '../navigation';
import { WeightCard } from '../components/WeightCard';
import { num, t } from '../lib/i18n';
import { colors, fonts, radius, ui } from '../lib/theme';

const CHART_H = 140;
const LABEL_H = 18;
const GAP = 4;

export default function History({ navigation }: BottomTabScreenProps<TabParamList, 'History'>) {
  const { goals, session } = useAuth();
  const userId = session?.user.id ?? '';
  const { progress } = useProgress();
  const [days, setDays] = useState<string[]>([]);
  const [totals, setTotals] = useState<number[]>([]);

  const load = useCallback(async () => {
    const week = lastDays(7);
    const key = cacheKey(userId, 'week');
    const draw = (data: { eaten_on: string; kcal: number }[]) => {
      setDays(week);
      setTotals(week.map((day) => data.filter((e) => e.eaten_on === day).reduce((sum, e) => sum + e.kcal, 0)));
    };
    // The last week loaded online, shown at once; offline it stays (days it doesn't cover show as empty).
    const copy = await loadCached<{ eaten_on: string; kcal: number }[]>(key);
    if (copy) draw(copy);
    const res = await supabase.from('food_entries').select('eaten_on, kcal').gte('eaten_on', week[0]).retry(false);
    if (isOffline(res)) return copy ? undefined : draw([]);
    if (res.error) return Alert.alert(t('Could not load history'), t(res.error.message));
    saveCached(key, res.data);
    draw(res.data);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goal = goals?.daily_kcal ?? 0;
  const maintenance = goals?.maintenance_kcal ?? 0;
  // Finished days only: today is still going, so its few kcal would look like a huge deficit.
  const s = weekSummary(totals.slice(0, -1), maintenance);
  const max = Math.max(goal, ...totals, 1);
  const todayIso = localDate();

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.title} accessibilityRole="header">
        {t('History')}
      </Text>

      <WeightCard />

      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t('Last 7 days')}</Text>
        <View style={ui.rule} />
        <View style={styles.chart}>
          <View style={[styles.goalLine, { bottom: LABEL_H + GAP + (goal / max) * CHART_H }]} />
          {days.map((day, i) => (
            <Pressable
              key={day}
              onPress={() => navigation.navigate('Today', { day: day === todayIso ? undefined : day })}
              style={({ pressed }) => [styles.col, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={`${t(weekdayShort(day))}: ${totals[i] ? `${totals[i]} kcal` : t('nothing logged')}`}
              accessibilityHint={t("Opens this day's diary")}
            >
              <Text style={styles.value}>{totals[i] || '–'}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: totals[i] ? (totals[i] / max) * CHART_H : 2,
                    backgroundColor: !totals[i] ? colors.line : totals[i] > goal ? colors.tomato : colors.basil,
                  },
                ]}
              />
              <Text style={[styles.day, day === todayIso && styles.today]}>{t(weekdayShort(day))}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={ui.caption}>{t('Dashed line = your {kcal} kcal target. Red = over target. Tap a day to open it.', { kcal: goal })}</Text>
      </View>

      <View style={[ui.card, styles.table]}>
        <Text style={[ui.heading, styles.tableTitle]}>{t('Your deficit this week')}</Text>
        {s.daysLogged === 0 ? (
          <Text style={ui.caption}>{t("No finished days logged yet. Today's food counts here once the day is over.")}</Text>
        ) : (
          <>
            <Row label="Days logged" value={t('{n} of {total}', { n: s.daysLogged, total: 6 })} />
            <Row label="Average eaten" value={t('{kcal} kcal/day', { kcal: s.avgEaten })} />
            <Row label="You burn about" value={t('{kcal} kcal/day', { kcal: maintenance })} />
            <Row
              label={s.deficit >= 0 ? 'Total deficit' : 'Total surplus'}
              value={`${num(Math.abs(s.deficit))} kcal`}
            />
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[ui.body, styles.bold]}>{t(s.deficit >= 0 ? 'Estimated fat lost' : 'Estimated fat gained')}</Text>
              <Text style={[ui.title, { color: s.deficit >= 0 ? colors.basil : colors.tomato }]}>
                {num(Math.round(Math.abs(s.fatKg) * 100) / 100)} kg
              </Text>
            </View>
          </>
        )}
        <Text style={[ui.caption, styles.foot]}>
          {t('Only the last 6 finished days with food logged count; today is added tomorrow. 7,700 kcal is about 1 kg of fat.')}
        </Text>
      </View>

      {progress ? <ProgressCard progress={progress} /> : null}
    </ScrollView>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function ProgressCard({ progress }: { progress: Progress }) {
  const toNext = POINTS_PER_LEVEL - (progress.points % POINTS_PER_LEVEL);
  return (
    <View style={ui.card}>
      <Text style={ui.cardTitle}>{t('Progress')}</Text>
      <View style={ui.rule} />
      <View style={styles.levelRow}>
        <View style={styles.level}>
          <Text style={ui.label}>{t('Level')}</Text>
          <Text style={[ui.display, { color: colors.basil }]}>{progress.level}</Text>
        </View>
        <View style={[ui.flex, styles.levelInfo]}>
          <Text style={ui.stat}>{t('{n} points', { n: progress.points })}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress.levelProgress * 100)}%` }]} />
          </View>
          <Text style={ui.caption}>
            {t('{n} points to level {level}', { n: toNext, level: progress.level + 1 })}
          </Text>
        </View>
      </View>

      <View style={styles.streaks}>
        <Streak label={t('Current streak')} days={progress.streak} />
        <Streak label={t('Best streak')} days={progress.longestStreak} />
      </View>

      <View style={styles.badges}>
        {progress.badges.map((b) => (
          <View
            key={b.id}
            style={[styles.badge, b.unlocked && styles.badgeOn]}
            accessible
            accessibilityLabel={`${t(b.title)}, ${b.unlocked ? t('Earned') : b.progress}. ${t(b.description)}`}
          >
            <View style={[styles.badgeIcon, b.unlocked && styles.badgeIconOn]}>
              <Ionicons name={(b.unlocked ? b.icon : 'lock-closed-outline') as IconName} size={22} color={b.unlocked ? colors.onAccent : colors.muted} />
            </View>
            <Text style={[ui.body, styles.bold]} numberOfLines={2}>
              {t(b.title)}
            </Text>
            <Text style={ui.caption} numberOfLines={2}>
              {t(b.description)}
            </Text>
            <Text style={[ui.caption, b.unlocked && styles.earned]}>{b.unlocked ? t('Earned') : b.progress}</Text>
          </View>
        ))}
      </View>

      <Text style={ui.caption}>
        {t('+10 for logging 2 or more meals in a day · +5 per barcode or photo log (up to 3 a day) · +10 for a day within 10% of your target. Eating below your safe minimum never earns points.')}
      </Text>
    </View>
  );
}

function Streak({ label, days }: { label: string; days: number }) {
  return (
    <View style={[ui.row, ui.flex]}>
      <Ionicons name={days ? 'flame' : 'flame-outline'} size={22} color={colors.basil} />
      <View>
        <Text style={[ui.stat]}>{t(days === 1 ? '{n} day' : '{n} days', { n: days })}</Text>
        <Text style={ui.caption}>{label}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[ui.body, ui.flex]}>{t(label)}</Text>
      <Text style={[ui.body, styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: CHART_H + LABEL_H * 2 + GAP * 2 },
  col: { flex: 1, alignItems: 'center', gap: GAP },
  bar: { alignSelf: 'stretch', borderRadius: 6 },
  value: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, height: LABEL_H, lineHeight: LABEL_H },
  day: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, height: LABEL_H, lineHeight: LABEL_H },
  today: { fontFamily: fonts.bold, color: colors.ink },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.muted,
  },
  table: { gap: 0 },
  tableTitle: { paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  totalRow: { borderTopWidth: 6, borderTopColor: colors.ink, justifyContent: 'space-between' },
  bold: { fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  foot: { paddingTop: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  level: { alignItems: 'center', minWidth: 64 },
  levelInfo: { gap: 6 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.basilSoft, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.basil },
  streaks: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  badgeOn: { borderColor: colors.basil, backgroundColor: colors.basilSoft },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.line,
  },
  badgeIconOn: { backgroundColor: colors.basil },
  earned: { fontFamily: fonts.bold, color: colors.basil },
});
