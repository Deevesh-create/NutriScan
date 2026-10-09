import { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { DarkTheme, DefaultTheme, type InitialState, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { t } from './src/lib/i18n';
import { Button } from './src/components/Button';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { colors, fonts, isDark, ui } from './src/lib/theme';
import type { RootStackParamList, TabParamList } from './src/navigation';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import Setup from './src/screens/Setup';
import Goals from './src/screens/Goals';
import Today from './src/screens/Today';
import History from './src/screens/History';
import Settings from './src/screens/Settings';
import AddFood from './src/screens/AddFood';
import Scan from './src/screens/Scan';
import Snap from './src/screens/Snap';
import Label from './src/screens/Label';
import Consent from './src/screens/Consent';
import Legal from './src/screens/Legal';
import Faq from './src/screens/Faq';
import { hasConsented } from './src/lib/legal';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Each weight is its own font file on Android, so the weight lives in the family name.
const font = (fontFamily: string) => ({ fontFamily, fontWeight: 'normal' as const });
const base = isDark ? DarkTheme : DefaultTheme;
const theme: Theme = {
  ...base,
  colors: { ...base.colors, primary: colors.basil, background: colors.bg, card: colors.card, text: colors.ink, border: colors.line },
  fonts: { regular: font(fonts.regular), medium: font(fonts.bold), bold: font(fonts.bold), heavy: font(fonts.extraBold) },
};

const header: NativeStackNavigationOptions = {
  headerShown: true,
  headerTintColor: colors.basil,
  headerTitleStyle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.ink },
  headerShadowVisible: false,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <Screens />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

/**
 * The navigator, redrawn from scratch when the language changes so every screen picks up the new
 * words; the saved navigation state puts the user back where they were (Settings).
 */
function Screens() {
  const { lang } = useLanguage();
  const navState = useRef<InitialState>(undefined);
  return (
    <ErrorBoundary fallback={(retry) => <Crashed retry={retry} />}>
      <NavigationContainer
        key={lang}
        theme={theme}
        initialState={navState.current}
        onStateChange={(state) => {
          navState.current = state;
        }}
      >
        <Navigator />
      </NavigationContainer>
    </ErrorBoundary>
  );
}

function Navigator() {
  const { session, goals, loading, locked } = useAuth();
  if (loading) return null;

  // Only the screens for the current state exist, so a signed-out user can't reach the diary at all.
  // When the state changes, React Navigation moves to the first screen of the new set.
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
          </>
        ) : !hasConsented(session.user.user_metadata) ? (
          <Stack.Screen name="Consent" component={Consent} />
        ) : !goals ? (
          <Stack.Screen name="Setup" component={Setup} options={{ ...header, title: t('Set your goal') }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen
              name="AddFood"
              component={AddFood}
              options={({ route }) => ({ ...header, title: t(route.params?.entry ? 'Edit food' : 'Add food') })}
            />
            <Stack.Screen name="Goals" component={Goals} options={{ ...header, title: t('Your goal') }} />
            <Stack.Screen name="Scan" component={Scan} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Snap" component={Snap} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Label" component={Label} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Faq" component={Faq} options={{ ...header, title: t('Help and FAQ') }} />
          </>
        )}
        {/* Readable from every state: Register, the Consent screen and Settings link to it. */}
        <Stack.Screen
          name="Legal"
          component={Legal}
          options={({ route }) => ({ ...header, title: t(route.params.doc === 'terms' ? 'Terms of Use' : 'Privacy Policy') })}
        />
      </Stack.Navigator>
      {locked ? <LockScreen /> : null}
    </>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const tabIcon =
  (name: IconName) =>
  ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;

function Tabs() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.basil,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        // The default bar is a fixed 49 dp tall: grow it with the phone's text size so labels aren't clipped.
        tabBarStyle: { borderTopColor: colors.line, height: 49 + insets.bottom + Math.ceil(20 * Math.max(0, fontScale - 1)) },
        // Screens start below the status bar, so scrolled content never slides under the clock.
        sceneStyle: { paddingTop: insets.top, backgroundColor: colors.bg },
      }}
    >
      <Tab.Screen name="Today" component={Today} options={{ tabBarIcon: tabIcon('today-outline'), tabBarLabel: t('Today') }} />
      <Tab.Screen
        name="History"
        component={History}
        options={{ tabBarIcon: tabIcon('stats-chart-outline'), tabBarLabel: t('History') }}
      />
      <Tab.Screen name="Settings" component={Settings} options={{ tabBarIcon: tabIcon('options-outline'), tabBarLabel: t('Settings') }} />
    </Tab.Navigator>
  );
}

/** Covers the app (keeping its navigation state) until the fingerprint check passes. */
function LockScreen() {
  const { unlock, signOut } = useAuth();

  useEffect(() => {
    unlock();
  }, [unlock]);

  return (
    <View style={[StyleSheet.absoluteFill, ui.screen, ui.center]}>
      <Ionicons name="lock-closed" size={56} color={colors.basil} />
      <Text style={ui.title}>{t('NutriScan is locked')}</Text>
      <Text style={ui.caption}>{t('Use your fingerprint to continue.')}</Text>
      <View style={styles.buttons}>
        <Button title="Unlock" icon="finger-print" onPress={unlock} />
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </View>
    </View>
  );
}

/** Shown instead of closing the app when a screen hits an unexpected error. */
function Crashed({ retry }: { retry: () => void }) {
  return (
    <View style={[ui.screen, ui.center]}>
      <Ionicons name="alert-circle-outline" size={56} color={colors.tomato} />
      <Text style={ui.title}>{t('Something went wrong')}</Text>
      <Text style={[ui.caption, styles.centered]}>{t('Your diary is saved. Try again to go back to the app.')}</Text>
      <View style={styles.buttons}>
        <Button title="Try again" icon="refresh" onPress={retry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 8, marginTop: 12 },
});
