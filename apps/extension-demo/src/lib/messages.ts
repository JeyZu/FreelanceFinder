import type { OfferDetectionOutcome, JobOffer } from "@freelancefinder/types";

export interface SummaryItem {
  label: string;
  value: string;
}

export interface Summary {
  items: SummaryItem[];
}

export type AnalysisSuccessKind = "detail" | "list";

export interface AnalysisSuccessResult {
  kind: AnalysisSuccessKind;
  offersCount: number;
  summary: Summary;
  rawJson: Record<string, unknown>;
  evidence: string[];
}

export interface AnalysisPendingResult {
  kind: "pending";
  reason: string;
  evidence: string[];
}

export interface AnalysisNoneResult {
  kind: "none";
  reason?: string;
  evidence: string[];
}

export interface AnalysisOutOfScopeResult {
  kind: "out_of_scope";
  evidence: string[];
}

export type AnalysisResponse =
  | AnalysisSuccessResult
  | AnalysisPendingResult
  | AnalysisNoneResult
  | AnalysisOutOfScopeResult;

export interface DetectionMappingContext {
  url: string;
  detectedAt: string;
}

export interface EvidenceFormatter {
  (offers: JobOffer[]): string[];
}

export interface SummaryBuilder {
  (pageType: OfferDetectionOutcome["pageType"], offers: JobOffer[]): Summary;
}
