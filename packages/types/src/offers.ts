export type RatePeriod = "day" | "month" | "year" | "hour" | "week";

export interface NormalizedRate {
  raw: string;
  value?: number;
  currency?: string;
  period?: RatePeriod;
}

export interface OfferEvidence {
  label: string;
  snippet: string;
  selector?: string;
}

export interface OfferDetectionItem {
  source: "FreeWork" | string;
  url: string;
  title?: string;
  company?: string;
  location?: string;
  isRemote?: boolean;
  remotePolicy?: string;
  contractType?: string;
  rate?: NormalizedRate;
  startDate?: string;
  duration?: string;
  experienceLevel?: string;
  stack: string[];
  description?: string;
  postedAt?: string;
  tags: string[];
  confidence: number;
  evidence: OfferEvidence[];
}

export type DetectionPageType = "detail" | "list" | "unknown";

export interface DetectionOptions {
  url: string;
  maxWaitMs?: number;
  pollIntervalMs?: number;
  now?: () => Date;
}

export interface OfferDetectionOutcome {
  status: "ok" | "out_of_scope" | "no_offers" | "content_delayed";
  message: string;
  pageType: DetectionPageType;
  offers: OfferDetectionItem[];
  diagnostics?: {
    waitedMs?: number;
    attempts?: number;
    reason?: string;
  };
}
