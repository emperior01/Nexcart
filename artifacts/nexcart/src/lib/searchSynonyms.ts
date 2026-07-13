// Synonym groups for search term expansion. Add more groups as you notice
// searches that should match but don't — no AI involved, just a lookup
// table so "pot" also finds products described as "cookware" even when
// the word "pot" never appears anywhere on the product.
const SYNONYM_GROUPS: string[][] = [
  ["pot", "pots", "cookware", "cooking pot", "saucepan", "kitchen set", "pan", "pans", "pot set"],
  ["phone", "phones", "smartphone", "smartphones", "mobile phone", "mobile", "android phone", "galaxy", "iphone", "cellphone"],
  ["tv", "television", "televisions", "smart tv"],
  ["shoes", "shoe", "sneakers", "sneaker", "footwear", "trainers", "trainer"],
  ["fridge", "refrigerator", "freezer"],
  ["laptop", "laptops", "notebook", "computer", "pc"],
  ["headphones", "earphones", "earbuds", "headset", "airpods"],
  ["watch", "watches", "smartwatch", "wristwatch"],
  ["bag", "bags", "handbag", "backpack", "purse"],
  ["blender", "mixer", "juicer"],
  ["oven", "microwave", "toaster"],
  ["chair", "chairs", "seat", "seating"],
  ["table", "tables", "desk"],
  ["speaker", "speakers", "bluetooth speaker"],
  ["camera", "cameras", "dslr", "digital camera"],
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

// Short/common connector words that shouldn't become individual ILIKE
// search terms — "and" is a substring of "brand", "handle", "android",
// "understand", etc., so using it as a bare keyword term accidentally
// matches huge swaths of an unrelated catalog. This came up for real with
// an image-search-generated query like "electric clothes iron white and
// grey", where the word "and" alone matched almost everything.
const STOPWORDS = new Set([
  "and", "or", "the", "a", "an", "is", "are", "was", "were", "in", "on",
  "at", "to", "of", "for", "with", "this", "that", "it", "its", "from",
  "by", "be", "as", "your", "my", "i", "you",
]);

function isUsableTerm(word: string): boolean {
  return word.length >= 3 && !STOPWORDS.has(word);
}

/** Strips characters that would break a PostgREST .or() filter string
 * (commas, parens, periods) so user input can't corrupt the query. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,().]/g, "").trim();
}

/** Expands a raw search query into a deduped list of search terms — the
 * original query, each individual word, and any known synonyms for those
 * words — so a search for "pot" also matches products only described as
 * "cookware" or "saucepan", even though "pot" never appears on them. */
export function expandSearchQuery(rawQuery: string): string[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const terms = new Set<string>([query]);
  const words = query.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (!isUsableTerm(word)) continue;
    terms.add(word);
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(word)) {
        for (const synonym of group) terms.add(synonym);
      }
    }
  }

  return Array.from(terms)
    .map(sanitizeSearchTerm)
    .filter(Boolean);
}
