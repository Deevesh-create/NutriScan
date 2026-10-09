import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { type CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MEALS, SALT_MAX_G, addDays, localDate, macroShares, macroTargets, mealLabel } from '../lib/calories';
import { EXTRAS } from '../lib/foods';
import { cacheKey, isOffline, loadCached, pendingFor, saveCached, syncPending } from '../lib/offline';
import { useProgress } from '../lib/useProgress';
import { dateLocale, num, t } from '../lib/i18n';
import type { DiaryEntry, RootStackParamList, TabParamList } from '../navigation';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ProgressRing } from '../components/ProgressRing';
import { WaterCard } from '../components/WaterCard';
import { StepsCard } from '../components/StepsCard';
import { colors, fonts, radius, ui } from '../lib/theme';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Today'>, NativeStackScreenProps<RootStackParamList>>;

const COLUMNS = 'id, meal, name, grams, kcal, barcode, source, protein_g, carbs_g, fat_g, sat_fat_g, sugars_g, fiber_g, salt_g';

// How each food was added, shown under its name. A barcode always means scanned: foods saved before
// the `source` column existed were given 'manual'. 'pending' = added offline, not sent yet.
const SOURCE_LABEL: Record<string, string> = {
  barcode: 'scanned',
  photo: '📷 photo',
  search: 'search',
  pending: '⏳ waiting to sync',
};
const sourceLabel = (e: DiaryEntry) => {
  const label = SOURCE_LABEL[e.barcode && e.source !== 'pending' ? 'barcode' : (e.source ?? '')];
  return label ? ` · ${t(label)}` : '';
};

/** "Tue 6 Oct" for a YYYY-MM-DD date. */
const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
};

