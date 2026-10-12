import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Lang, loadLanguage, saveLanguage } from '../lib/i18n';
import { restoreReminders } from '../lib/reminders';

const LanguageContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null);

/** Loads the language before the first screen draws, and redraws the app when Settings changes it. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>();

  useEffect(() => {
    loadLanguage().then(setLangState);
  }, []);

  useEffect(() => {
    if (lang) restoreReminders().catch(() => {});
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    saveLanguage(next);
    setLangState(next);
  }, []);

  if (!lang) return null;
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
