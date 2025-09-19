import type { JobOffer } from "@freelancefinder/types";

export function flattenEvidence(offers: JobOffer[]): string[] {
  const collected: string[] = [];
  offers.forEach((offer, index) => {
    const prefix = offers.length > 1 ? `${index + 1}. ` : "";
    offer.evidence.forEach((entry) => {
      collected.push(`${prefix}${formatLabel(entry.label)} — ${entry.snippet}`);
    });
  });
  return collected;
}

function formatLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
