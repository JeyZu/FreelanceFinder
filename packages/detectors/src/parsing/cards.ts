import { normalizeText, truncate } from "../normalize/text";

export function splitSegments(text: string): string[] {
  return text
    .split(/\n|•|\||,|;|\u2022/)
    .map((segment) => normalizeText(segment))
    .filter((segment) => Boolean(segment));
}

export function buildCardSnippet(card: Element, title: string): string {
  const text = normalizeText(card.textContent);
  if (!text) return "";
  const cleaned = text.replace(title, "").trim();
  const snippet = cleaned.length > 0 ? cleaned : text;
  return truncate(snippet, 320);
}
