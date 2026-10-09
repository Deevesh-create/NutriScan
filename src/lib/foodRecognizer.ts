import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';
import type { Image } from 'react-native-nitro-image';
import { type Suggestion, toRgb, topSuggestions } from './classify';
import labels from './foodLabels.json';

// Google AIY food_V1: 2,023 dishes + background, runs on the phone, no network.
let modelPromise: Promise<TfliteModel> | undefined;
const getModel = () =>
  (modelPromise ??= loadTensorflowModel(require('../../assets/models/food_v1.tflite'), []).then((m) => {
    const t = (x: { dataType: string; shape: number[] }) => `${x.dataType}[${x.shape.join(',')}]`;
    console.log(`Food model loaded: input ${t(m.inputs[0])}, output ${t(m.outputs[0])}`);
    return m;
  }));

/** Starts loading the model early, so the first photo isn't slowed down by it. */
export const preloadModel = () => getModel().then(() => undefined);

/** Centre-square crop -> model input size -> RGB -> top 3 dishes. */
export async function recognise(image: Image): Promise<Suggestion[]> {
  const model = await getModel();
  const input = model.inputs[0]; // e.g. shape [1, 224, 224, 3]
  const [, h, w] = input.shape;

  // ponytail: ignores the photo's orientation; food looks much the same rotated, rotate first if accuracy suffers.
  const side = Math.min(image.width, image.height);
  const x = Math.floor((image.width - side) / 2);
  const y = Math.floor((image.height - side) / 2);
  const square = await image.cropAsync(x, y, x + side, y + side);
  const small = await square.resizeAsync(w, h);
  const raw = await small.toRawPixelDataAsync();

  const rgb = toRgb(new Uint8Array(raw.buffer), raw.pixelFormat, w, h);
  const tensor = input.dataType === 'float32' ? Float32Array.from(rgb, (v) => v / 255) : rgb;

  const [out] = await model.run([tensor.buffer as ArrayBuffer]);
  const float = model.outputs[0].dataType === 'float32';
  return topSuggestions(float ? new Float32Array(out) : new Uint8Array(out), labels, float ? 1 : 255);
}
