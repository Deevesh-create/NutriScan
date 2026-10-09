import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { Camera, CommonResolutions, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useCameraPermission } from '../lib/useCameraPermission';
import { readText } from '../lib/labelReader';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { type LabelValues, labelComplete, parseLabel } from '../lib/nutritionLabel';
import { Button } from '../components/Button';
import { CameraAccess, CameraStarting, CameraUnavailable } from '../components/CameraAccess';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ScannerLayout, cameraBroke, useTorch } from '../components/Scanner';
import { colors, fonts, ui } from '../lib/theme';
import { cameraStyles } from './Scan';

const NO_CAMERA = "The camera couldn't start. Tap Type it in instead.";
// The panel's rows, in the order a nutrition label lists them.
const ROWS = [
  { key: 'fat100', name: 'Fat' },
  { key: 'satFat100', name: 'of which saturates', sub: true },
  { key: 'carbs100', name: 'Carbohydrate' },
  { key: 'sugars100', name: 'of which sugars', sub: true },
  { key: 'fiber100', name: 'Fibre' },
  { key: 'protein100', name: 'Protein' },
  { key: 'salt100', name: 'Salt' },
] as const;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Point the camera at a nutrition table, like a barcode: a silent photo about every second is read
 * on the phone (ML Kit) and the panel fills in as values are found. Values from different photos are
 * combined, newest first. It stops once energy, fat, carbs and protein are found and add up.
 */
export default function Label({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Label'>) {
  const day = route.params?.day;
  const isFocused = useIsFocused();
  const { height } = useWindowDimensions();
  const { permission, ask, appActive } = useCameraPermission();
  const device = useCameraDevice('back');
  // Full HD is sharp enough for small label print and quick to read.
  const photoOutput = usePhotoOutput({ targetResolution: CommonResolutions.FHD_4_3, qualityPrioritization: 'speed' });
  const [cameraFailed, setCameraFailed] = useState(false);
  const { torchMode, torch } = useTorch(device?.hasTorch);
  const [values, setValues] = useState<LabelValues>({});
  const [done, setDone] = useState(false);
  const scanning = permission === 'granted' && !!device && !cameraFailed && isFocused && appActive && !done;

  /** Back to Add food (the one this came from, or a new one) with what was read. */
  const finish = (label?: LabelValues) => navigation.popTo('AddFood', { day, label }, { merge: true });

  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    let merged: LabelValues = {};
    (async () => {
      await wait(800); // let the camera start and focus
      while (!stopped) {
        try {
          const { filePath } = await photoOutput.capturePhotoToFile({ enableShutterSound: false }, {});
          const read = parseLabel(await readText(filePath));
          if (stopped) return;
          merged = { ...merged, ...read };
          setValues(merged);
          if (labelComplete(merged)) {
            haptic('success');
            return setDone(true);
          }
        } catch (e) {
          if (stopped) return; // left the screen or the app mid-photo: the camera cancels it, nothing wrong
          console.warn('Label scan:', e instanceof Error ? e.message : e);
          await wait(1000); // e.g. the camera isn't ready yet
        }
        await wait(300);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [scanning, photoOutput]);

  if (permission === 'checking') return <View style={cameraStyles.camera} />;

  if (permission !== 'granted') {
    return (
      <View style={ui.screen}>
        <CameraAccess
          permission={permission}
          why="NutriScan uses the camera to read the nutrition table on a pack. Each photo is read on your phone and deleted straight away."
          onAsk={ask}
          onCancel={() => navigation.goBack()}
        />
      </View>
    );
  }

  const anything = Object.keys(values).length > 0;
  const missing = done ? t('not read') : '–';

  return (
    <ScannerLayout
      mode="label"
      day={day}
      frame={{ width: '86%', height: '80%' }}
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
              outputs={[photoOutput]}
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
      <View style={styles.titleRow}>
        <Text style={[ui.cardTitle, ui.flex]} accessibilityRole="header">
          {t('Per 100 g')}
        </Text>
        {done ? (
          <View style={styles.status} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark" size={18} color={colors.basil} />
            <Text style={styles.statusText}>{t('Read. Check against the pack')}</Text>
          </View>
        ) : (
          <View style={styles.status}>
            <ActivityIndicator size="small" color={colors.basil} />
            <Text style={styles.statusText}>{t('Fill the frame with the table')}</Text>
          </View>
        )}
      </View>

      <ScrollView style={{ maxHeight: height * 0.34 }}>
        <PanelRow name="Serving size" value={values.servingG != null ? `${values.servingG} g` : missing} found={values.servingG != null} />
        <View style={styles.heavy} />
        <View style={styles.energy}>
          <Text style={styles.energyText}>{t('Energy')}</Text>
          <Text style={[styles.energyText, values.kcal100 == null && styles.missing]}>
            {values.kcal100 != null ? `${Math.round(values.kcal100)} kcal` : missing}
          </Text>
        </View>
        <View style={styles.medium} />
        {ROWS.map((r) => (
          <PanelRow
            key={r.key}
            name={r.name}
            sub={'sub' in r}
            value={values[r.key] != null ? `${values[r.key]} g` : missing}
            found={values[r.key] != null}
          />
        ))}
      </ScrollView>

      <Button
        title={done ? 'Use these values' : 'Use what was found'}
        icon="checkmark"
        variant={done ? 'primary' : 'secondary'}
        disabled={!anything}
        onPress={() => finish(values)}
      />
      <Pressable onPress={() => finish()} accessibilityRole="button" style={cameraStyles.linkBox}>
        <Text style={cameraStyles.link}>{t('Type it in instead')}</Text>
      </Pressable>
    </ScannerLayout>
  );
}

function PanelRow({ name, value, found, sub }: { name: string; value: string; found: boolean; sub?: boolean }) {
  return (
    <View style={[styles.row, sub && styles.subRow]} accessible accessibilityLabel={`${t(name)}: ${value}`}>
      <Text style={[styles.rowName, sub && styles.subName]}>{t(name)}</Text>
      <Text style={[styles.rowValue, !found && styles.missing]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  statusText: { fontFamily: fonts.bold, fontSize: 13, color: colors.basil, flexShrink: 1 },
  heavy: { height: 6, backgroundColor: colors.ink },
  medium: { height: 3, backgroundColor: colors.ink },
  energy: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 6 },
  energyText: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 30, color: colors.ink, fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  subRow: { paddingLeft: 16 },
  rowName: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink, flexShrink: 1 },
  subName: { fontFamily: fonts.regular },
  rowValue: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  missing: { color: colors.muted },
});
