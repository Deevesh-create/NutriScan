// Pure helpers for meal recognition. No imports, so scripts/check-calories.mjs can test them in plain Node.

export interface Suggestion {
  name: string;
  score: number; // 0..1
}

// Byte offsets of red, green and blue, and bytes per pixel, for each pixel layout the camera can give.
const LAYOUTS: Record<string, [number, number, number, number]> = {
  RGBA: [0, 1, 2, 4],
  RGBX: [0, 1, 2, 4],
  BGRA: [2, 1, 0, 4],
  BGRX: [2, 1, 0, 4],
  ARGB: [1, 2, 3, 4],
  XRGB: [1, 2, 3, 4],
  ABGR: [3, 2, 1, 4],
  XBGR: [3, 2, 1, 4],
  RGB: [0, 1, 2, 3],
  BGR: [2, 1, 0, 3],
};

/** Raw camera pixels (any layout, rows possibly padded) to tightly packed RGB, which the model expects. */
export function toRgb(bytes: Uint8Array, format: string, width: number, height: number): Uint8Array {
  const layout = LAYOUTS[format];
  if (!layout) throw new Error(`Unsupported pixel format ${format}`);
  const [r, g, b, bpp] = layout;
  const stride = bytes.length / height; // >= width * bpp when rows are padded
  const rgb = new Uint8Array(width * height * 3);
  let j = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0, i = y * stride; x < width; x++, i += bpp) {
      rgb[j++] = bytes[i + r];
      rgb[j++] = bytes[i + g];
      rgb[j++] = bytes[i + b];
    }
  }
  return rgb;
}

/**
 * The 3 most likely dishes. Index 0 is the model's "background" class, so it is skipped.
 * scale: 255 for a quantized (uint8) model, 1 for a float model that already scores 0..1.
 */
export function topSuggestions(scores: ArrayLike<number>, labels: string[], scale = 1, count = 3): Suggestion[] {
  return Array.from(scores, (score, i) => ({ name: labels[i], score: score / scale }))
    .slice(1)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/** Middle value, so one odd product doesn't skew a calorie estimate. Null for an empty list. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
