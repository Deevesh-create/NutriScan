import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { lookupBarcode, searchFoods, shareProduct } from '../lib/foodSearch';
import { isOffline, queueEntry } from '../lib/offline';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { EXTRAS, type FoodResult, recentFoods } from '../lib/foods';
import { MEALS, type Meal, gramsFor, kcalFor, localDate, mealForHour, mealLabel, per100g } from '../lib/calories';
import { fieldErrors, foodSchema } from '../lib/validation';
import type { DiaryEntry, RootStackParamList } from '../navigation';
import { confirmRemove } from './Today';
import { Button } from '../components/Button';
import { Chips } from '../components/Chips';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { colors, fonts, radius, ui } from '../lib/theme';

const MEAL_OPTIONS = MEALS.map((m) => ({ label: mealLabel(m), value: m }));
const SOURCE_NAMES = {
  USDA: 'USDA FoodData Central',
  'Open Food Facts': 'Open Food Facts',
  'Mauritian foods': 'NutriScan Mauritian foods',
  'NutriScan users': 'Added by a NutriScan user',
};

type Props = NativeStackScreenProps<RootStackParamList, 'AddFood'>;

/** "Nutella (Ferrero)", unless the brand is already in the name. */
const displayName = (f: FoodResult) =>
  (f.brand && !f.name.toLowerCase().includes(f.brand.toLowerCase()) ? `${f.name} (${f.brand})` : f.name).slice(0, 120);

/** A food already in the diary, as far as the form needs it. */
type Logged = Pick<
  DiaryEntry,
  'name' | 'grams' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'sat_fat_g' | 'sugars_g' | 'fiber_g' | 'salt_g'
>;
const LOGGED_COLUMNS = 'name, grams, kcal, protein_g, carbs_g, fat_g, sat_fat_g, sugars_g, fiber_g, salt_g';

const EMPTY = { name: '', kcal100: '', protein100: '', carbs100: '', fat100: '', satFat100: '', sugars100: '', fiber100: '', salt100: '', grams: '100' };
/** A form field's text for an optional number: empty when unknown. */
const text = (n: number | null | undefined) => (n == null ? '' : String(n));

/** Form values from a diary entry: its totals turned back into per-100 g values. */
const formFrom = (e: Logged): typeof EMPTY => {
  const per100 = (v: number | null) => String(per100g(v ?? 0, e.grams));
  const optional = (v: number | null) => (v == null ? '' : per100(v));
  return {
    name: e.name,
    kcal100: per100(e.kcal),
    protein100: per100(e.protein_g),
    carbs100: per100(e.carbs_g),
    fat100: per100(e.fat_g),
    satFat100: optional(e.sat_fat_g),
    sugars100: optional(e.sugars_g),
    fiber100: optional(e.fiber_g),
    salt100: optional(e.salt_g),
    grams: String(e.grams),
  };
};

/**
 * Add a food: search the food databases (or arrive from a barcode scan or a
 * meal photo), tap a result to fill in kcal and macros per 100 g, pick a serving, save.
 * With an `entry` it edits that diary entry instead; with a `day` it adds to that day, not today.
 */
