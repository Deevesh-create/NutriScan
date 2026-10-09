import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { savedSession, supabase } from '../lib/supabase';
import { cacheKey, isOffline, loadCached, saveCached } from '../lib/offline';
import { t } from '../lib/i18n';

export interface Goals {
  user_id: string;
  sex: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  activity: number;
  weekly_loss_kg: number;
  maintenance_kcal: number;
  daily_kcal: number;
}

// Grace period so a quick trip to a permission dialog or the app switcher doesn't lock the app.
const LOCK_AFTER_MS = 30_000;
const LOCK_SERVICE = 'nutriscan.applock';

/**
 * App lock, kept in the Android Keystore. The lock IS a Keystore item that can only be read after a
 * fingerprint check, so "is it on?" = "does the item exist?" and unlocking = reading it.
 */
export const appLock = {
  isOn: () => Keychain.hasGenericPassword({ service: LOCK_SERVICE }),
  /** Fingerprints available on this phone, or null when none are enrolled. */
  biometry: () => Keychain.getSupportedBiometryType(),
  turnOn: () =>
    Keychain.setGenericPassword('applock', 'on', {
      service: LOCK_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationPrompt: { title: t('Confirm to turn on app lock'), cancel: t('Cancel') },
    }),
  turnOff: () => Keychain.resetGenericPassword({ service: LOCK_SERVICE }),
  /** Shows the system fingerprint prompt. True when the user passed it. */
  check: async (title: string) => {
    try {
      return !!(await Keychain.getGenericPassword({
        service: LOCK_SERVICE,
        authenticationPrompt: { title, cancel: t('Cancel') },
      }));
    } catch {
      return false; // cancelled, failed, or fingerprints changed since the lock was set
    }
  },
};

/** The user's goal; offline, the copy saved on this phone (without it the app would ask for a new goal). */
async function loadGoals(userId: string): Promise<Goals | null> {
  const key = cacheKey(userId, 'goals');
  const res = await supabase.from('nutrition_goals').select('*').eq('user_id', userId).retry(false).maybeSingle();
  if (isOffline(res)) return loadCached<Goals>(key);
  if (res.data) saveCached(key, res.data);
  return res.data;
}

interface AuthValue {
  session: Session | null;
  goals: Goals | null;
  loading: boolean;
  locked: boolean;
  refreshGoals: () => Promise<void>;
  unlock: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const leftAt = useRef(0);

  useEffect(() => {
    let started = false; // supabase-js has reported the session it opened with
    let lockChecked = false;
    // Set together so the navigator never sees a session without its goals.
    const show = (s: Session | null, g: Goals | null) => {
      setGoals(g);
      setSession(s);
      setLoading(false);
    };

    // Open straight away with the session and goal saved on the phone (see savedSession).
    savedSession().then(async (saved) => {
      if (!saved) return;
      const g = await loadCached<Goals>(cacheKey(saved.user.id, 'goals'));
      const lock = await appLock.isOn();
      if (started) return; // supabase-js answered first
      lockChecked = true;
      setLocked(lock);
      show(saved, g);
    });

    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'TOKEN_REFRESHED') return setSession(s);
      if (event === 'INITIAL_SESSION') started = true;
      // supabase-js deadlocks if another supabase call is awaited inside this callback, so defer it.
      setTimeout(async () => {
        // Offline with an expired token: no session reported, but the saved one is still fine to show.
        const current = event === 'INITIAL_SESSION' && !s ? await savedSession() : s;
        const g = current ? await loadGoals(current.user.id) : null;
        if (event === 'INITIAL_SESSION' && current && !lockChecked) {
          lockChecked = true;
          setLocked(await appLock.isOn());
        }
        show(current, g);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
      } else if (
        state === 'active' &&
        session &&
        leftAt.current &&
        Date.now() - leftAt.current > LOCK_AFTER_MS &&
        (await appLock.isOn())
      ) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [session]);

  const unlock = useCallback(async () => {
    if (await appLock.check(t('Unlock NutriScan'))) setLocked(false);
  }, []);

  const signOut = useCallback(async () => {
    const prefix = session ? cacheKey(session.user.id, '') : null;
    await supabase.auth.signOut();
    setLocked(false);
    // Remove this user's offline copies. Foods still waiting to sync stay for their next sign-in.
    if (prefix) await AsyncStorage.multiRemove((await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix)));
  }, [session]);

  const refreshGoals = useCallback(async () => {
    if (session) setGoals(await loadGoals(session.user.id));
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, goals, loading, locked, refreshGoals, unlock, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
