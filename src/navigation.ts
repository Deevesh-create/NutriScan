import { type NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Meal } from './lib/calories';
import type { FoodResult } from './lib/foods';
import type { LabelValues } from './lib/nutritionLabel';

/** A food already in the diary, as Today loads it. */
export interface DiaryEntry {
  id: string;
  meal: Meal;
  name: string;
  grams: number;
  kcal: number;
  barcode: string | null;
  source: string | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  sugars_g: number | null;
  fiber_g: number | null;
  salt_g: number | null;
}

/** `day` is a YYYY-MM-DD diary date; left out, it means today. */
export type TabParamList = {
  Today: { day?: string } | undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Setup: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  AddFood:
    | {
        day?: string;
        /** Editing this diary entry instead of adding a new one. */
        entry?: DiaryEntry;
        barcode?: string;
        meal?: Meal;
        food?: FoodResult;
        grams?: number;
        fromPhoto?: boolean;
        photoName?: string;
        /** Values read by the Scan label screen, merged into these params when it closes. */
        label?: LabelValues;
      }
    | undefined;
  Goals: undefined;
  Scan: { day?: string } | undefined;
  Snap: { day?: string } | undefined;
  Label: { day?: string } | undefined;
  Consent: undefined;
  Legal: { doc: 'privacy' | 'terms' };
  Faq: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;

/** Navigation for any screen, tabs included (tab screens bubble navigate() up to the stack). */
export const useRootNav = () => useNavigation<RootNav>();
