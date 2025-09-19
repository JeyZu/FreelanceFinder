import type { JobOffer } from "../types";
import { normalizeText } from "../normalize/text";
import { splitSegments, buildCardSnippet } from "../parsing/cards";
import { collectMetaTexts } from "../parsing/meta";
import { looksLikeRate, parseRate } from "../normalize/rate";
import { findLocation } from "../normalize/location";
import { detectRemote } from "../normalize/remote";
import type { RemoteInfo } from "../normalize/remote";
import { detectTechnologiesFromTexts } from "../parsing/technologies";
import { collectTags } from "../parsing/tags";
import { findContractType } from "../parsing/contract";
import { computeConfidence } from "../state/confidence";
import { populateEvidence } from "../state/evidence";
import type { EvidenceParts } from "../state/evidence";
import { uniqueStrings } from "../utils/collections";
import { toAbsoluteUrl } from "../utils/url";

interface CardCandidate {
  root: Element;
  anchor: HTMLAnchorElement;
  title: string;
}

interface CardMetaData {
  rateText?: string;
  rate?: JobOffer["rate"];
  location?: string;
  remote: RemoteInfo;
  contractType?: string;
}

/**
 * Extrait chaque carte d'offre visible sur une page liste FreeWork. Les heuristiques
 * de parsing sont mutualisées avec le mode détail pour limiter les divergences.
 */
export function extractListOffers(document: Document, pageUrl: URL): JobOffer[] {
  const offers: JobOffer[] = [];
  const cards = findOfferCards(document);

  for (const card of cards) {
    const offer = buildOfferFromCard(card, pageUrl);
    if (offer) {
      offers.push(offer);
    }
  }

  return offers;
}

function findOfferCards(document: Document): CardCandidate[] {
  const seen = new Set<Element>();
  const cards: CardCandidate[] = [];
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href || !/\bjob\b/i.test(href)) {
      continue;
    }

    const titleElement = anchor.querySelector("h1, h2, h3, h4, h5") ?? anchor;
    const title = normalizeText(titleElement.textContent);
    if (!title || title.length < 5 || /postuler/i.test(title)) {
      continue;
    }

    const root = anchor.closest("article, li, section, div") ?? anchor;
    if (seen.has(root)) {
      continue;
    }

    seen.add(root);
    cards.push({ root, anchor, title });
  }

  return cards;
}

function buildOfferFromCard(card: CardCandidate, pageUrl: URL): JobOffer | null {
  const absoluteUrl = toAbsoluteUrl(card.anchor.getAttribute("href") ?? "", pageUrl);
  if (!absoluteUrl) {
    return null;
  }

  const segments = collectCardSegments(card);
  const meta = deriveMetaData(segments);
  const tags = collectTags(card.root);
  const stack = buildCardStack(card.title, segments, tags);
  const snippet = buildCardSnippet(card.root, card.title);

  const offer: JobOffer = {
    source: "FreeWork",
    url: absoluteUrl,
    title: card.title,
    location: meta.location,
    isRemote: meta.remote.isRemote,
    remotePolicy: meta.remote.policy,
    contractType: meta.contractType,
    rate: meta.rate,
    stack,
    description: snippet,
    tags: uniqueStrings([...tags, ...stack]),
    confidence: 0,
    evidence: [],
  };

  applyCardConfidence(offer, stack.length, snippet.length, meta);
  populateEvidence(offer, card.anchor, buildCardEvidence(meta, snippet, offer.tags));

  return offer;
}

function collectCardSegments(card: CardCandidate): string[] {
  const cardText = normalizeText(card.root.textContent);
  const segments = splitSegments(cardText);
  const metaCandidates = collectMetaTexts(card.root);
  return uniqueStrings([...segments, ...metaCandidates]);
}

function deriveMetaData(segments: string[]): CardMetaData {
  const rateText = segments.find(looksLikeRate);
  const rate = rateText ? parseRate(rateText) : undefined;

  let location = findLocation(segments, { includeRemote: true });
  const remote = detectRemote(segments);
  if (!location && remote.snippet) {
    location = remote.snippet;
  }

  return {
    rateText,
    rate,
    location,
    remote,
    contractType: findContractType(segments),
  };
}

function buildCardStack(title: string, segments: string[], tags: string[]): string[] {
  const stackSet = new Set<string>();
  detectTechnologiesFromTexts([title, ...segments], stackSet);
  tags.forEach((tag) => stackSet.add(tag));
  return Array.from(stackSet);
}

function applyCardConfidence(
  offer: JobOffer,
  stackCount: number,
  descriptionLength: number,
  meta: CardMetaData,
): void {
  offer.confidence = computeConfidence({
    hasTitle: Boolean(offer.title),
    hasRate: Boolean(meta.rate),
    hasLocationOrRemote: Boolean(meta.location || meta.remote.isRemote),
    stackCount,
    descriptionLength,
    hasContract: Boolean(meta.contractType),
  });
}

function buildCardEvidence(meta: CardMetaData, snippet: string, tags: string[]): EvidenceParts {
  return {
    rateText: meta.rateText,
    location: meta.location,
    contractType: meta.contractType,
    descriptionSnippet: snippet,
    remoteSnippet: meta.remote.snippet,
    tags,
  };
}
