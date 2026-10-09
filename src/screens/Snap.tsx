import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { useCameraPermission } from '../lib/useCameraPermission';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { preloadModel, recognise } from '../lib/foodRecognizer';
import { estimateDish } from '../lib/foodSearch';
import { localName } from '../lib/mauritian';
import type { Suggestion } from '../lib/classify';
import { Button } from '../components/Button';
import { CameraAccess, CameraStarting, CameraUnavailable } from '../components/CameraAccess';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ScannerLayout, ScanTip, cameraBroke, useTorch } from '../components/Scanner';
import { Chips } from '../components/Chips';
import { colors, fonts, radius, ui } from '../lib/theme';
import { cameraStyles } from './Scan';

const NO_CAMERA = "The camera couldn't start. Tap ✕ and search for the food instead.";

const PORTIONS = [
  { label: 'Small 150 g', value: 150 },
  { label: 'Medium 250 g', value: 250 },
  { label: 'Large 400 g', value: 400 },
];

/** Meal photo -> on-device model -> pick 1 of 3 dishes and a portion -> Add food, prefilled. */
export default function Snap({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Snap'>) {
  const day = route.params?.day; // the diary day the food goes to
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { permission, ask, appActive } = useCameraPermission();
  const device = useCameraDevice('back'); // undefined until VisionCamera has listed the cameras
  const photoOutput = usePhotoOutput();
  const [cameraFailed, setCameraFailed] = useState(false);
  const { torchMode, torch } = useTorch(device?.hasTorch);
  const [stage, setStage] = useState<'camera' | 'analysing' | 'pick' | 'estimating'>('camera');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState(0);
  const [grams, setGrams] = useState(250);

  useEffect(() => {
    preloadModel().catch(() => {});
  }, []);

  const snap = async () => {
    setStage('analysing');
    try {
      const photo = await photoOutput.capturePhoto({}, {});
      const image = await photo.toImageAsync();
      photo.dispose();
      setSuggestions(await recognise(image));
      setPicked(0);
      setStage('pick');
      haptic('success');
    } catch (e) {
      console.warn('Snap meal failed:', e instanceof Error ? e.message : e);
      haptic('error');
      setStage('camera');
      Alert.alert(t('Could not analyse the photo'), t('Try again, or tap ✕ and search for the food instead.'));
    }
  };

  const use = async () => {
    const dish = suggestions[picked].name; // the model's English name finds the best database match
    setStage('estimating');
    // Needs internet; offline, Add food asks the user for the nutrition instead.
    const food = await estimateDish(dish).catch(() => null);
    navigation.replace('AddFood', { day, food: food ?? undefined, grams, fromPhoto: true, photoName: localName(dish) });
  };

  if (permission === 'checking') return <View style={cameraStyles.camera} />;

  if (permission !== 'granted') {
    return (
      <View style={ui.screen}>
        <CameraAccess
          permission={permission}
          why="NutriScan uses the camera to recognise your meal. The photo is analysed on your phone and never uploaded."
          onAsk={ask}
          onCancel={() => navigation.goBack()}
        />
        <Pressable onPress={() => navigation.replace('AddFood', { day })} accessibilityRole="button" style={[cameraStyles.linkBox, { marginBottom: insets.bottom + 16 }]}>
          <Text style={cameraStyles.link}>{t('Enter food manually')}</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === 'pick' || stage === 'estimating') {
    const unsure = (suggestions[0]?.score ?? 0) < 0.2;
    return (
      <ScrollView style={[ui.screen, { marginTop: insets.top }]} contentContainerStyle={[ui.content, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={ui.title} accessibilityRole="header">
          {t('What did you eat?')}
        </Text>
        <View style={ui.card}>
          <Text style={ui.cardTitle}>{t('Best guesses')}</Text>
          <View style={ui.rule} />
          {unsure ? <Text style={ui.caption}>{t('Not sure about this one. Pick the closest, or enter it manually.')}</Text> : null}
          {suggestions.map((s, i) => (
            <Pressable
              key={s.name}
              onPress={() => setPicked(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked === i }}
              accessibilityLabel={`${localName(s.name)}, ${Math.round(s.score * 100)} percent`}
              style={[styles.option, picked === i && styles.optionOn]}
            >
              <Ionicons name={picked === i ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.basil} />
              <View style={ui.flex}>
                <Text style={ui.body}>{localName(s.name)}</Text>
                {localName(s.name) !== s.name ? <Text style={ui.caption}>{s.name}</Text> : null}
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(2, Math.round(s.score * 100))}%` }]} />
                </View>
              </View>
              <Text style={[ui.stat, styles.pct]}>{Math.round(s.score * 100)}%</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => navigation.replace('AddFood', { day })} accessibilityRole="button" style={cameraStyles.linkBox}>
            <Text style={cameraStyles.link}>{t('None of these → enter manually')}</Text>
          </Pressable>
        </View>

        <View style={ui.card}>
          <Text style={ui.heading}>{t('How much?')}</Text>
          <Chips options={PORTIONS} value={grams} onChange={setGrams} />
          <Text style={ui.caption}>{t('You can change the grams on the next screen.')}</Text>
        </View>

        <Button title="Use this" icon="checkmark" onPress={use} loading={stage === 'estimating'} />
        <Button title="Retake photo" icon="camera-outline" variant="secondary" onPress={() => setStage('camera')} />
      </ScrollView>
    );
  }

  return (
    <ScannerLayout
      mode="meal"
      day={day}
      frame={{ width: '78%', aspectRatio: 1 }}
      torch={torch}
      camera={
        cameraFailed ? (
          <CameraUnavailable text={NO_CAMERA} />
        ) : device ? (
          <ErrorBoundary fallback={() => <CameraUnavailable text={NO_CAMERA} />}>
            {/* Stays active while "Analysing…": switching it off mid-capture fails with "Camera is closed". */}
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
      overCamera={
        <View style={styles.bottom}>
          {stage === 'analysing' ? (
            <View style={styles.analysing}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.analysingText}>{t('Analysing…')}</Text>
            </View>
          ) : (
            <Pressable onPress={snap} accessibilityRole="button" accessibilityLabel={t('Take photo')} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </Pressable>
          )}
        </View>
      }
    >
      <ScanTip>Fit the whole plate in the frame, from above, in good light.</ScanTip>
      <Pressable onPress={() => navigation.replace('AddFood', { day })} accessibilityRole="button" style={cameraStyles.linkBox}>
        <Text style={cameraStyles.link}>{t('Search by name instead')}</Text>
      </Pressable>
    </ScannerLayout>
  );
}

const styles = StyleSheet.create({
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 16, alignItems: 'center' },
  analysingText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: radius.pill, backgroundColor: colors.white },
  analysing: { height: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionOn: { borderColor: colors.basil, backgroundColor: colors.basilSoft },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.line, marginTop: 4, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.basil },
  pct: { minWidth: 48, textAlign: 'right', fontFamily: fonts.bold },
});
