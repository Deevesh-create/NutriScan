import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { deleteAccount } from '../lib/account';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { colors, fonts, ui } from '../lib/theme';
import { Button } from './Button';
import { Field } from './Field';

/**
 * "Delete my account and data" (Settings, and the Consent screen for someone who won't agree).
 * Opens a small form that asks for the password again, so someone holding an unlocked phone
 * can't wipe the account with two taps.
 */
export function DeleteAccount({ label }: { label: string }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setError(undefined);
  };

  const submit = async () => {
    if (!password) return setError('Required');
    setBusy(true);
    const problem = await deleteAccount(session?.user.email ?? '', password);
    setBusy(false);
    if (problem) {
      setError(problem);
      haptic('error');
    }
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>{t(label)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[ui.card, styles.box]}>
      <Text style={ui.cardTitle}>{t('Delete your account?')}</Text>
      <Text style={ui.body}>
        {t('This permanently deletes your account, your goal and your whole food diary. It cannot be undone.')}{' '}
        {t('Products you added for other users stay, without your name.')}
      </Text>
      <Field
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        error={error}
      />
      <Button title="Delete forever" icon="trash-outline" variant="danger" loading={busy} onPress={submit} />
      <Button title="Cancel" variant="secondary" onPress={close} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.tomato },
  box: { gap: 12 },
});
