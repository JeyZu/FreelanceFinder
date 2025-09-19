import type { DetectionOptions, DetectionPageType, JobOffer, OfferDetectionOutcome } from "../types";
export type {
  DetectionOptions,
  DetectionPageType,
  JobOffer,
  OfferDetectionOutcome,
  OfferEvidence,
  OfferDetectionItem,
  NormalizedRate,
} from "../types";

import { pollUntil } from "../state/poller";
import type { PollOutcome } from "../state/poller";
import { safeParseUrl, isFreeWorkDomain } from "../utils/url";
import { extractDetailOffer } from "./detail";
import { extractListOffers } from "./list";
import { findMainHeading } from "../parsing/heading";
import { normalizeText } from "../normalize/text";

const DEFAULT_MAX_WAIT_MS = 1_800;
const DEFAULT_POLL_INTERVAL_MS = 40;

interface PollingConfig {
  maxWaitMs: number;
  pollIntervalMs: number;
}

interface AnalysisSnapshot {
  pageType: DetectionPageType;
  offers: JobOffer[];
  ready: boolean;
  message?: string;
  reason?: string;
}

/**
 * Analyse un document FreeWork et renvoie l'issue consolidée pour l'extension.
 * La fonction ne change pas les messages visibles : elle se limite à orchestrer
 * la boucle d'attente et la transformation des résultats intermédiaires.
 */
export async function detectFreeWorkOffers(
  document: Document,
  options: DetectionOptions,
): Promise<OfferDetectionOutcome> {
  const pageUrl = ensureFreeWorkUrl(options.url);
  if (!pageUrl) {
    return buildOutOfScopeOutcome();
  }

  const pollingConfig = resolvePollingConfig(options);
  const pollResult = await pollUntil(
    options,
    pollingConfig,
    () => analyseDocument(document, pageUrl),
    isSuccessfulAnalysis,
  );

  return finalizeOutcome(pollResult.value, pollResult);
}

function ensureFreeWorkUrl(rawUrl: string): URL | null {
  const parsedUrl = safeParseUrl(rawUrl);
  if (!parsedUrl || !isFreeWorkDomain(parsedUrl)) {
    return null;
  }
  return parsedUrl;
}

function resolvePollingConfig(options: DetectionOptions): PollingConfig {
  return {
    maxWaitMs: options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
  };
}

function isSuccessfulAnalysis(analysis: AnalysisSnapshot): boolean {
  return analysis.ready && analysis.offers.length > 0;
}

function buildOutOfScopeOutcome(): OfferDetectionOutcome {
  return {
    status: "out_of_scope",
    message: "Page hors périmètre FreeWork",
    pageType: "unknown",
    offers: [],
  };
}

function finalizeOutcome(
  analysis: AnalysisSnapshot,
  pollResult: PollOutcome<AnalysisSnapshot>,
): OfferDetectionOutcome {
  if (analysis.offers.length > 0) {
    return {
      status: "ok",
      message: analysis.message ?? buildSuccessMessage(analysis.pageType, analysis.offers.length),
      pageType: analysis.pageType,
      offers: analysis.offers,
      diagnostics: {
        attempts: pollResult.attempts,
        waitedMs: pollResult.waitedMs,
      },
    };
  }

  const reason = analysis.reason ?? "contenu insuffisant";
  const status = reason === "contenu tardif" ? "content_delayed" : "no_offers";
  return {
    status,
    message: `Aucune offre détectable (${reason})`,
    pageType: analysis.pageType,
    offers: [],
    diagnostics: {
      attempts: pollResult.attempts,
      waitedMs: pollResult.waitedMs,
      reason,
    },
  };
}

/**
 * Évalue la page courante et indique si une offre exploitable est prête.
 */
function analyseDocument(document: Document, pageUrl: URL): AnalysisSnapshot {
  const detail = extractDetailOffer(document, pageUrl);
  if (detail.offer && detail.ready) {
    return {
      pageType: "detail",
      offers: [detail.offer],
      ready: true,
      message: "Offre détectée (détail)",
    };
  }

  const listOffers = extractListOffers(document, pageUrl);
  if (listOffers.length >= 2) {
    return {
      pageType: "list",
      offers: listOffers,
      ready: true,
      message: `Liste détectée : ${listOffers.length} offres`,
    };
  }

  if (detail.offer) {
    return {
      pageType: "detail",
      offers: [],
      ready: false,
      reason: detail.reason ?? "informations partielles",
    };
  }

  if (listOffers.length === 1) {
    return {
      pageType: "list",
      offers: [],
      ready: false,
      reason: "une seule carte détectée",
    };
  }

  const hasHeading = Boolean(findMainHeading(document));
  const pageText = normalizeText(document.body?.textContent ?? "");
  const hasLoadingKeyword = /chargement|loading|spinner|patientez/i.test(pageText);
  const hasMeaningfulText = pageText.length >= 60 || (!hasLoadingKeyword && pageText.length >= 12);
  return {
    pageType: "unknown",
    offers: [],
    ready: false,
    reason: hasHeading || hasMeaningfulText ? "structure atypique" : "contenu tardif",
  };
}

function buildSuccessMessage(pageType: DetectionPageType, count: number): string {
  if (pageType === "list") {
    return `Liste détectée : ${count} offres`;
  }
  if (pageType === "detail") {
    return "Offre détectée (détail)";
  }
  return "Détection FreeWork";
}
