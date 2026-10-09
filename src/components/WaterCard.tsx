import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { GLASS_ML, WATER_GOAL } from '../lib/calories';
import { haptic } from '../lib/haptics';
import { num, t } from '../lib/i18n';
import { cacheKey, isOffline, loadCached, saveCached } from '../lib/offline';
import { supabase } from '../lib/supabase';
import { colors, radius, ui } from '../lib/theme';

/** Glasses of water for one diary day, with + and −. One row per day in `water_intake`. */
export function WaterCard({ day, userId }: { day: string; userId: string }) {
  const [glasses, setGlasses] = useState(0);
  const key = cacheKey(userId, `water-${day}`);

  useFocusEffect(
    useCallback(() => {
      loadCached<number>(key).then((copy) => copy != null && setGlasses(copy)); // at once; the server may be slow offline
      supabase
        .from('water_intake')
        .select('glasses')
        .eq('drunk_on', day)
        .retry(false)
        .maybeSingle()
        .then((res) => {
          if (isOffline(res)) return;
          if (res.error) return; // table not created yet: stays at 0
          setGlasses(res.data?.glasses ?? 0);
          saveCached(key, res.data?.glasses ?? 0);
        });
    }, [day, key]),
  );

  const change = async (by: number) => {
    const next = Math.min(40, Math.max(0, glasses + by));
    if (next === glasses) return;
    haptic('tick');
    setGlasses(next); // show it straight away; put it back if it can't be saved
    const res = await supabase.from('water_intake').upsert({ drunk_on: day, glasses: next }, { onConflict: 'user_id,drunk_on' });
    if (!res.error) return saveCached(key, next);
    setGlasses(glasses);
    Alert.alert(
      t(isOffline(res) ? "You're offline" : 'Could not save water'),
      t(isOffline(res) ? 'Connect to the internet to log water.' : res.error.message),
    );
  };

  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <View style={ui.flex}>
          <Text style={ui.heading} accessibilityRole="header">
            {t('Water')}
          </Text>
          <Text style={ui.caption}>
            {t('{n} of {goal} glasses', { n: glasses, goal: WATER_GOAL })} · {num(glasses * GLASS_ML)} ml
          </Text>
        </View>
        <Pressable
          onPress={() => change(-1)}
          disabled={glasses === 0}
          accessibilityRole="button"
          accessibilityLabel={t('Remove a glass of water')}
          style={[styles.round, styles.soft, glasses === 0 && styles.off]}
        >
          <Ionicons name="remove" size={24} color={colors.basil} />
        </Pressable>
        <Pressable onPress={() => change(1)} accessibilityRole="button" accessibilityLabel={t('Add a glass of water')} style={[styles.round, styles.solid]}>
          <Ionicons name="add" size={24} color={colors.onAccent} />
        </Pressable>
      </View>
      <View style={styles.drops} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: Math.max(WATER_GOAL, glasses) }, (_, i) => (
          <Ionicons
            key={i}
            name={i < glasses ? 'water' : 'water-outline'}
            size={26}
            color={i < glasses ? colors.water : colors.fieldBorder}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  soft: { backgroundColor: colors.basilSoft },
  solid: { backgroundColor: colors.basil },
  off: { opacity: 0.4 },
  drops: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
