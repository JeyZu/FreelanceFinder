import { normalizeText, truncate } from "../normalize/text";

export function extractDescription(main: Element | Document): string | undefined {
  const container = main instanceof Document ? main.body : main;
  if (!container) return undefined;

  const candidates = Array.from(container.querySelectorAll("article, section, div"));
  let bestText = "";
  let bestScore = 0;

  for (const candidate of candidates) {
    const text = normalizeText(candidate.textContent);
    if (text.length < 80) continue;

    const className = candidate.getAttribute("class")?.toLowerCase() ?? "";
    const dataSection = candidate.getAttribute("data-section")?.toLowerCase() ?? "";

    let score = text.length;
    if (/description|mission|detail|content|job-body|presentation/.test(className + dataSection)) {
      score += 250;
    }
    if (candidate.querySelector("p")) {
      score += 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  if (!bestText) {
    const fallback = normalizeText(container.textContent);
    if (fallback.length >= 120) {
      bestText = fallback;
    }
  }

  if (!bestText) {
    return undefined;
  }

  return truncate(bestText, 900);
}
