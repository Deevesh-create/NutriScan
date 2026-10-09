import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radius } from '../lib/theme';

const BRAND = '#1C7247'; // the mark keeps its own colours in dark mode too

/** The app mark: a three-quarter calorie ring on basil. */
export function Logo({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 44 44">
        <Circle cx={22} cy={22} r={15} fill="none" stroke="#2E8A5C" strokeWidth={6} />
        <Path d="M22 7 A15 15 0 1 1 7 22" fill="none" stroke={colors.white} strokeWidth={6} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
});
