import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useAuth } from '../contexts/AuthContext';
import { DeleteAccount } from '../components/DeleteAccount';
import { consentRecord } from '../lib/legal';
import { t } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { consentSchema, fieldErrors } from '../lib/validation';
import { Button } from '../components/Button';
import { ConsentChecks } from '../components/ConsentChecks';
import { colors, ui } from '../lib/theme';
import { authStyles } from './Login';

/**
 * Shown to a signed-in user who hasn't agreed to the current Terms and Privacy Policy: accounts made
 * before consent was asked for, or everyone after the policy changes (POLICY_VERSION in lib/legal.ts).
 */
export default function Consent() {
  const { session, signOut } = useAuth();
  const [value, setValue] = useState({ terms: false, health: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const updated = !!session?.user.user_metadata?.consent; // agreed to an older version

  const agree = async () => {
    const parsed = consentSchema.safeParse(value);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    // Saved on the account; the auth listener then sees the updated user and opens the app.
    const { error } = await supabase.auth.updateUser({ data: consentRecord() });
    setBusy(false);
    if (error) Alert.alert(t('Could not save'), `${t(error.message)}\n\n${t('Check your connection and try again.')}`);
  };

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={authStyles.content} keyboardShouldPersistTaps="handled">
        <Ionicons name="shield-checkmark-outline" size={56} color={colors.basil} />
        <View style={styles.tight}>
          <Text style={ui.title} accessibilityRole="header">
            {t(updated ? 'Our terms have changed' : 'Before you continue')}
          </Text>
          <Text style={[ui.body, styles.muted]}>
            {t(
              'NutriScan stores health information about you: your goal details and your food diary. Please read how we handle it and agree to continue.',
            )}
          </Text>
        </View>
        <View style={ui.rule} />
        <ConsentChecks value={value} onChange={setValue} errors={errors} />
        <Button title="Agree and continue" icon="checkmark" onPress={agree} loading={busy} />
        <Button title="Sign out" icon="log-out-outline" variant="secondary" onPress={signOut} />
        <DeleteAccount label="I don't agree: delete my account" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tight: { gap: 4 },
  muted: { color: colors.muted },
});
