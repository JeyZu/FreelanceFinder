import type { NormalizedRate } from "../types";
import { normalizeText } from "./text";

const RATE_KEYWORDS = /(jour|day|mois|month|an|year|semaine|week|heure|hour)/i;
const RATE_NUMERIC_PATTERN = /(\d+[\d\s,.]*)/;

export function looksLikeRate(text: string): boolean {
  return /€|eur|\beuros?|\btjm/i.test(text) && /\d/.test(text);
}

export function parseRate(rawText: string): NormalizedRate | undefined {
  const raw = normalizeText(rawText);
  if (!raw) return undefined;

  const valueMatch = raw.match(RATE_NUMERIC_PATTERN);
  if (!valueMatch) {
    return undefined;
  }
  const periodMatch = raw.match(RATE_KEYWORDS);

  let value: number | undefined;
  if (valueMatch) {
    const numeric = valueMatch[1].replace(/[\s,]/g, (char) => (char === "," ? "." : ""));
    const parsed = Number.parseFloat(numeric);
    if (!Number.isNaN(parsed)) {
      value = Number(parsed.toFixed(2));
    }
  }

  const currency = /€/.test(raw)
    ? "EUR"
    : /\bchf\b/i.test(raw)
      ? "CHF"
      : /\busd\b|\$/.test(raw)
        ? "USD"
        : undefined;

  const period = periodMatch
    ? normalizePeriod(periodMatch[0])
    : undefined;

  return { raw, value, currency, period };
}

function normalizePeriod(token: string): NormalizedRate["period"] {
  const lowered = token.toLowerCase();
  if (lowered.startsWith("jour") || lowered.startsWith("day")) {
    return "day";
  }
  if (lowered.startsWith("mois") || lowered.startsWith("month")) {
    return "month";
  }
  if (lowered.startsWith("semaine") || lowered.startsWith("week")) {
    return "week";
  }
  if (lowered.includes("heure") || lowered.includes("hour")) {
    return "hour";
  }
  return "year";
}
