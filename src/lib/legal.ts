// NutriScan's Privacy Policy and Terms of Use: shown in the app (screens/Legal.tsx) and written to
// plain-text files for the public copies by `npm run legal` (scripts/legal-txt.mjs). One source, so
// the two never differ. No imports, so the script can read it in plain Node.

/** Change this whenever the wording changes: every user is then asked to agree again (screens/Consent.tsx). */
export const POLICY_VERSION = '2026-10-10';
export const POLICY_DATE = '10 October 2026';
export const CONTACT_EMAIL = 'deeveshrughoo24@gmail.com';

export interface LegalDoc {
  title: string;
  file: string; // public copy: <file>.txt in the Supabase Storage bucket "legal"
  sections: { heading: string; paragraphs: string[] }[];
}

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  file: 'privacy-policy',
  sections: [
    {
      heading: 'Who we are',
      paragraphs: [
        'NutriScan is a calorie-tracking app built as a student project for a university Mobile Application Development module. The developer is responsible for your data and can be contacted at ' +
          CONTACT_EMAIL +
          '.',
        'NutriScan has no adverts, no analytics or tracking tools, and never sells or rents your data.',
      ],
    },
    {
      heading: 'What we store about you',
      paragraphs: [
        'Account: your email address. Your password is stored only as a secure hash by our login provider, Supabase; nobody can read it.',
        'Health information: your sex, age, height, weight, activity level and weekly goal (used to work out your calorie target), the weights you log (for your weight chart), the glasses of water you log, and your food diary (foods, amounts, calories, protein, carbs, fat, saturated fat, sugars, fibre, salt, the date and meal, and how each food was added). This is health data, so we only store it with your explicit consent, which you give when you create your account.',
        "Steps: if you allow it, NutriScan counts your steps with your phone's step sensor, and it can also read your daily step count from Health Connect (for example from Samsung Health). Steps are only used to show them with an estimate of calories burned: they stay on your phone and are never uploaded. You can stop this at any time in your phone's settings or in the Health Connect app.",
        'Your consent: which version of this policy you agreed to, and when.',
        'Products you share: when a barcode is not in any food database and you type in its label, the barcode, name and nutrition values are saved to a list shared with all NutriScan users. It is stored with your account ID, which is removed if you delete your account. Your email is never shown with it.',
      ],
    },
    {
      heading: 'What stays on your phone',
      paragraphs: [
        'Meal photos are analysed by an AI model on your phone and are never uploaded or saved. Nutrition-label photos are read on your phone by Google ML Kit and deleted straight away.',
        'Your login session is stored encrypted, with the key kept in the Android Keystore. The fingerprint lock is handled by Android: NutriScan never sees your fingerprint.',
        'So the app works without internet, a copy of your goal, your weights and the diary days you have opened is kept on the phone. It is deleted when you sign out. Your language choice is also kept on the phone.',
        'Meal reminders are scheduled on the phone itself.',
      ],
    },
    {
      heading: 'Who else receives data',
      paragraphs: [
        'Supabase (supabase.com) hosts our database and login service. Your account and diary are stored on its cloud servers, which may be outside Mauritius, and are encrypted in transit (HTTPS) and at rest.',
        'When you scan a barcode or search for a food, the barcode number or your search words are sent to Open Food Facts, a non-profit food database, and to USDA FoodData Central (US Department of Agriculture). USDA is reached through our own server, so it never sees your phone or account. Neither receives your name, email or diary.',
        'Google ML Kit, which reads barcodes and labels on your phone, may send Google anonymous technical information, such as your phone model and how well the feature worked. It never sends your photos.',
      ],
    },
    {
      heading: 'How long we keep it',
      paragraphs: [
        'Until you delete your account. Settings > Delete my account and data permanently removes your account, goal and diary from our servers, and clears everything NutriScan stored on your phone.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'Under the Mauritius Data Protection Act 2017 (and the GDPR, if you are in the EU) you can see, correct and delete your data, and withdraw your consent at any time. You can see and edit everything in the app; withdrawing consent means deleting your account, since NutriScan cannot work without your health information.',
        'For anything else, email ' +
          CONTACT_EMAIL +
          '. If you are not happy with our answer, you can complain to the Data Protection Office of Mauritius (dataprotection.govmu.org).',
      ],
    },
    {
      heading: 'How we protect it',
      paragraphs: [
        'Each user can only ever read and change their own diary and goal: the database itself enforces this (Row Level Security). All traffic uses HTTPS, your login session is encrypted on the phone, the app can be locked with your fingerprint, phone backups do not include NutriScan data, and the app never asks for your microphone, location or contacts.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        'NutriScan is not designed for children. If you are under 16, ask a parent or guardian before using it.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'If this policy changes, NutriScan shows you the new version and asks you to agree again before you can continue.',
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Terms of Use',
  file: 'terms',
  sections: [
    {
      heading: 'About NutriScan',
      paragraphs: [
        'NutriScan is a free student project. By creating an account you agree to these terms. We may change or stop the app at any time.',
      ],
    },
    {
      heading: 'Not medical advice',
      paragraphs: [
        'Calorie targets are estimates worked out with the Mifflin-St Jeor equation, and NutriScan never sets a target below 1,200 kcal a day for women or 1,500 kcal for men. They are not medical advice.',
        'Talk to a doctor before dieting if you are pregnant or breastfeeding, under 18, have a medical condition, or have ever had an eating disorder.',
      ],
    },
    {
      heading: 'Food information can be wrong',
      paragraphs: [
        'Food data comes from Open Food Facts (available under the Open Database Licence), USDA FoodData Central (public domain) and NutriScan users. Meal photos are recognised by an AI model, and labels are read automatically. Any of these can be wrong: check the numbers against the pack when it matters.',
      ],
    },
    {
      heading: 'Your account',
      paragraphs: [
        'Use your own email, keep your password safe, and do not share your account. You are responsible for what is done with it.',
      ],
    },
    {
      heading: 'Products you share',
      paragraphs: [
        'When you add a product that no database knows, it is shared with all NutriScan users. Copy the label honestly, and do not add misleading or offensive text. We may remove any shared product.',
      ],
    },
    {
      heading: 'Fair use',
      paragraphs: [
        "Do not try to access other users' data, attack or overload the service, or copy the food databases through the app.",
      ],
    },
    {
      heading: 'Ending your account',
      paragraphs: [
        'You can delete your account at any time in Settings. We may suspend accounts that break these terms.',
      ],
    },
    {
      heading: 'No guarantee',
      paragraphs: [
        'NutriScan is provided "as is", without any guarantee that it is accurate or always available. As far as the law allows, we are not responsible for decisions you make based on its estimates.',
      ],
    },
    {
      heading: 'Law and contact',
      paragraphs: ['These terms are governed by the laws of Mauritius. Questions: ' + CONTACT_EMAIL + '.'],
    },
  ],
};

/** True when this signed-in user has agreed to the current Terms and given health-data consent. */
export const hasConsented = (metadata: Record<string, any> | undefined) => metadata?.consent?.version === POLICY_VERSION;

/** What is saved on the user's Supabase account when they agree (auth user metadata). */
export const consentRecord = () => ({ consent: { version: POLICY_VERSION, at: new Date().toISOString(), terms: true, health: true } });
