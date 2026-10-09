// Writes the public copies of the Privacy Policy and Terms of Use from src/lib/legal.ts, as plain
// text (Supabase Storage shows .txt files in the browser; it won't serve HTML pages).
// Run: npm run legal, then upload docs/legal/*.txt to the public Supabase Storage bucket "legal".
import { mkdirSync, writeFileSync } from 'node:fs';
import { CONTACT_EMAIL, POLICY_DATE, POLICY_VERSION, PRIVACY, TERMS } from '../src/lib/legal.ts';

mkdirSync('docs/legal', { recursive: true });
for (const doc of [PRIVACY, TERMS]) {
  const title = `NutriScan ${doc.title}`;
  const sections = doc.sections.map((s) => `${s.heading}\n${'-'.repeat(s.heading.length)}\n${s.paragraphs.join('\n\n')}`);
  const text = [
    `${title}\n${'='.repeat(title.length)}`,
    `Last updated ${POLICY_DATE} (version ${POLICY_VERSION})`,
    ...sections,
    `Contact: ${CONTACT_EMAIL}`,
  ].join('\n\n');
  writeFileSync(`docs/legal/${doc.file}.txt`, `${text}\n`);
  console.log(`wrote docs/legal/${doc.file}.txt`);
}