export default function AddFood({ navigation, route }: Props) {
  const { day, entry, barcode, food: photoFood, grams: photoGrams, fromPhoto, photoName, label } = route.params ?? {};
  const userId = useAuth().session?.user.id ?? '';

  const [meal, setMeal] = useState<Meal>(entry?.meal ?? route.params?.meal ?? mealForHour(new Date().getHours()));
  const [form, setForm] = useState(() => (entry ? formFrom(entry) : { ...EMPTY, name: photoName ?? '' }));
  const [selected, setSelected] = useState<FoodResult>();
  const [savedBarcode, setSavedBarcode] = useState(barcode ?? entry?.barcode ?? undefined);
  // How the food was added, for the diary label and the badges.
  const [source, setSource] = useState<'barcode' | 'photo' | 'search' | 'manual'>(
    barcode ? 'barcode' : fromPhoto ? 'photo' : 'manual',
  );
  const [lookup, setLookup] = useState<'none' | 'loading' | 'found' | 'missing' | 'failed'>(barcode ? 'loading' : 'none');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [alias, setAlias] = useState<string>();
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');
  const latest = useRef(0);
  const searching = query.trim().length >= 2;
  const [recent, setRecent] = useState<Logged[]>([]);

  /** Fills the form from a database result. */
  const apply = (f: FoodResult, grams?: number, name?: string) => {
    setForm({
      name: name ?? displayName(f),
      kcal100: String(f.kcal100),
      protein100: String(f.protein100),
      carbs100: String(f.carbs100),
      fat100: String(f.fat100),
      satFat100: text(f.satFat100),
      sugars100: text(f.sugars100),
      fiber100: text(f.fiber100),
      salt100: text(f.salt100),
      grams: String(grams ?? f.servings[0]?.grams ?? 100),
    });
    setSelected(f);
    setErrors({});
  };

  // Arrived from the meal photo screen.
  useEffect(() => {
    if (fromPhoto && photoFood) apply(photoFood, photoGrams, photoName);
    else if (fromPhoto) setForm((f) => ({ ...f, grams: String(photoGrams ?? 100) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrived from a barcode scan: Open Food Facts, then USDA.
  useEffect(() => {
    if (!barcode) return;
    lookupBarcode(barcode)
      .then((f) => {
        if (!f) return setLookup('missing');
        apply(f);
        setLookup('found');
      })
      .catch(() => setLookup('failed'));
  }, [barcode]);

  // Back from the Scan label screen: fill in what it read (and the serving size, if the label gave one).
  useEffect(() => {
    if (!label) return;
    const read = (n: number | undefined, old: string) => (n == null ? old : String(n));
    setForm((f) => ({
      ...f,
      kcal100: read(label.kcal100, f.kcal100),
      protein100: read(label.protein100, f.protein100),
      carbs100: read(label.carbs100, f.carbs100),
      fat100: read(label.fat100, f.fat100),
      satFat100: read(label.satFat100, f.satFat100),
      sugars100: read(label.sugars100, f.sugars100),
      fiber100: read(label.fiber100, f.fiber100),
      salt100: read(label.salt100, f.salt100),
      grams: read(label.servingG, f.grams),
    }));
    setErrors({});
  }, [label]);

  // Recent foods for one-tap re-logging (not when editing, or when a scan or photo already chose the food).
  useEffect(() => {
    if (entry || barcode || fromPhoto) return;
    supabase
      .from('food_entries')
      .select(LOGGED_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => setRecent(recentFoods(data ?? []))); // no list if it fails; search still works
  }, [entry, barcode, fromPhoto]);

  // Search as you type, 400 ms after the last key press; ignore answers to older queries.
  useEffect(() => {
    if (!searching) {
      setSearchState('idle');
      return;
    }
    const id = ++latest.current;
    setSearchState('loading');
    const timer = setTimeout(() => {
      searchFoods(query)
        .then((r) => {
          if (id !== latest.current) return;
          setResults(r.results);
          setAlias(r.alias);
          setSearchState('done');
        })
        .catch(() => id === latest.current && setSearchState('failed'));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, searching]);

  const pick = (f: FoodResult) => {
    apply(f);
    setSavedBarcode(undefined); // a picked result isn't the product that was scanned
    setSource('search');
    setLookup('none');
    setQuery('');
    Keyboard.dismiss();
  };

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const parsed = foodSchema.safeParse({ ...form, meal, barcode: savedBarcode });
  const total = parsed.success ? kcalFor(parsed.data.kcal100, parsed.data.grams) : null;

  /**
   * Saves a new diary row (or changes the one being edited), then goes back to the diary.
   * Offline, a new food is kept on the phone and sent the next time the diary loads online.
   */
  const write = async (row: Omit<DiaryEntry, 'id' | 'source'>, per100?: Omit<Parameters<typeof shareProduct>[0], 'barcode' | 'name' | 'grams'>) => {
    setBusy(true);
    const newRow = { ...row, eaten_on: day ?? localDate(), source };
    const res = entry
      ? await supabase.from('food_entries').update(row).eq('id', entry.id)
      : await supabase.from('food_entries').insert(newRow);
    if (isOffline(res) && !entry) {
      try {
        await queueEntry(userId, newRow);
      } catch {
        setBusy(false);
        return Alert.alert(t('Could not save'), t("You're offline and the phone couldn't store the food. Try again."));
      }
      haptic('success');
      Alert.alert(t('Saved on this phone'), t("You're offline. The food is in your diary and will be sent when you're back online."));
      return navigation.goBack();
    }
    if (res.error) {
      setBusy(false);
      haptic('error');
      if (isOffline(res)) return Alert.alert(t("You're offline"), t('Connect to the internet to change a saved food.'));
      return Alert.alert(t('Could not save'), t(res.error.message));
    }
    // No database knew this barcode: share what was typed from the label, so the next scan finds it.
    if (lookup === 'missing' && row.barcode && per100) await shareProduct({ ...per100, barcode: row.barcode, name: row.name, grams: row.grams });
    setBusy(false);
    haptic('success');
    navigation.goBack();
  };

  const save = () => {
    if (!parsed.success) {
      haptic('error');
      return setErrors(fieldErrors(parsed.error));
    }
    setErrors({});
    const f = parsed.data;
    const eaten = (per100?: number) => (per100 == null ? null : gramsFor(per100, f.grams));
    write(
      {
        meal: f.meal,
        name: f.name,
        barcode: f.barcode ?? null,
        grams: f.grams,
        kcal: kcalFor(f.kcal100, f.grams),
        protein_g: gramsFor(f.protein100, f.grams),
        carbs_g: gramsFor(f.carbs100, f.grams),
        fat_g: gramsFor(f.fat100, f.grams),
        sat_fat_g: eaten(f.satFat100),
        sugars_g: eaten(f.sugars100),
        fiber_g: eaten(f.fiber100),
        salt_g: eaten(f.salt100),
      },
      f,
    );
  };

  /** Logs a recent food again, same amount, to the selected meal. */
  const quickAdd = (r: Logged) => write({ ...r, meal, barcode: null });

  const showRecent = !entry && !barcode && !fromPhoto && !label && !searching && !form.name && recent.length > 0;

  if (lookup === 'loading') {
    return (
      <View style={[ui.screen, ui.center]}>
        <ActivityIndicator size="large" color={colors.basil} />
        <Text style={ui.caption}>{t('Looking up barcode {code}…', { code: barcode ?? '' })}</Text>
      </View>
    );
  }

  const servingOptions = selected
    ? [...selected.servings.map((s) => ({ label: `${s.label} (${s.grams} g)`, value: s.grams })), { label: '100 g', value: 100 }]
        .filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i)
    : [];

  return (
    <KeyboardAvoidingView style={ui.screen} behavior="padding">
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        {entry ? null : (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('Search: banana, briani…')}
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t('Search foods')}
              style={styles.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Clear search')}>
                <Ionicons name="close-circle" size={22} color={colors.muted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => navigation.replace('Scan', { day })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('Scan a barcode')}
              style={styles.scanButton}
            >
              <Ionicons name="barcode-outline" size={24} color={colors.onAccent} />
            </Pressable>
          </View>
        )}

        {searching ? (
          <SearchResults
            query={query}
            state={searchState}
            results={results}
            alias={alias}
            onPick={pick}
            onManual={() => setQuery('')}
          />
        ) : (
          <>
            {lookup === 'missing' ? (
              <Notice
                text={t(
                  "Barcode {code} isn't in Open Food Facts, USDA or NutriScan yet. Tap Scan nutrition label below, or type the details in: Add to diary also saves the product, so the next scan finds it.",
                  { code: barcode ?? '' },
                )}
              />
            ) : null}
            {lookup === 'failed' ? (
              <Notice text="Couldn't reach the food databases. Check your connection, or enter the details from the label." />
            ) : null}
            {label ? <Notice text="Read from the label. Check the numbers against the pack, and type the food's name." /> : null}
            {selected?.source === 'NutriScan users' ? (
              <Notice text="Another NutriScan user typed this product in from its label. Check the numbers against your pack." />
            ) : null}
            {fromPhoto && photoFood ? (
              <Notice
                text={t('Nutrition for {dish} is an estimate from {source} ("{match}"). Change it if you know better.', {
                  dish: photoName ?? '',
                  source: t(SOURCE_NAMES[photoFood.source]),
                  match: photoFood.name,
                })}
              />
            ) : null}
            {fromPhoto && !photoFood ? (
              <Notice
                text={t("Couldn't estimate nutrition for {dish}. Search for a similar food above, or enter kcal per 100 g.", { dish: photoName ?? '' })}
              />
            ) : null}

            {showRecent ? (
              <View style={styles.results}>
                <Text style={[ui.label, styles.recentTitle]}>{t('Recent · ＋ adds to {meal}', { meal: t(mealLabel(meal)) })}</Text>
                {recent.map((r) => (
                  <Pressable
                    key={r.name}
                    onPress={() => setForm(formFrom(r))}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.name}, ${r.grams} grams, ${r.kcal} kcal`}
                    accessibilityHint={t('Fills in the form below')}
                    style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.basilSoft }]}
                  >
                    <View style={ui.flex}>
                      <Text style={ui.body} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={ui.caption}>
                        {r.grams} g · {r.kcal} kcal
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => quickAdd(r)}
                      disabled={busy}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('Add {food} to {meal}', { food: r.name, meal: t(mealLabel(meal)) })}
                      style={styles.quickAdd}
                    >
                      <Ionicons name="add" size={22} color={colors.onAccent} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selected ? (
              <View style={ui.row}>
                <View style={styles.thumb}>
                  {selected.imageUrl ? (
                    <Image source={{ uri: selected.imageUrl }} style={styles.thumbImage} resizeMode="contain" accessibilityIgnoresInvertColors />
                  ) : (
                    <Ionicons name={lookup === 'found' ? 'barcode-outline' : 'nutrition-outline'} size={30} color={colors.muted} />
                  )}
                </View>
                <View style={ui.flex}>
                  <Text style={ui.caption}>
                    {lookup === 'found' ? `Barcode ${barcode} · ` : ''}
                    {t(SOURCE_NAMES[selected.source])}
                  </Text>
                  <Text style={ui.heading} numberOfLines={2}>
                    {form.name}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={ui.card}>
              {entry ? null : (
                <Button
                  title={label ? 'Scan nutrition label again' : 'Scan nutrition label'}
                  icon="scan-outline"
                  variant="secondary"
                  onPress={() => navigation.navigate('Label', { day })}
                />
              )}
              <Field label="Food name" value={form.name} onChangeText={set('name')} error={errors.name} />
              {servingOptions.length > 1 ? (
                <View style={styles.servings}>
                  <Text style={ui.label}>{t('Serving')}</Text>
                  <Chips options={servingOptions} value={Number(form.grams)} onChange={(g) => set('grams')(String(g))} />
                </View>
              ) : null}
              <View style={styles.row}>
                <Field
                  label="kcal per 100 g"
                  keyboardType="decimal-pad"
                  value={form.kcal100}
                  onChangeText={set('kcal100')}
                  error={errors.kcal100}
                  containerStyle={ui.flex}
                />
                <Field
                  label="Amount eaten (g)"
                  keyboardType="decimal-pad"
                  value={form.grams}
                  onChangeText={set('grams')}
                  error={errors.grams}
                  containerStyle={ui.flex}
                  selectTextOnFocus
                />
              </View>
              {/* Short labels with one "per 100 g" note: "Protein /100g" was cut off at larger text sizes. */}
              <View style={styles.moreHead}>
                <Text style={[ui.body, styles.bold]}>{t('Macros')}</Text>
                <Text style={ui.caption}>{t('per 100 g')}</Text>
              </View>
              <View style={styles.row}>
                <Field
                  label="Protein"
                  labelColor={colors.protein}
                  keyboardType="decimal-pad"
                  value={form.protein100}
                  onChangeText={set('protein100')}
                  error={errors.protein100}
                  containerStyle={ui.flex}
                />
                <Field
                  label="Carbs"
                  labelColor={colors.carbs}
                  keyboardType="decimal-pad"
                  value={form.carbs100}
                  onChangeText={set('carbs100')}
                  error={errors.carbs100}
                  containerStyle={ui.flex}
                />
                <Field
                  label="Fat"
                  labelColor={colors.fat}
                  keyboardType="decimal-pad"
                  value={form.fat100}
                  onChangeText={set('fat100')}
                  error={errors.fat100}
                  containerStyle={ui.flex}
                />
              </View>
              <View style={styles.more}>
                <View style={styles.moreHead}>
                  <Text style={[ui.body, styles.bold]}>{t('More nutrients')}</Text>
                  <Text style={ui.caption}>{t('per 100 g · optional')}</Text>
                </View>
                <View style={styles.row}>
                  {EXTRAS.map((x) => (
                    <Field
                      key={x.key}
                      label={x.name}
                      keyboardType="decimal-pad"
                      placeholder="–"
                      value={form[x.key]}
                      onChangeText={set(x.key)}
                      error={errors[x.key]}
                      containerStyle={ui.flex}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={ui.card}>
              <Text style={ui.heading}>{t('Meal')}</Text>
              <Chips options={MEAL_OPTIONS} value={meal} onChange={setMeal} />
            </View>

            <View style={[ui.card, styles.total]}>
              <Text style={ui.label}>{t(entry ? 'Total' : 'This adds')}</Text>
              <Text style={styles.totalText}>{total ?? '–'} kcal</Text>
            </View>

            {entry ? (
              <>
                <Button title="Save changes" icon="checkmark" onPress={save} loading={busy} />
                <Button title="Remove from diary" icon="trash-outline" variant="danger" onPress={() => confirmRemove(entry, navigation.goBack)} />
              </>
            ) : (
              <Button title="Add to diary" icon="add-circle-outline" onPress={save} loading={busy} />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SearchResults(props: {
  query: string;
  state: 'idle' | 'loading' | 'done' | 'failed';
  results: FoodResult[];
  alias?: string;
  onPick: (f: FoodResult) => void;
  onManual: () => void;
}) {
  const { state, results } = props;
  return (
    <View style={styles.results}>
      {props.alias ? (
        <Text style={ui.caption}>
          {t('Showing results for "{alias}" ({query})', { alias: props.alias, query: props.query.trim() })}
        </Text>
      ) : null}
      {state === 'loading' && results.length === 0 ? <ActivityIndicator color={colors.basil} style={styles.spinner} /> : null}
      {state === 'failed' ? <Notice text="Couldn't reach the food databases. Check your connection, or enter the details yourself." /> : null}
      {state === 'done' && results.length === 0 ? (
        <Text style={[ui.body, styles.empty]}>{t('No foods found for "{query}". Try another word.', { query: props.query.trim() })}</Text>
      ) : null}

      {state !== 'failed'
        ? results.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => props.onPick(f)}
              accessibilityRole="button"
              accessibilityLabel={`${displayName(f)}, ${f.kcal100} kcal per 100 grams`}
              style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.basilSoft }]}
            >
              <View style={ui.flex}>
                <Text style={ui.body} numberOfLines={2}>
                  {f.name}
                </Text>
                <Text style={ui.caption} numberOfLines={1}>
                  {[f.brand, f.servings[0] && `${f.servings[0].label} = ${f.servings[0].grams} g`, f.source]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <View style={styles.resultKcal}>
                <Text style={ui.stat}>{Math.round(f.kcal100)}</Text>
                <Text style={ui.caption}>kcal/100 g</Text>
              </View>
            </Pressable>
          ))
        : null}

      <Pressable onPress={props.onManual} accessibilityRole="button" style={styles.manual}>
        <Text style={styles.manualText}>{t("Can't find it? Enter the details yourself")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, height: 50, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm - 2,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  spinner: { paddingVertical: 24 },
  empty: { paddingVertical: 16, color: colors.muted },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultKcal: { alignItems: 'flex-end', minWidth: 64 },
  manual: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  manualText: { fontFamily: fonts.bold, fontSize: 15, color: colors.basil },
  servings: { gap: 6 },
  more: { gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  moreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  bold: { fontFamily: fonts.bold },
  recentTitle: { paddingTop: 8, paddingBottom: 4 },
  quickAdd: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: 62, height: 62 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalText: { fontFamily: fonts.extraBold, fontSize: 32, lineHeight: 36, color: colors.basil, fontVariant: ['tabular-nums'] },
});
