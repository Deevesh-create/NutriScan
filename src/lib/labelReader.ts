import { NativeModules } from 'react-native';
import type { OcrLine } from './nutritionLabel';

/**
 * Lines of text in a photo, read on the phone by Google ML Kit (android/app/.../LabelReaderModule.kt).
 * The photo file is deleted once read. Android only.
 */
export const readText = (filePath: string): Promise<OcrLine[]> => NativeModules.LabelReader.read(filePath);
