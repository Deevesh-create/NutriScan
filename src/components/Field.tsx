import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, ui } from '../lib/theme';
import { t, tError } from '../lib/i18n';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  labelColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, error, labelColor, containerStyle, placeholder, ...props }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[ui.label, labelColor ? { color: labelColor } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {t(label)}
      </Text>
      <TextInput
        accessibilityLabel={t(label)}
        placeholderTextColor={colors.muted}
        placeholder={placeholder ? t(placeholder) : undefined}
        style={[styles.input, error ? { borderColor: colors.tomato, borderWidth: 2 } : null]}
        {...props}
      />
      {error ? <Text style={styles.error}>{tError(error)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.tomato },
});
