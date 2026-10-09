import { z } from 'zod';
import { MEALS } from './calories';

/** Trims free text and strips control characters and angle brackets before it is stored. */
const cleanText = (max: number) =>
  z
    .string()
    .trim()
    // eslint-disable-next-line no-control-regex
    .transform((s) => s.replace(/[<>\u0000-\u001F\u007F]/g, ''))
    .pipe(z.string().min(1, 'Required').max(max, `Max ${max} characters`));

/** Text-field number with a readable range message. */
const num = (min: number, max: number, label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .min(min, `${label}: ${min} to ${max}`)
    .max(max, `${label}: ${min} to ${max}`);

/** A number field that may be left empty. */
const optional = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v == null || String(v).trim() === '' ? undefined : v), schema.optional());

const email = z.string().trim().toLowerCase().email('Enter a valid email');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

// Two separate ticks: agreeing to the terms, and explicit consent for health data (it can't be bundled in).
const consentFields = {
  terms: z.literal(true, { errorMap: () => ({ message: 'Tick to agree to the Terms and Privacy Policy' }) }),
  health: z.literal(true, { errorMap: () => ({ message: 'NutriScan needs this to work out your calorie target' }) }),
};

export const consentSchema = z.object(consentFields);

export const registerSchema = z
  .object({
    ...consentFields,
    email,
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Include a letter')
      .regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((f) => f.password === f.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export const goalsSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: num(13, 100, 'Age').int('Age must be a whole number'),
  heightCm: num(100, 250, 'Height'),
  weightKg: num(30, 300, 'Weight'),
  activity: z.number().min(1.2).max(1.9),
  weeklyLossKg: z.number().min(0).max(1),
});

export const weightSchema = z.object({ weightKg: num(30, 300, 'Weight') });

export const foodSchema = z.object({
  name: cleanText(120),
  meal: z.enum(MEALS),
  barcode: z.string().regex(/^\d{6,14}$/).optional(),
  kcal100: num(0, 900, 'Calories'),
  protein100: num(0, 100, 'Protein'),
  carbs100: num(0, 100, 'Carbs'),
  fat100: num(0, 100, 'Fat'),
  // Optional: an empty field means "not known" and is saved as nothing, not 0.
  satFat100: optional(num(0, 100, 'Sat. fat')),
  sugars100: optional(num(0, 100, 'Sugars')),
  fiber100: optional(num(0, 100, 'Fibre')),
  salt100: optional(num(0, 100, 'Salt')),
  grams: num(1, 2000, 'Amount'),
});

/** First error message per field, for showing under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.message;
  }
  return out;
}
