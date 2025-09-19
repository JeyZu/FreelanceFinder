import { looksLikeRate } from "./rate";
import { REMOTE_PATTERNS } from "./remote";

const LOCATION_KEYWORDS = [
  "paris",
  "lyon",
  "marseille",
  "toulouse",
  "bordeaux",
  "nantes",
  "lille",
  "rennes",
  "grenoble",
  "strasbourg",
  "montpellier",
  "nice",
  "sophia",
  "niort",
  "brest",
  "dijon",
  "tours",
  "angers",
  "rouen",
  "saint",
  "télétravail",
  "remote",
  "hybride",
  "france",
  "idf",
];

export function findLocation(metaTexts: string[], options: { includeRemote: boolean }): string | undefined {
  for (const text of metaTexts) {
    if (!text) continue;
    if (!options.includeRemote && REMOTE_PATTERNS.some((pattern) => pattern.test(text))) {
      continue;
    }
    if (looksLikeRate(text) || /dur[eé]e/i.test(text) || /d[eé]marrage/i.test(text) || /exp[eé]rience/i.test(text)) {
      continue;
    }
    const lower = text.toLowerCase();
    if (/freelance|cdi|cdd|stage|alternance|portage/.test(lower)) {
      continue;
    }
    if (LOCATION_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      return text;
    }
    if (/\d{5}/.test(text) && /[A-Za-z]/.test(text)) {
      return text;
    }
    const words = lower.split(/[,•-]/).map((part) => part.trim());
    for (const word of words) {
      if (word.length >= 3 && /^[a-zéèêàùâûç\s]+$/.test(word) && word.split(" ").length <= 3) {
        if (!looksLikeRate(word) && !/exp[eé]rience|dur[eé]e|d[eé]marrage/.test(word)) {
          return text;
        }
      }
    }
  }
  return undefined;
}
