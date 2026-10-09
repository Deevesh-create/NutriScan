import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { fieldErrors, loginSchema } from '../lib/validation';
import { useRootNav } from '../navigation';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Logo } from '../components/Logo';
import { colors, fonts, ui } from '../lib/theme';
import { t } from '../lib/i18n';

export default function Login() {
  const navigation = useRootNav();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    // On success the navigator switches to the app by itself.
    if (error) Alert.alert(t('Sign in failed'), t(error.message));
  };

  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView style={ui.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Logo />
          <View style={styles.brand}>
            <Text style={styles.name}>NutriScan</Text>
            <Text style={[ui.body, { color: colors.muted }]}>{t('Scan food, count calories, hit your deficit.')}</Text>
          </View>
          <View style={[ui.rule, styles.rule]} />

          <Field
            label="Email"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={errors.email}
          />
          <Field
            label="Password"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            secureTextEntry
            autoComplete="password"
            error={errors.password}
          />
          <Button title="Sign in" onPress={submit} loading={busy} style={styles.submit} />

          <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link" style={styles.linkBox}>
            <Text style={styles.link}>{t('New here? Create an account')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  linkBox: { alignSelf: 'center', padding: 12, minHeight: 48, justifyContent: 'center' },
  link: { fontFamily: fonts.bold, fontSize: 16, color: colors.basil },
});

const styles = StyleSheet.create({
  ...authStyles,
  brand: { gap: 4 },
  name: { fontFamily: fonts.extraBold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: colors.ink },
  rule: { marginVertical: 8 },
  submit: { marginTop: 8 },
});
