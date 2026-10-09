import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors, fonts, radius, TOUCH_MIN } from '../lib/theme';
import { t } from '../lib/i18n';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: Props) {
  const fg = variant === 'secondary' ? colors.basil : colors.onAccent;
  const bg = variant === 'primary' ? colors.basil : variant === 'danger' ? colors.tomato : colors.basilSoft;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={22} color={fg} /> : null}
          <Text style={[styles.text, { color: fg }]}>{t(title)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_MIN + 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.bold, fontSize: 16 },
});
