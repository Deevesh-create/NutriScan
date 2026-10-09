import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { type Session, createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Where the login session (access + refresh tokens) is saved: encrypted with an AES key that lives in the
 * Android Keystore (iOS: Keychain), so the tokens are never stored as plain text on the phone.
 */
const secureStorage = {
  async getItem(key: string) {
    try {
      const saved = await Keychain.getGenericPassword({ service: key });
      if (saved) return saved.password;
      // Older versions saved the session as plain text: move it across once and delete the plain copy.
      const old = await AsyncStorage.getItem(key);
      if (old) {
        await secureStorage.setItem(key, old);
        await AsyncStorage.removeItem(key);
      }
      return old;
    } catch {
      return null; // key lost (e.g. phone restored from backup): the user simply signs in again
    }
  },
  async setItem(key: string, value: string) {
    await Keychain.setGenericPassword(key, value, { service: key, storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH });
  },
  async removeItem(key: string) {
    await Keychain.resetGenericPassword({ service: key });
  },
};

// supabase-js's own default name, written out so savedSession() can read it.
const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    storageKey: STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * The session saved on the phone, even when its access token has expired. Offline, supabase-js
 * retries an expired token for up to 30 s and then reports no session (while keeping it saved),
 * so the app opens with this one instead: the diary saved on the phone shows at once, and the
 * first request back online refreshes the token.
 */
export async function savedSession(): Promise<Session | null> {
  try {
    return JSON.parse((await secureStorage.getItem(STORAGE_KEY)) ?? 'null');
  } catch {
    return null;
  }
}
