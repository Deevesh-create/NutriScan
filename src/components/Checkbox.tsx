import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors, fonts, ui } from '../lib/theme';
import { tError } from '../lib/i18n';

/** A tick box with a sentence; the sentence can contain <Text onPress> links. */
export function Checkbox(props: { checked: boolean; onChange: (checked: boolean) => void; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => props.onChange(!props.checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: props.checked }}
        style={styles.row}
      >
        <Ionicons
          name={props.checked ? 'checkbox' : 'square-outline'}
          size={28}
          color={props.error ? colors.tomato : colors.basil}
        />
        <Text style={[ui.body, ui.flex]}>{props.children}</Text>
      </Pressable>
      {props.error ? <Text style={styles.error}>{tError(props.error)}</Text> : null}
    </View>
  );
}

/** Green bold link inside a sentence. */
export function InlineLink({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Text onPress={onPress} accessibilityRole="link" style={styles.link}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 48 },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.tomato, paddingLeft: 38 },
  link: { fontFamily: fonts.bold, color: colors.basil, textDecorationLine: 'underline' },
});
