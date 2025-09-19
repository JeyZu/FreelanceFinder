import type { JobOffer, OfferEvidence } from "../types";
import { truncate } from "../normalize/text";
import { buildSelector } from "../utils/selectors";

export interface EvidenceParts {
  rateText?: string;
  location?: string;
  contractType?: string;
  startDate?: string;
  duration?: string;
  experienceLevel?: string;
  postedAt?: string;
  remoteSnippet?: string;
  descriptionSnippet?: string;
  tags?: string[];
}

export function populateEvidence(
  offer: JobOffer,
  titleElement: Element | null,
  parts: EvidenceParts,
): void {
  const evidence: OfferEvidence[] = [];
  pushEvidence(evidence, "title", offer.title, titleElement ? buildSelector(titleElement) : undefined);
  if (parts.rateText) {
    pushEvidence(evidence, "rate", parts.rateText);
  }
  if (parts.location) {
    pushEvidence(evidence, "location", parts.location);
  }
  if (offer.rate?.raw && !parts.rateText) {
    pushEvidence(evidence, "rate", offer.rate.raw);
  }
  if (parts.contractType) {
    pushEvidence(evidence, "contract", parts.contractType);
  }
  if (parts.startDate) {
    pushEvidence(evidence, "startDate", parts.startDate);
  }
  if (parts.duration) {
    pushEvidence(evidence, "duration", parts.duration);
  }
  if (parts.experienceLevel) {
    pushEvidence(evidence, "experience", parts.experienceLevel);
  }
  if (parts.postedAt) {
    pushEvidence(evidence, "postedAt", parts.postedAt);
  }
  if (parts.remoteSnippet) {
    pushEvidence(evidence, "remote", parts.remoteSnippet);
  }
  if (parts.descriptionSnippet) {
    pushEvidence(evidence, "description", truncate(parts.descriptionSnippet, 180));
  }
  if (parts.tags && parts.tags.length > 0) {
    pushEvidence(evidence, "tags", parts.tags.slice(0, 3).join(", "));
  }

  if (evidence.length < 3 && offer.description) {
    pushEvidence(evidence, "context", truncate(offer.description, 160));
  }
  if (evidence.length < 3 && offer.rate?.raw) {
    pushEvidence(evidence, "pricing", offer.rate.raw);
  }
  if (evidence.length < 3 && offer.location) {
    pushEvidence(evidence, "geo", offer.location);
  }

  offer.evidence = evidence;
}

function pushEvidence(list: OfferEvidence[], label: string, snippet?: string, selector?: string): void {
  if (!snippet) return;
  const normalized = truncate(snippet, 220);
  list.push({ label, snippet: normalized, selector });
}
