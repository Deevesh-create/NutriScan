import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { consentRecord } from '../lib/legal';
import { supabase } from '../lib/supabase';
import { fieldErrors, registerSchema } from '../lib/validation';
import { useRootNav } from '../navigation';
import { Button } from '../components/Button';
import { ConsentChecks } from '../components/ConsentChecks';
import { Field } from '../components/Field';
import { colors, ui } from '../lib/theme';
import { t } from '../lib/i18n';
import { authStyles as styles } from './Login';

export default function Register() {
  const navigation = useRootNav();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', terms: false, health: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const { email, password } = parsed.data;
    // The consent (policy version and time) is saved on the new account itself.
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: consentRecord() } });
    setBusy(false);
    if (error) return Alert.alert(t('Sign up failed'), t(error.message));
    // With email confirmation on there is no session yet; otherwise the navigator takes over.
    if (!data.session) {
      Alert.alert(t('Check your email'), t('Confirm your address, then sign in.'), [
        { text: t('OK'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView style={ui.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={ui.title}>{t('Create account')}</Text>
            <Text style={[ui.body, { color: colors.muted }]}>{t('Your food diary stays private to you.')}</Text>
          </View>
          <View style={ui.rule} />

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
            placeholder="8+ characters, with a letter and a number"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />
          <Field
            label="Confirm password"
            value={form.confirm}
            onChangeText={(confirm) => setForm({ ...form, confirm })}
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirm}
          />
          <ConsentChecks
            value={form}
            onChange={({ terms, health }) => setForm({ ...form, terms, health })}
            errors={errors}
          />
          <Button title="Create account" onPress={submit} loading={busy} />

          <Pressable onPress={() => navigation.goBack()} accessibilityRole="link" style={styles.linkBox}>
            <Text style={styles.link}>{t('Already have an account? Sign in')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
