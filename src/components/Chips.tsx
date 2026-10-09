import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../lib/theme';
import { t } from '../lib/i18n';

interface Props<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

/** Single-choice pill selector. */
export function Chips<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.active]}
          >
            <Text style={[styles.text, active && styles.activeText]}>{t(o.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.card,
  },
  active: { backgroundColor: colors.basil, borderColor: colors.basil },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  activeText: { fontFamily: fonts.bold, color: colors.onAccent },
});
