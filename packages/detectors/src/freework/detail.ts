import type { JobOffer } from "../types";
import { findMainHeading } from "../parsing/heading";
import { collectMetaTexts, findByLabel, findExperience, findPostedAt } from "../parsing/meta";
import { findContractType } from "../parsing/contract";
import type { RemoteInfo } from "../normalize/remote";
import { detectRemote } from "../normalize/remote";
import { findLocation } from "../normalize/location";
import { looksLikeRate, parseRate } from "../normalize/rate";
import { normalizeText } from "../normalize/text";
import { collectTags } from "../parsing/tags";
import { extractCompany } from "../parsing/company";
import { extractDescription } from "../parsing/description";
import { detectTechnologiesFromTexts } from "../parsing/technologies";
import { populateEvidence } from "../state/evidence";
import type { EvidenceParts } from "../state/evidence";
import { computeConfidence } from "../state/confidence";

interface DetailMetaData {
  texts: string[];
  rateText?: string;
  contractType?: string;
  rate?: JobOffer["rate"];
  location?: string;
  remote: RemoteInfo;
  startDate?: string;
  duration?: string;
  experienceLevel?: string;
  postedAt?: string;
}

export interface DetailExtractionResult {
  offer: JobOffer | null;
  ready: boolean;
  reason?: string;
}

/**
 * Construit une offre détaillée à partir du DOM d'une page annonce FreeWork.
 * Retourne également un indicateur de complétude pour guider le polling.
 */
export function extractDetailOffer(document: Document, pageUrl: URL): DetailExtractionResult {
  const main = resolveDetailRoot(document);
  if (!main) {
    return { offer: null, ready: false, reason: "structure introuvable" };
  }

  const heading = findMainHeading(main);
  const title = heading ? normalizeText(heading.textContent) : "";
  if (!isValidTitle(title)) {
    return { offer: null, ready: false, reason: "titre absent" };
  }

  const metaData = buildMetaData(main);
  const description = extractDescription(main);
  const tags = collectTags(main);
  const stack = buildStack(metaData.texts, description, tags);

  const offer = assembleOffer({
    pageUrl,
    title,
    company: extractCompany(main),
    description,
    tags,
    stack,
    metaData,
  });

  applyConfidence(offer, stack.length, description?.length ?? 0, metaData);
  populateEvidence(offer, heading, buildEvidence(metaData, description, tags));

  const readiness = evaluateReadiness(stack.length, description?.length ?? 0, metaData);
  return { offer, ready: readiness.ready, reason: readiness.reason };
}

function resolveDetailRoot(document: Document): Element | null {
  return document.querySelector("main") ?? document.body;
}

function isValidTitle(value: string | undefined): value is string {
  return Boolean(value && value.trim().length >= 6);
}

function buildMetaData(main: Element): DetailMetaData {
  const texts = collectMetaTexts(main);
  const rateText = texts.find(looksLikeRate);
  const rate = rateText ? parseRate(rateText) : undefined;
  const contractType = findContractType(texts);

  let location = findLocation(texts, { includeRemote: false });
  const remote = detectRemote([...texts, location ?? ""]);
  if (!location && remote.snippet) {
    location = remote.snippet;
  }

  return {
    texts,
    rateText,
    rate,
    contractType,
    location,
    remote,
    startDate: findByLabel(texts, /(d[eé]marrage|d[eé]but|start)/i),
    duration: findByLabel(texts, /dur[eé]e/i),
    experienceLevel: findExperience(texts),
    postedAt: findPostedAt(texts),
  };
}

function buildStack(metaTexts: string[], description: string | undefined, tags: string[]): string[] {
  const stackSet = new Set<string>(tags);
  detectTechnologiesFromTexts([...metaTexts, description ?? ""], stackSet);
  return Array.from(stackSet);
}

interface AssembleOfferParams {
  pageUrl: URL;
  title: string;
  company: string | undefined;
  description: string | undefined;
  tags: string[];
  stack: string[];
  metaData: DetailMetaData;
}

function assembleOffer(params: AssembleOfferParams): JobOffer {
  const { pageUrl, title, company, description, tags, stack, metaData } = params;
  return {
    source: "FreeWork",
    url: pageUrl.toString(),
    title,
    company,
    location: metaData.location,
    isRemote: metaData.remote.isRemote,
    remotePolicy: metaData.remote.policy,
    contractType: metaData.contractType,
    rate: metaData.rate,
    startDate: metaData.startDate,
    duration: metaData.duration,
    experienceLevel: metaData.experienceLevel,
    stack,
    description,
    postedAt: metaData.postedAt,
    tags,
    confidence: 0,
    evidence: [],
  };
}

function applyConfidence(
  offer: JobOffer,
  stackCount: number,
  descriptionLength: number,
  metaData: DetailMetaData,
): void {
  offer.confidence = computeConfidence({
    hasTitle: Boolean(offer.title),
    hasRate: Boolean(metaData.rate),
    hasLocationOrRemote: Boolean(metaData.location || metaData.remote.isRemote),
    stackCount,
    descriptionLength,
    hasContract: Boolean(metaData.contractType),
  });
}

function buildEvidence(metaData: DetailMetaData, description: string | undefined, tags: string[]): EvidenceParts {
  return {
    rateText: metaData.rateText,
    location: metaData.location,
    contractType: metaData.contractType,
    startDate: metaData.startDate,
    duration: metaData.duration,
    experienceLevel: metaData.experienceLevel,
    postedAt: metaData.postedAt,
    remoteSnippet: metaData.remote.snippet,
    descriptionSnippet: description,
    tags,
  };
}

function evaluateReadiness(
  stackCount: number,
  descriptionLength: number,
  metaData: DetailMetaData,
): { ready: boolean; reason?: string } {
  const essentialSignals = [
    Boolean(metaData.rate),
    Boolean(metaData.location || metaData.remote.isRemote),
    stackCount >= 2,
    descriptionLength >= 150,
  ];
  const ready = essentialSignals.filter(Boolean).length >= 2 && descriptionLength >= 120;
  return ready ? { ready } : { ready: false, reason: "informations partielles" };
}
