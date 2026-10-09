import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { type Barcode, type TargetBarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useCameraPermission } from '../lib/useCameraPermission';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { Button } from '../components/Button';
import { CameraAccess, CameraStarting, CameraUnavailable } from '../components/CameraAccess';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ScannerLayout, ScanTip, cameraBroke, useTorch } from '../components/Scanner';
import { colors, fonts, radius, ui } from '../lib/theme';

const BARCODE = /^\d{6,14}$/;
// Outside the component on purpose: the scanner restarts the camera whenever this array changes.
const FORMATS: TargetBarcodeFormat[] = ['ean-13', 'ean-8', 'upc-a', 'upc-e'];
const NO_CAMERA = "The camera couldn't start. Tap Type in barcode instead.";

export default function Scan({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Scan'>) {
  const day = route.params?.day; // the diary day the food goes to
  const isFocused = useIsFocused();
  const { permission, ask, appActive } = useCameraPermission();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string>();
  const [cameraFailed, setCameraFailed] = useState(false);
  const handled = useRef(false);
  // Undefined until VisionCamera has listed the phone's cameras, a moment after the screen opens.
  const device = useCameraDevice('back');
  const { torchMode, torch } = useTorch(device?.hasTorch);

  const open = (barcode: string) => navigation.replace('AddFood', { barcode, day });

  const onScanned = (barcodes: Barcode[]) => {
    // The scanner reports the same code many times a second; act on the first valid one only.
    const code = barcodes.map((b) => b.rawValue).find((v): v is string => !!v && BARCODE.test(v));
    if (handled.current || !code) return;
    handled.current = true;
    haptic('success');
    open(code);
  };

  // Built from VisionCamera's parts rather than its <CodeScanner>, which throws (closing the app)
  // when it draws before the camera list has loaded.
  const scanner = useBarcodeScannerOutput({
    barcodeFormats: FORMATS,
    onBarcodeScanned: onScanned,
    onError: (e) => console.warn('Barcode scanner:', e.message),
  });

  const lookUp = () => {
    const code = typed.trim();
    if (!BARCODE.test(code)) {
      haptic('error');
      return setTypedError('A barcode is 6 to 14 digits');
    }
    open(code);
  };

  // Typing the number works without the camera too, so it shows on the permission screen as well.
  const typeBox = (
    <View style={styles.typeBox}>
      <Text style={ui.label}>{t('Barcode number')}</Text>
      <View style={styles.typeRow}>
        <TextInput
          value={typed}
          onChangeText={(t) => {
            setTyped(t.replace(/\D/g, ''));
            setTypedError(undefined);
          }}
          onSubmitEditing={lookUp}
          keyboardType="number-pad"
          maxLength={14}
          autoFocus={typing}
          placeholder={t('e.g. 5201054017364')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('Barcode number')}
          style={[styles.input, typedError ? styles.inputError : null]}
        />
        <Button title="Look up" onPress={lookUp} />
      </View>
      {typedError ? <Text style={styles.error}>{t(typedError)}</Text> : null}
    </View>
  );

  const searchLink = (
    <Pressable onPress={() => navigation.replace('AddFood', { day })} accessibilityRole="button" style={cameraStyles.linkBox}>
      <Text style={cameraStyles.link}>{t('Search by name instead')}</Text>
    </Pressable>
  );

  if (permission === 'checking') return <View style={cameraStyles.camera} />;

  if (permission !== 'granted') {
    return (
      <KeyboardAvoidingView style={ui.screen} behavior="padding">
        <CameraAccess
          permission={permission}
          why="NutriScan uses the camera only to read food barcodes. Nothing is recorded or uploaded."
          onAsk={ask}
          onCancel={() => navigation.goBack()}
        />
        <View style={styles.permissionSheet}>
          {typeBox}
          {searchLink}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={ui.flex} behavior="padding">
      <ScannerLayout
        mode="barcode"
        day={day}
        frame={{ width: '80%', height: 180 }}
        torch={torch}
        camera={
          cameraFailed ? (
            <CameraUnavailable text={NO_CAMERA} />
          ) : device ? (
            <ErrorBoundary fallback={() => <CameraUnavailable text={NO_CAMERA} />}>
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused && appActive}
                outputs={[scanner]}
                torchMode={torchMode}
                onError={(e) => {
                  console.warn('Camera:', e.message);
                  if (cameraBroke(e)) setCameraFailed(true);
                }}
              />
            </ErrorBoundary>
          ) : (
            <CameraStarting />
          )
        }
      >
        {typing ? (
          typeBox
        ) : (
          <>
            <ScanTip>Hold the phone about 16 cm away. Avoid glare and shadows.</ScanTip>
            <Button title="Type in barcode" icon="keypad-outline" variant="secondary" onPress={() => setTyping(true)} />
          </>
        )}
        {searchLink}
      </ScannerLayout>
    </KeyboardAvoidingView>
  );
}

export const cameraStyles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#0E1511' },
  linkBox: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  link: { fontFamily: fonts.bold, fontSize: 16, color: colors.basil },
});

const styles = StyleSheet.create({
  permissionSheet: { backgroundColor: colors.card, padding: 16, gap: 8 },
  typeBox: { gap: 6 },
  typeRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.tomato, borderWidth: 2 },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.tomato },
});
