// Mauritian names for foods. No imports, so scripts/check-calories.mjs can test it in plain Node.
// Mauritius has no national food composition table, so these map local dishes to the closest
// dish the photo model and the food databases know.

/** Photo model label -> what people in Mauritius call it. */
const LOCAL_NAMES: Record<string, string> = {
  'Hyderabadi biryani': 'Briani',
  'Chow mein': 'Mine frite',
  'Shanghai fried noodles': 'Mine frite',
  'Fried rice': 'Riz frit',
  'Yangzhou fried rice': 'Riz frit',
  'Hokkien fried rice': 'Riz frit',
  Haleem: 'Halim',
  Samosa: 'Samoussa',
  Dumpling: 'Boulettes',
  Falooda: 'Alouda',
  'Chicken curry': 'Cari poulet',
  'Mutton curry': 'Cari mouton',
  'Fish head curry': 'Cari poisson',
  Octopus: 'Ourite',
  'Aloo paratha': 'Farata',
  'Mughlai paratha': 'Farata',
  'Dal makhani': 'Dholl',
  'Dal bhat': 'Dholl',
};

/** The Mauritian name for a photo model label, or the label itself. */
export const localName = (label: string) => LOCAL_NAMES[label] ?? label;

/** What people type -> what the USDA and Open Food Facts databases call it. */
const SEARCH_ALIASES: Record<string, string> = {
  briani: 'biryani',
  'mine frite': 'chow mein',
  'riz frit': 'fried rice',
  halim: 'haleem',
  samoussa: 'samosa',
  samoussas: 'samosa',
  boulettes: 'dumplings',
  alouda: 'falooda',
  'cari poulet': 'chicken curry',
  'cari mouton': 'mutton curry',
  'cari poisson': 'fish curry',
  ourite: 'octopus',
  farata: 'paratha',
  dholl: 'dal',
  achard: 'pickled vegetables',
};

// Every local name and its database equivalent, as whole words ("dholl", "briani", "biryani"…).
const MAURITIAN_WORDS = new RegExp(
  `\\b(${[...Object.values(LOCAL_NAMES), ...Object.keys(SEARCH_ALIASES), ...Object.values(SEARCH_ALIASES)]
    .map((w) => w.toLowerCase())
    .join('|')})\\b`,
);

/** True for dishes eaten in Mauritius, whether logged as "Briani" or as USDA's "Biryani with chicken". */
export const isMauritianDish = (name: string) => MAURITIAN_WORDS.test(name.toLowerCase());

/** The words to search the big databases with. `alias` is set when a Mauritian name was translated. */
export function searchTerm(query: string): { term: string; alias?: string } {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const alias = SEARCH_ALIASES[q];
  return alias ? { term: alias, alias } : { term: query.trim() };
}
