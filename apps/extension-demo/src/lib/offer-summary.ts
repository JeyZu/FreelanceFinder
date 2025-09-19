import type { JobOffer, OfferDetectionOutcome } from "@freelancefinder/types";
import type { Summary, SummaryItem } from "./messages";

const LIST_PREVIEW_LIMIT = 3;
const STACK_PREVIEW_LIMIT = 6;

export function buildSummary(pageType: OfferDetectionOutcome["pageType"], offers: JobOffer[]): Summary {
  if (pageType === "detail" && offers[0]) {
    return { items: buildDetailSummary(offers[0]) };
  }
  return { items: buildListSummary(offers.slice(0, LIST_PREVIEW_LIMIT)) };
}

function buildDetailSummary(offer: JobOffer): SummaryItem[] {
  const items: SummaryItem[] = [];
  if (offer.title) {
    items.push({ label: "Titre", value: offer.title });
  }
  const location = formatLocation(offer);
  if (location) {
    items.push({ label: "Lieu / Remote", value: location });
  }
  if (offer.contractType) {
    items.push({ label: "Contrat", value: offer.contractType });
  }
  if (offer.rate?.raw) {
    items.push({ label: "Taux", value: offer.rate.raw });
  }
  if (offer.stack.length > 0) {
    items.push({ label: "Stack", value: offer.stack.slice(0, STACK_PREVIEW_LIMIT).join(" · ") });
  }
  return items;
}

function buildListSummary(offers: JobOffer[]): SummaryItem[] {
  return offers.map((offer, index) => {
    const parts = [offer.title, formatLocation(offer), offer.rate?.raw].filter(Boolean) as string[];
    const value = parts.join(" — ") || "Offre détectée";
    return { label: `${index + 1}.`, value };
  });
}

function formatLocation(offer: JobOffer): string | undefined {
  const parts: string[] = [];
  if (offer.location) {
    parts.push(offer.location);
  }
  if (offer.isRemote) {
    const policy = offer.remotePolicy ?? "Remote";
    if (!parts.some((part) => part.toLowerCase().includes("remote"))) {
      parts.push(policy);
    }
  }
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(" — ");
}
