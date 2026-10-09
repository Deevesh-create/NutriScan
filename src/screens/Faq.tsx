import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { FAQ } from '../lib/faq';
import { t } from '../lib/i18n';
import { colors, fonts, ui } from '../lib/theme';

/** Help and FAQ: tap a question to open its answer (one open at a time). */
export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {FAQ.map(([q, a], i) => (
        <Pressable
          key={q}
          onPress={() => setOpen(open === i ? null : i)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === i }}
          style={[ui.card, styles.item]}
        >
          <View style={ui.row}>
            <Text style={[styles.question, ui.flex]}>{t(q)}</Text>
            <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
          </View>
          {open === i ? <Text style={ui.body}>{t(a)}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { gap: 8 },
  question: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
