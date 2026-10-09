// Help and FAQ (screens/Faq.tsx). English is the key; French and Kreol are in translations.ts.
// No imports, so scripts/check-translations.mjs can read it in plain Node.

export const FAQ: [question: string, answer: string][] = [
  [
    'How is my daily calorie target worked out?',
    'From your sex, age, height, weight and activity level (the Mifflin-St Jeor equation), minus the deficit for the weekly loss you chose: about 7,700 kcal per kg. It never goes below 1,200 kcal a day for women or 1,500 kcal for men.',
  ],
  [
    'What are the ways to add food?',
    'Scan a barcode, scan the nutrition label, take a photo of your meal, search by name (Mauritian dishes included), tap ＋ on a recent food, or type the values in yourself.',
  ],
  [
    'A barcode was not found. What now?',
    "Scan the product's nutrition label, or type the values from the pack. The product is then shared, without your name, so the next NutriScan user who scans it finds it straight away.",
  ],
  [
    'How accurate is the meal photo?',
    'The AI on your phone suggests the 3 most likely dishes. Pick the right one and set how much you ate. A photo only gives an estimate, so check the numbers when it matters.',
  ],
  [
    'Does NutriScan work without internet?',
    'Yes. Your diary stays readable, and foods you add are saved on the phone and sent when you are back online. Reading labels and recognising meals work offline; searching and barcode lookups need a connection.',
  ],
  [
    'Where do my steps come from?',
    "NutriScan counts your steps with the phone's step sensor, from the first time you open it each day, so open it in the morning. If Samsung Health shares its steps with Health Connect, NutriScan shows its whole-day count instead. Steps are only shown for information: they are not added to your target.",
  ],
  [
    'Why did my target change when I logged my weight?',
    'Your target is worked out from your weight, so it is updated each time you log a new one.',
  ],
  [
    'Are my photos uploaded?',
    'No. Meal photos are analysed on your phone and never leave it. Nutrition-label photos are read on your phone and deleted straight away.',
  ],
  [
    'Who can see my diary?',
    'Only you. The database itself stops anyone else from seeing your diary, goal and weights. Products you share show no name.',
  ],
  [
    "I don't get the meal reminders.",
    'Check that notifications are allowed for NutriScan. On Samsung phones, also set Settings > Apps > NutriScan > Battery to Unrestricted.',
  ],
  [
    'How does the fingerprint lock work?',
    'When it is on, NutriScan asks for your fingerprint when you open it, and again after 30 seconds in the background. Android checks your fingerprint: NutriScan never sees it.',
  ],
  [
    'How do I delete my data?',
    'Settings > Delete my account and data, then type your password to confirm. Your account, goal, weights and diary are deleted for good.',
  ],
];