const sum = (entries: DiaryEntry[], key: keyof DiaryEntry) => entries.reduce((s, e) => s + (Number(e[key]) || 0), 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Asks before deleting a diary entry; used here (long-press) and on the Edit food screen. */
export const confirmRemove = (e: DiaryEntry, onRemoved: () => void) =>
  Alert.alert(t('Remove food?'), `${e.name} (${e.kcal} kcal)`, [
    { text: t('Cancel'), style: 'cancel' },
    {
      text: t('Remove'),
      style: 'destructive',
      onPress: async () => {
        const res = await supabase.from('food_entries').delete().eq('id', e.id);
        if (isOffline(res)) Alert.alert(t("You're offline"), t('Connect to the internet to remove a food.'));
        else if (res.error) Alert.alert(t('Could not remove'), t(res.error.message));
        else onRemoved();
      },
    },
  ]);

/** The diary for one day: today, or an earlier day picked with the arrows or from History. */
export default function Today({ navigation, route }: Props) {
  const { goals, session } = useAuth();
  const { progress, reload: reloadProgress } = useProgress();
  const { width } = useWindowDimensions();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const userId = session?.user.id ?? '';

  const todayIso = localDate();
  const day = route.params?.day ?? todayIso;
  const isToday = day === todayIso;
  const title = isToday ? t('Today') : day === addDays(todayIso, -1) ? t('Yesterday') : dateLabel(day);
  // Passed on to the add-food screens so the food lands on the day being shown. Today stays "live" across midnight.
  const dayParam = isToday ? undefined : day;
  const goTo = (iso: string) => navigation.setParams({ day: iso === todayIso ? undefined : iso });

  // Show the copy on this phone at once (offline, the server can take 30 s to fail). Then, online: send
  // foods added offline, load the day and keep a copy. Offline: keep the copy, plus foods waiting to be sent.
  const load = useCallback(async () => {
    const key = cacheKey(userId, `diary-${day}`);
    const copy = await loadCached<DiaryEntry[]>(key);
    if (copy) setEntries([...copy, ...(await pendingFor(userId, day))]);
    await syncPending(userId);
    const res = await supabase.from('food_entries').select(COLUMNS).eq('eaten_on', day).order('created_at').retry(false);
    const waiting = await pendingFor(userId, day);
    setOffline(isOffline(res));
    if (isOffline(res)) return setEntries([...((await loadCached<DiaryEntry[]>(key)) ?? []), ...waiting]);
    if (res.error) return Alert.alert(t('Could not load your diary'), t(res.error.message));
    saveCached(key, res.data);
    setEntries([...res.data, ...waiting]);
  }, [day, userId]);

  // Reload whenever the tab comes back into view (e.g. after adding a food) or the day changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), reloadProgress()]);
    setRefreshing(false);
  };

  const remove = (e: DiaryEntry) =>
    confirmRemove(e, () => {
      load();
      reloadProgress();
    });

  // "Badge unlocked!" for badges earned since the last time this phone saw the list.
  useEffect(() => {
    if (!progress || !session) return;
    const key = `badges-seen-${session.user.id}`;
    const unlocked = progress.badges.filter((b) => b.unlocked);
    AsyncStorage.getItem(key)
      .then((saved) => {
        const seen: string[] | null = saved ? JSON.parse(saved) : null;
        // First run on this phone: remember what's already earned without a pop-up for each.
        const fresh = seen ? unlocked.filter((b) => !seen.includes(b.id)) : [];
        if (fresh.length) Alert.alert(t('Badge unlocked!'), fresh.map((b) => `${t(b.title)}: ${t(b.description)}`).join('\n'));
        return AsyncStorage.setItem(key, JSON.stringify(unlocked.map((b) => b.id)));
      })
      .catch(() => {});
  }, [progress, session]);

  const goal = goals?.daily_kcal ?? 0;
  const eaten = sum(entries, 'kcal');
  const left = goal - eaten;
  const over = left < 0;

  const grams = { carbs: Math.round(sum(entries, 'carbs_g')), protein: Math.round(sum(entries, 'protein_g')), fat: Math.round(sum(entries, 'fat_g')) };
  const targets = macroTargets(goal);
  const shares = macroShares(grams);
  const macros = [
    { key: 'carbs', name: t('Carbs'), color: colors.carbs },
    { key: 'protein', name: t('Protein'), color: colors.protein },
    { key: 'fat', name: t('Fat'), color: colors.fat },
  ] as const;

  // "Sat. fat 11 g · Sugars 41 g · …": only the ones at least one food gave.
  const extras = EXTRAS.filter((x) => entries.some((e) => e[x.column] != null)).map((x) => {
    const g = round1(sum(entries, x.column));
    return x.column === 'salt_g' ? t('Salt {g} of {max} g', { g, max: SALT_MAX_G }) : `${t(x.name)} ${num(g)} g`;
  });

  // Narrow phones get a smaller ring so the totals beside it still fit.
  const narrow = width < 380;
  const ringSize = narrow ? 124 : 150;

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.basil]} />}
    >
      <View style={styles.header}>
        <View style={ui.flex}>
          <Text style={ui.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.subtitle}>
            {title !== dateLabel(day) ? <Text style={ui.caption}>{dateLabel(day)}</Text> : null}
            {isToday ? null : (
              <Pressable onPress={() => goTo(todayIso)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>{t('Back to today')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <DayArrow icon="chevron-back" label={t('Previous day')} onPress={() => goTo(addDays(day, -1))} />
        <DayArrow icon="chevron-forward" label={t('Next day')} onPress={() => goTo(addDays(day, 1))} disabled={isToday} />
      </View>

      {offline ? (
        <Notice text="You're offline. This is the diary saved on this phone. Foods you add now are sent when you're back online." />
      ) : null}

      {progress ? (
        <View style={styles.chip} accessible>
          <Ionicons name={progress.streak ? 'flame' : 'flame-outline'} size={18} color={colors.basil} />
          <Text style={styles.chipText}>
            {progress.streak ? t('{n}-day streak', { n: progress.streak }) : t('No streak yet')} · {t('Level {n}', { n: progress.level })} ·{' '}
            {t('{n} pts', { n: progress.points })}
          </Text>
        </View>
      ) : null}

      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t('Calories')}</Text>
        <View style={ui.rule} />

        <View style={styles.ringRow}>
          <View style={styles.side}>
            <Total label={t('Goal')} value={goal} narrow={narrow} />
            <Total label={t('Food')} value={eaten} narrow={narrow} />
            <Total
              label={t(over ? 'Over' : isToday ? 'Left' : 'Under')}
              value={Math.abs(left)}
              color={over ? colors.tomato : colors.basil}
              narrow={narrow}
            />
          </View>
          <ProgressRing
            size={ringSize}
            stroke={13}
            progress={goal ? eaten / goal : 0}
            color={over ? colors.tomato : colors.basil}
            trackColor={over ? colors.tomatoSoft : colors.basilSoft}
          >
            <Text
              style={[styles.ringNumber, narrow && styles.ringNumberNarrow, over && { color: colors.tomato }, { maxWidth: ringSize - 34 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {num(Math.abs(left))}
            </Text>
            <Text style={styles.ringLabel}>{t(over ? 'kcal over' : isToday ? 'kcal left' : 'kcal under')}</Text>
          </ProgressRing>
          <View style={[styles.side, styles.sideRight]}>
            {MEALS.map((meal) => (
              <Total key={meal} label={t(mealLabel(meal))} value={sum(entries.filter((e) => e.meal === meal), 'kcal')} narrow={narrow} right />
            ))}
          </View>
        </View>

        <View style={styles.macros}>
          {macros.map((m) => {
            const target = targets[m.key];
            const got = grams[m.key];
            const rest = target - got;
            return (
              <View
                key={m.key}
                style={styles.macro}
                accessible
                accessibilityLabel={`${m.name}: ${got} / ${target} g, ${shares[m.key]}%`}
              >
                {/* One fact per line, so the three columns line up at any text size. */}
                <Text style={[styles.macroName, { color: m.color }]} numberOfLines={1}>
                  {m.name}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, target ? (got / target) * 100 : 0)}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={styles.macroGrams}>{got} g</Text>
                <Text style={[styles.small, rest < 0 && { color: colors.tomato }]} numberOfLines={1}>
                  {rest >= 0 ? t('{g} g left', { g: rest }) : t('{g} g over', { g: -rest })}
                </Text>
                <Text style={styles.small} numberOfLines={1}>
                  {t('{pct}% of kcal', { pct: shares[m.key] })}
                </Text>
              </View>
            );
          })}
        </View>
        {extras.length ? <Text style={ui.caption}>{extras.join(' · ')}</Text> : null}
      </View>

      <WaterCard day={day} userId={userId} />
      <StepsCard day={day} isToday={isToday} />

      <View style={styles.actions}>
        <Button title="Scan food" icon="scan-outline" onPress={() => navigation.navigate('Scan', { day: dayParam })} />
        <Button title="Search food" icon="search-outline" variant="secondary" onPress={() => navigation.navigate('AddFood', { day: dayParam })} />
      </View>

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal);
        return (
          <View key={meal} style={[ui.card, styles.meal]}>
            <View style={[ui.row, styles.mealHead]}>
              <Text style={[ui.heading, ui.flex]}>{t(mealLabel(meal))}</Text>
              <Text style={ui.caption}>{sum(items, 'kcal')} kcal</Text>
              <Pressable
                onPress={() => navigation.navigate('AddFood', { meal, day: dayParam })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('Add food to {meal}', { meal: t(mealLabel(meal)) })}
                style={styles.add}
              >
                <Ionicons name="add" size={22} color={colors.onAccent} />
              </Pressable>
            </View>
            {items.length === 0 ? <Text style={[ui.caption, styles.empty]}>{t('Nothing logged yet')}</Text> : null}
            {items.map((e) => (
              <Pressable
                key={e.id}
                disabled={e.source === 'pending'}
                onPress={() => navigation.navigate('AddFood', { entry: e })}
                onLongPress={() => remove(e)}
                accessibilityRole="button"
                accessibilityHint={t('Tap to change, long-press to remove')}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.bg }]}
              >
                <View style={ui.flex}>
                  <Text style={ui.body} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={ui.caption}>
                    {e.grams} g{sourceLabel(e)}
                  </Text>
                </View>
                <Text style={[ui.body, styles.num]}>{e.kcal} kcal</Text>
              </Pressable>
            ))}
          </View>
        );
      })}

      <Text style={[ui.caption, styles.hint]}>{t('Tap a food to change it. Long-press to remove it.')}</Text>
    </ScrollView>
  );
}

