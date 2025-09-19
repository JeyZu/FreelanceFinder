import type { OfferDetectionOutcome } from "@freelancefinder/types";
import { buildSummary } from "./offer-summary";
import { flattenEvidence } from "./evidence-format";
import type { AnalysisResponse, DetectionMappingContext } from "./messages";

export function mapDetectionOutcome(
  outcome: OfferDetectionOutcome,
  context: DetectionMappingContext,
): AnalysisResponse {
  if (outcome.status === "out_of_scope") {
    return {
      kind: "out_of_scope",
      evidence: [`URL analysée : ${context.url}`],
    };
  }

  if (outcome.status === "ok") {
    const summary = buildSummary(outcome.pageType, outcome.offers);
    const evidence = flattenEvidence(outcome.offers);
    const rawJson = {
      url: context.url,
      detectedAt: context.detectedAt,
      status: outcome.status,
      pageType: outcome.pageType,
      offers: outcome.offers,
      diagnostics: outcome.diagnostics,
      evidence,
      source: "detector",
    };
    return {
      kind: outcome.pageType === "detail" ? "detail" : "list",
      offersCount: outcome.offers.length,
      summary,
      rawJson,
      evidence,
    };
  }

  const reason = outcome.diagnostics?.reason;
  if (outcome.status === "content_delayed") {
    return {
      kind: "pending",
      reason: reason ?? "contenu tardif",
      evidence: ["Contenu encore en chargement détecté par le moteur FreeWork."],
    };
  }

  return {
    kind: "none",
    reason,
    evidence: reason ? [`Motif : ${reason}.`] : [],
  };
}
