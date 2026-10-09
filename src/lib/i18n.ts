import AsyncStorage from '@react-native-async-storage/async-storage';
import { FR, MFE } from './translations';

export type Lang = 'en' | 'fr' | 'mfe';

/** Each language named in itself, for the picker in Settings. */
export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'mfe', label: 'Kreol Morisien' },
];

// English text is the key: anything without a translation simply shows in English.
const DICTS: Record<Lang, Record<string, string>> = { en: {}, fr: FR, mfe: MFE };
let current: Lang = 'en';

/** `text` in the current language, with {name} placeholders filled from `vars`. */
export function t(text: string, vars?: Record<string, string | number>): string {
  const out = DICTS[current][text] ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (hole, name) => (name in vars ? fmt(vars[name]) : hole)) : out;
}

/** Form errors like "Weight: 30 to 300" (built in validation.ts) are translated piece by piece. */
export function tError(message: string): string {
  const range = message.match(/^(.+): (\d+) to (\d+)$/);
  if (range) return t('{label}: {min} to {max}', { label: t(range[1]), min: range[2], max: range[3] });
  const notNumber = message.match(/^(.+) must be a number$/);
  if (notNumber) return t('{label} must be a number', { label: t(notNumber[1]) });
  return t(message);
}

export const getLanguage = () => current;
/** Dates: French-style for French and Kreol ("jeu. 8 oct."), British English otherwise. */
export const dateLocale = () => (current === 'en' ? 'en-GB' : 'fr-FR');
/** Numbers the same way: 2,420.5 in English, 2 420,5 in French and Kreol. */
export const num = (n: number) => n.toLocaleString(dateLocale());
const fmt = (v: string | number) => (typeof v === 'number' ? num(v) : String(v));

const KEY = 'language';

/** The saved choice, else the phone's language (a French phone starts in French). */
export async function loadLanguage(): Promise<Lang> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(KEY);
  } catch {}
  const phone = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en';
  current = saved === 'en' || saved === 'fr' || saved === 'mfe' ? saved : phone.startsWith('fr') ? 'fr' : 'en';
  return current;
}

export function saveLanguage(lang: Lang) {
  current = lang;
  AsyncStorage.setItem(KEY, lang).catch(() => {});
}
