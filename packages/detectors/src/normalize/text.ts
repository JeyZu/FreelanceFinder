/**
 * Normalise une chaîne en supprimant les espaces superflus.
 */
export function normalizeText(value: string | null | undefined): string {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * Tronque proprement une chaîne sans couper brutalement les mots.
 */
export function truncate(value: string, max = 800): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}…`;
}
