import { NativeModules } from 'react-native';

/**
 * A short vibration (android/app/.../HapticsModule.kt): `tick` for small actions (water, tabs),
 * `success` when something is read or saved, `error` when something is refused. Does nothing where
 * the module isn't available (iOS).
 */
export const haptic = (kind: 'tick' | 'success' | 'error') => NativeModules.Haptics?.play(kind);
