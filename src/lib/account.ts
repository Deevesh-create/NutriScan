import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLock } from '../contexts/AuthContext';
import { disableReminders } from './reminders';
import { supabase } from './supabase';

/**
 * Deletes the signed-in user's account (components/DeleteAccount.tsx). The password is checked
 * again first; the database function then deletes the login, and the goal, weights and diary go
 * with it (on delete cascade). Returns an error message to show, or null when done.
 */
export async function deleteAccount(email: string, password: string): Promise<string | null> {
  const check = await supabase.auth.signInWithPassword({ email, password });
  if (check.error) return check.error.code === 'invalid_credentials' ? 'Wrong password' : check.error.message;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return error.message;
  // Nothing of this user stays on the phone either: reminders, lock, offline copies, session.
  await Promise.allSettled([disableReminders(), appLock.turnOff(), AsyncStorage.clear()]);
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}
