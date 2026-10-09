import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import type { CameraPermission } from '../lib/useCameraPermission';
import { Button } from './Button';
import { colors, fonts, ui } from '../lib/theme';
import { t } from '../lib/i18n';

/** Explains why before the system prompt; if it was refused for good, sends the user to Settings. */
export function CameraAccess(props: { permission: CameraPermission; why: string; onAsk: () => void; onCancel: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.flex, ui.center, { paddingTop: insets.top }]}>
      <Ionicons name="camera-outline" size={56} color={colors.basil} />
      <Text style={ui.title}>{t('Camera access needed')}</Text>
      <Text style={[ui.body, styles.explain]}>{t(props.why)}</Text>
      <View style={styles.buttons}>
        {props.permission === 'blocked' ? (
          <Button title="Open settings" icon="settings-outline" onPress={() => Linking.openSettings()} />
        ) : (
          <Button title="Allow camera" icon="camera-outline" onPress={props.onAsk} />
        )}
        <Button title="Cancel" variant="secondary" onPress={props.onCancel} />
      </View>
    </View>
  );
}

/** Dark placeholder while VisionCamera is still finding the phone's cameras. */
export function CameraStarting() {
  return (
    <View style={[StyleSheet.absoluteFill, ui.center]}>
      <ActivityIndicator color={colors.white} />
      <Text style={styles.light}>{t('Starting camera…')}</Text>
    </View>
  );
}

/** Shown instead of the camera when it can't start (no camera, a broken emulator webcam, a library error). */
export function CameraUnavailable({ text }: { text: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, ui.center]}>
      <Ionicons name="videocam-off-outline" size={48} color={colors.white} />
      <Text style={[styles.light, styles.centered]}>{t(text)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  explain: { textAlign: 'center', color: colors.muted },
  centered: { textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 8, marginTop: 12 },
  light: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
