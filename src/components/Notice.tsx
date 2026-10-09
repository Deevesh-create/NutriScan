import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors, radius, ui } from '../lib/theme';
import { t } from '../lib/i18n';

/** Yellow information box, e.g. "barcode not found" or "you're offline". */
export function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Ionicons name="information-circle-outline" size={22} color={colors.ink} />
      <Text style={[ui.body, ui.flex]}>{t(text)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, backgroundColor: colors.notice, borderRadius: radius.sm, padding: 12 },
});
