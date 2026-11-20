import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { DiaryEntry } from '../navigation';

/** Supabase answers with status 0 when the request never reached the server: no internet. */
export const isOffline = (res: { status: number }) => res.status === 0;

/**
 * The last copy of your goal, a diary day or the week loaded online, kept on the phone so the app
 * still shows them offline. Keys start with `cache-<user id>-` so sign-out can remove them.
 */
export const cacheKey = (userId: string, what: string) => `cache-${userId}-${what}`;

export async function loadCached<T>(key: string): Promise<T | null> {
  try {
    const saved = await AsyncStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export const saveCached = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

/** A food added while offline, waiting to be sent to Supabase. */
export type PendingRow = Omit<DiaryEntry, 'id'> & { eaten_on: string };

const queueKey = (userId: string) => `pending-${userId}`;
const queue = async (userId: string) => (await loadCached<PendingRow[]>(queueKey(userId))) ?? [];

/** Keeps a food on the phone until it can be sent. Throws if the phone can't store it. */
export async function queueEntry(userId: string, row: PendingRow) {
  const list = await queue(userId);
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify([...list, row]));
}

/** One day's foods that are still waiting to be sent, shaped like diary entries. */
export async function pendingFor(userId: string, day: string): Promise<DiaryEntry[]> {
  return (await queue(userId))
    .map((r, i) => ({ ...r, id: `pending-${i}`, source: 'pending' }))
    .filter((r) => r.eaten_on === day);
}

let syncing: Promise<void> | null = null;

/**
 * Sends foods added offline, oldest first, stopping at the first failure so the rest wait for next
 * time. Called before the diary loads, so sent foods come back in the normal list.
 * Limitation: a lost reply after a successful insert means it is sent twice; add a client-made id if that shows up.
 */
export function syncPending(userId: string): Promise<void> {
  syncing ??= (async () => {
    let sent = 0;
    for (const row of await queue(userId)) {
      const { error } = await supabase.from('food_entries').insert(row);
      if (error) break;
      sent++;
    }
    // Read the queue again: a food may have been added to it while these were being sent.
    if (sent) await AsyncStorage.setItem(queueKey(userId), JSON.stringify((await queue(userId)).slice(sent)));
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
