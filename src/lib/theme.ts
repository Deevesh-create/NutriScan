import { Appearance, StyleSheet } from 'react-native';

// Tokens from the NutriScan design system (Claude Design): Nutrition Facts label look, basil accent, Archivo.
const light = {
  bg: '#F4F6F1',
  card: '#FFFFFF',
  line: '#DDE3DA',
  fieldBorder: '#7E8A7D',
  ink: '#15201A',
  muted: '#56635A',
  basil: '#1C7247',
  basilSoft: '#E1F0E6',
  tomato: '#C2362B',
  tomatoSoft: '#F6DCD9',
  notice: '#FCEFC7',
  protein: '#2B56C7',
  carbs: '#8F5F0E',
  fat: '#9C3570',
  water: '#2779A7',
  onAccent: '#FFFFFF', // text and icons on basil or tomato fills
  white: '#FFFFFF', // on the camera picture, which is dark in both themes
};

// Same roles, lighter accents on near-black so text keeps at least 4.5:1 contrast.
const dark: typeof light = {
  bg: '#0F1411',
  card: '#18201B',
  line: '#2B352E',
  fieldBorder: '#6B786E',
  ink: '#E7EEE9',
  muted: '#A3B0A6',
  basil: '#6FD39A',
  basilSoft: '#1B3325',
  tomato: '#F07A6E',
  tomatoSoft: '#3A1F1C',
  notice: '#3B3417',
  protein: '#8FAEF7',
  carbs: '#E2B666',
  fat: '#EE97C8',
  water: '#6CC0EE',
  onAccent: '#0B1A11',
  white: '#FFFFFF',
};

/**
 * Follows the phone's dark-mode setting when the app starts.
 * ponytail: picked once at launch (every StyleSheet reads these at load); switching live would need
 * every screen to read colours from a hook. Reopen the app after changing the phone's theme.
 */
export const isDark = Appearance.getColorScheme() === 'dark';
export const colors = isDark ? dark : light;

// Android loads each weight as its own font file from android/app/src/main/assets/fonts.
export const fonts = {
  regular: 'Archivo-Regular',
  bold: 'Archivo-Bold',
  extraBold: 'Archivo-ExtraBold',
};

export const space = { 1: 4, 2: 8, 3: 16, 4: 24 };
export const radius = { sm: 10, md: 16, pill: 999 };
export const TOUCH_MIN = 48;

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[3], gap: space[3] },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[3],
    gap: 12,
  },
  // The Nutrition Facts bar under a summary card's title. Once per card.
  rule: { height: 6, backgroundColor: colors.ink },
  display: { fontFamily: fonts.extraBold, fontSize: 44, lineHeight: 48, letterSpacing: -0.9, color: colors.ink },
  title: { fontFamily: fonts.extraBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: colors.ink },
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 24, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  stat: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink, fontVariant: ['tabular-nums'] },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.muted },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: space[4] },
});
