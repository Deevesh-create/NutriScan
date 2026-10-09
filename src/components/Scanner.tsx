import { useState } from 'react';
import { type DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useRootNav } from '../navigation';
import { haptic } from '../lib/haptics';
import { t } from '../lib/i18n';
import { colors, fonts, radius } from '../lib/theme';

export type ScanMode = 'meal' | 'barcode' | 'label';

/**
 * The flash for a scanner screen. Left unset until first tapped: VisionCamera applies it as soon as
 * the screen opens, and on phones with a flash that fails while the camera is still starting.
 */
export function useTorch(hasTorch: boolean | undefined) {
  const [torchMode, setTorchMode] = useState<'on' | 'off'>();
  const toggle = () => {
    haptic('tick');
    setTorchMode((m) => (m === 'on' ? 'off' : 'on'));
  };
  const torch = hasTorch ? { on: torchMode === 'on', toggle } : undefined;
  return { torchMode, torch };
}

/** A flash error leaves the picture working, so only other errors mean the camera failed. */
export const cameraBroke = (e: Error) => !/torch/i.test(e.message);

const MODES = [
  { mode: 'meal', name: 'Meal', screen: 'Snap' },
  { mode: 'barcode', name: 'Barcode', screen: 'Scan' },
  { mode: 'label', name: 'Label', screen: 'Label' },
] as const;

/**
 * The camera frame the three scanners share (Snap = meal, Scan = barcode, Label): close and flash
 * buttons, corner brackets, Meal | Barcode | Label tabs, and a sheet below for each mode's controls.
 * Switching tabs swaps the screen, keeping the diary day.
 */
export function ScannerLayout(props: {
  mode: ScanMode;
  day?: string;
  camera: React.ReactNode;
  frame: { width: DimensionValue; height?: DimensionValue; aspectRatio?: number };
  /** Only when the camera has a flash. */
  torch?: { on: boolean; toggle: () => void };
  /** Drawn over the bottom of the camera picture, e.g. the shutter button. */
  overCamera?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const navigation = useRootNav();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.cameraArea}>
        {props.camera}
        <View style={styles.overlay} pointerEvents="none">
          <View style={props.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        <RoundButton icon="close" label={t('Close camera')} onPress={() => navigation.goBack()} style={{ top: insets.top + 12, left: 16 }} />
        {props.torch ? (
          <RoundButton
            icon={props.torch.on ? 'flash' : 'flash-off'}
            label={t(props.torch.on ? 'Turn the flash off' : 'Turn the flash on')}
            onPress={props.torch.toggle}
            style={{ top: insets.top + 12, right: 16 }}
          />
        ) : null}
        {props.overCamera}
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {MODES.map((m) => {
            const on = m.mode === props.mode;
            return (
              <Pressable
                key={m.mode}
                onPress={() => {
                  if (on) return;
                  haptic('tick');
                  navigation.replace(m.screen, { day: props.day });
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t(m.name)}</Text>
              </Pressable>
            );
          })}
        </View>
        {props.children}
      </View>
    </View>
  );
}

function RoundButton(props: { icon: 'close' | 'flash' | 'flash-off'; label: string; onPress: () => void; style: object }) {
  return (
    <Pressable onPress={props.onPress} accessibilityRole="button" accessibilityLabel={props.label} style={[styles.round, props.style]}>
      <Ionicons name={props.icon} size={26} color={colors.white} />
    </Pressable>
  );
}

/** Short advice under the tabs, e.g. "Hold about 16 cm away". */
export function ScanTip({ children }: { children: string }) {
  return <Text style={styles.tip}>{t(children)}</Text>;
}

const CORNER = 36;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E1511' },
  cameraArea: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.white },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  round: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: 16,
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.basil },
  tabText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  tabTextOn: { color: colors.onAccent },
  tip: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
});
