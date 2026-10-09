import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid } from 'react-native';

export type CameraPermission = 'checking' | 'granted' | 'ask' | 'blocked';

/**
 * Camera permission for the Scan and Snap screens. 'blocked' = refused with "don't ask again",
 * so the screen offers Open settings instead. Also reports whether the app is in the foreground,
 * so the camera only runs while it's visible.
 */
export function useCameraPermission() {
  const [permission, setPermission] = useState<CameraPermission>('checking');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  const check = useCallback(async () => {
    const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    setPermission((p) => (ok ? 'granted' : p === 'blocked' ? 'blocked' : 'ask'));
  }, []);

  useEffect(() => {
    check();
    // Coming back from the phone's Settings: check again.
    const sub = AppState.addEventListener('change', (s) => {
      setAppActive(s === 'active');
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const ask = async () => {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    setPermission(
      result === PermissionsAndroid.RESULTS.GRANTED
        ? 'granted'
        : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
          ? 'blocked'
          : 'ask',
    );
  };

  return { permission, ask, appActive };
}
