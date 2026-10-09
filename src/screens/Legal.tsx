import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { POLICY_DATE, PRIVACY, TERMS } from '../lib/legal';
import { SUPABASE_URL } from '../lib/env';
import { getLanguage, t } from '../lib/i18n';
import { Notice } from '../components/Notice';
import type { RootStackParamList } from '../navigation';
import { ui } from '../lib/theme';
import { authStyles } from './Login';

/** The Privacy Policy or Terms of Use, readable offline. The same text is published online (npm run legal). */
export default function Legal({ route }: NativeStackScreenProps<RootStackParamList, 'Legal'>) {
  const doc = route.params.doc === 'terms' ? TERMS : PRIVACY;

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {getLanguage() === 'en' ? null : <Notice text="This document is in English." />}
      <Text style={ui.caption}>Last updated {POLICY_DATE}</Text>
      {doc.sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={ui.heading} accessibilityRole="header">
            {s.heading}
          </Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={ui.body}>
              {p}
            </Text>
          ))}
        </View>
      ))}
      <Pressable
        onPress={() => Linking.openURL(`${SUPABASE_URL}/storage/v1/object/public/legal/${doc.file}.txt`)}
        accessibilityRole="link"
        style={authStyles.linkBox}
      >
        <Text style={authStyles.link}>{t('Open the online copy')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
});
