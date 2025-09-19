import { describe, expect, it } from "vitest";
import { mapDetectionOutcome } from "./result-mapper";
import type { OfferDetectionOutcome } from "@freelancefinder/types";
import type { AnalysisResponse, AnalysisSuccessResult, AnalysisPendingResult } from "./messages";

const context = { url: "https://www.free-work.com/test", detectedAt: "2024-01-01T00:00:00.000Z" };

describe("result mapper", () => {
  it("maps successful detail outcome", () => {
    const outcome: OfferDetectionOutcome = {
      status: "ok",
      message: "Offre détectée (détail)",
      pageType: "detail",
      offers: [
        {
          source: "FreeWork",
          url: "https://www.free-work.com/job",
          title: "Développeur",
          stack: ["Node.js"],
          tags: ["Node.js"],
          confidence: 0.9,
          evidence: [{ label: "title", snippet: "Développeur" }],
        },
      ],
    };

    const result = mapDetectionOutcome(outcome, context);
    assertSuccess(result);
    expect(result.kind).toBe("detail");
    expect(result.offersCount).toBe(1);
    expect(result.summary.items[0]).toEqual({ label: "Titre", value: "Développeur" });
    expect(result.evidence).toContain("Title — Développeur");
  });

  it("maps delayed outcome to pending", () => {
    const outcome: OfferDetectionOutcome = {
      status: "content_delayed",
      message: "Aucune offre détectable (contenu tardif)",
      pageType: "unknown",
      offers: [],
      diagnostics: { reason: "contenu tardif" },
    };

    const result = mapDetectionOutcome(outcome, context);
    assertPending(result);
    expect(result.reason).toBe("contenu tardif");
  });

  it("maps out_of_scope outcome", () => {
    const outcome: OfferDetectionOutcome = {
      status: "out_of_scope",
      message: "Page hors périmètre FreeWork",
      pageType: "unknown",
      offers: [],
    };

    const result = mapDetectionOutcome(outcome, context);
    expect(result.kind).toBe("out_of_scope");
    expect(result.evidence[0]).toContain(context.url);
  });
});

function assertSuccess(result: AnalysisResponse): asserts result is AnalysisSuccessResult {
  if (result.kind !== "detail" && result.kind !== "list") {
    throw new Error(`Unexpected result kind: ${result.kind}`);
  }
}

function assertPending(result: AnalysisResponse): asserts result is AnalysisPendingResult {
  if (result.kind !== "pending") {
    throw new Error(`Unexpected result kind: ${result.kind}`);
  }
}