function DayArrow(props: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      style={[styles.arrow, props.disabled && styles.arrowOff]}
    >
      <Ionicons name={props.icon} size={22} color={colors.basil} />
    </Pressable>
  );
}

/** One figure beside the ring: "1,850" over "Goal". */
function Total(props: { label: string; value: number; color?: string; narrow: boolean; right?: boolean }) {
  return (
    <View style={props.right && styles.sideRight} accessible accessibilityLabel={`${props.label}: ${props.value} kcal`}>
      <Text style={[styles.total, props.narrow && styles.totalNarrow, props.color ? { color: props.color } : null]}>
        {num(props.value)}
      </Text>
      <Text style={styles.small}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subtitle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 20 },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.basil },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.basilSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { opacity: 0.35 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.basilSoft,
    marginTop: -6,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.basil, flexShrink: 1 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  side: { gap: 8, flexShrink: 1, minWidth: 0 },
  sideRight: { alignItems: 'flex-end' },
  total: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
  totalNarrow: { fontSize: 16, lineHeight: 20 },
  ringNumber: { fontFamily: fonts.extraBold, fontSize: 36, lineHeight: 40, letterSpacing: -0.7, color: colors.ink, fontVariant: ['tabular-nums'] },
  ringNumberNarrow: { fontSize: 30, lineHeight: 34 },
  ringLabel: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  macros: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  macro: { flex: 1, gap: 4, minWidth: 0 },
  macroName: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  macroGrams: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
  meal: { gap: 0 },
  add: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHead: { paddingBottom: 8 },
  empty: { paddingBottom: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  num: { fontVariant: ['tabular-nums'] },
  hint: { textAlign: 'center' },
});
