import type {
  DetectionOptions,
  DetectionPageType,
  NormalizedRate,
  OfferDetectionItem,
  OfferDetectionOutcome,
  OfferEvidence,
} from "@freelancefinder/types";

export type {
  DetectionOptions,
  DetectionPageType,
  NormalizedRate,
  OfferDetectionItem,
  OfferDetectionOutcome,
  OfferEvidence,
} from "@freelancefinder/types";

const FREEWORK_HOST_SUFFIX = "free-work.com";
const DEFAULT_MAX_WAIT_MS = 180;
const DEFAULT_POLL_INTERVAL_MS = 40;

const REMOTE_KEYWORDS = [
  /full\s*remote/i,
  /remote/i,
  /télétravail/i,
  /teletravail/i,
  /hybride/i,
  /home\s*office/i,
];

const CONTRACT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /freelance/i, label: "Freelance" },
  { pattern: /cdi/i, label: "CDI" },
  { pattern: /cdd/i, label: "CDD" },
  { pattern: /portage/i, label: "Portage" },
  { pattern: /stage/i, label: "Stage" },
  { pattern: /alternance/i, label: "Alternance" },
];

const LOCATION_KEYWORDS = [
  "paris",
  "lyon",
  "marseille",
  "toulouse",
  "bordeaux",
  "nantes",
  "lille",
  "rennes",
  "grenoble",
  "strasbourg",
  "montpellier",
  "nice",
  "sophia",
  "niort",
  "brest",
  "dijon",
  "tours",
  "angers",
  "rouen",
  "saint",
  "télétravail",
  "remote",
  "hybride",
  "france",
  "idf",
];

const TECHNOLOGY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Node.js", pattern: /node\.?js/i },
  { label: "React", pattern: /react/i },
  { label: "TypeScript", pattern: /typescript|ts\b/i },
  { label: "JavaScript", pattern: /javascript/i },
  { label: "AWS", pattern: /\baws\b/i },
  { label: "Azure", pattern: /azure/i },
  { label: "GCP", pattern: /\bgoogle cloud|\bgcp\b/i },
  { label: "Kubernetes", pattern: /kubernetes|k8s/i },
  { label: "Docker", pattern: /docker/i },
  { label: "Terraform", pattern: /terraform/i },
  { label: "Java", pattern: /\bjava\b/i },
  { label: "Spring", pattern: /spring\b/i },
  { label: "Python", pattern: /python/i },
  { label: "Django", pattern: /django/i },
  { label: "Flask", pattern: /flask/i },
  { label: "PHP", pattern: /\bphp\b/i },
  { label: "Symfony", pattern: /symfony/i },
  { label: "Laravel", pattern: /laravel/i },
  { label: "Go", pattern: /\bgo\b|golang/i },
  { label: "Rust", pattern: /rust/i },
  { label: "C#", pattern: /c#/i },
  { label: "C++", pattern: /c\+\+/i },
  { label: "Ruby", pattern: /ruby/i },
  { label: "Rails", pattern: /rails/i },
  { label: "Scala", pattern: /scala/i },
  { label: "Swift", pattern: /swift/i },
  { label: "Kotlin", pattern: /kotlin/i },
  { label: "Android", pattern: /android/i },
  { label: "iOS", pattern: /\bios\b/i },
  { label: "Angular", pattern: /angular/i },
  { label: "Vue", pattern: /vue\.js|vuejs|\bvue\b/i },
  { label: "Svelte", pattern: /svelte/i },
  { label: "GraphQL", pattern: /graphql/i },
  { label: "PostgreSQL", pattern: /postgresql|postgres/i },
  { label: "MySQL", pattern: /mysql/i },
  { label: "MongoDB", pattern: /mongodb/i },
  { label: "Redis", pattern: /redis/i },
  { label: "Kafka", pattern: /kafka/i },
  { label: "Spark", pattern: /spark/i },
  { label: "Hadoop", pattern: /hadoop/i },
  { label: "Elasticsearch", pattern: /elasticsearch|elastic/i },
];

interface AnalysisResult {
  pageType: DetectionPageType;
  offers: OfferDetectionItem[];
  message?: string;
  reason?: string;
}

interface DetailExtractionResult {
  offer: OfferDetectionItem | null;
  ready: boolean;
  reason?: string;
}

export async function detectFreeWorkOffers(
  document: Document,
  options: DetectionOptions,
): Promise<OfferDetectionOutcome> {
  const parsedUrl = safeParseUrl(options.url);
  if (!parsedUrl || !isFreeWorkDomain(parsedUrl)) {
    return {
      status: "out_of_scope",
      message: "Page hors périmètre FreeWork",
      pageType: "unknown",
      offers: [],
    };
  }

  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const start = currentTime(options);
  const deadline = start + maxWaitMs;

  let attempts = 0;
  let analysis: AnalysisResult = { pageType: "unknown", offers: [], reason: "contenu insuffisant" };

  for (let now = currentTime(options); now <= deadline; now = currentTime(options)) {
    attempts += 1;
    analysis = analyseDocument(document, parsedUrl);

    if (analysis.offers.length > 0) {
      const waitedMs = currentTime(options) - start;
      return {
        status: "ok",
        message: analysis.message ?? buildSuccessMessage(analysis.pageType, analysis.offers.length),
        pageType: analysis.pageType,
        offers: analysis.offers,
        diagnostics: {
          attempts,
          waitedMs,
        },
      };
    }

    if (now >= deadline) {
      break;
    }

    const remaining = Math.max(0, deadline - now);
    const waitDuration = Math.min(pollIntervalMs, remaining);
    if (waitDuration > 0) {
      await delay(waitDuration);
    }
  }

  const finalElapsed = Math.max(0, currentTime(options) - start);
  const reason = analysis.reason ?? "contenu insuffisant";
  return {
    status: "no_offers",
    message: `Aucune offre détectable (${reason})`,
    pageType: analysis.pageType,
    offers: [],
    diagnostics: {
      attempts,
      waitedMs: finalElapsed,
      reason,
    },
  };
}

function analyseDocument(document: Document, pageUrl: URL): AnalysisResult {
  const detailExtraction = extractDetailOffer(document, pageUrl);
  if (detailExtraction.offer && detailExtraction.ready) {
    return {
      pageType: "detail",
      offers: [detailExtraction.offer],
      message: "Offre détectée (détail)",
    };
  }

  const listOffers = extractListOffers(document, pageUrl);
  if (listOffers.length >= 2) {
    return {
      pageType: "list",
      offers: listOffers,
      message: `Liste détectée : ${listOffers.length} offres`,
    };
  }

  if (detailExtraction.offer) {
    return {
      pageType: "detail",
      offers: [],
      reason: detailExtraction.reason ?? "informations partielles",
    };
  }

  if (listOffers.length === 1) {
    return {
      pageType: "list",
      offers: [],
      reason: "une seule carte détectée",
    };
  }

  const hasHeading = Boolean(findMainHeading(document));
  return {
    pageType: "unknown",
    offers: [],
    reason: hasHeading ? "structure atypique" : "contenu tardif",
  };
}

function extractDetailOffer(document: Document, pageUrl: URL): DetailExtractionResult {
  const main = document.querySelector("main") ?? document.body;
  if (!main) {
    return { offer: null, ready: false, reason: "structure introuvable" };
  }

  const heading = findMainHeading(main);
  const title = heading ? normalizeText(heading.textContent) : undefined;
  if (!title || title.length < 6) {
    return { offer: null, ready: false, reason: "titre absent" };
  }

  const metaTexts = collectMetaTexts(main);
  const rateText = metaTexts.find(looksLikeRate);
  const rate = rateText ? parseRate(rateText) : undefined;

  const contractType = findContractType(metaTexts);
  let location = findLocation(metaTexts, { includeRemote: false });
  const remoteInfo = detectRemote([...metaTexts, location ?? ""]);
  if (!location && remoteInfo.snippet) {
    location = remoteInfo.snippet;
  }

  const startDate = findByLabel(metaTexts, /(d[eé]marrage|d[eé]but|start)/i);
  const duration = findByLabel(metaTexts, /dur[eé]e/i);
  const experienceLevel = findExperience(metaTexts);
  const postedAt = findPostedAt(metaTexts);

  const company = extractCompany(main);

  const tags = collectTags(main);
  const description = extractDescription(main);

  const stackSet = new Set<string>(tags);
  detectTechnologiesFromTexts([...metaTexts, description ?? ""], stackSet);

  const stack = Array.from(stackSet);
  const descriptionSnippet = description ? truncate(description, 900) : undefined;

  const offer: OfferDetectionItem = {
    source: "FreeWork",
    url: pageUrl.toString(),
    title,
    company,
    location,
    isRemote: remoteInfo.isRemote,
    remotePolicy: remoteInfo.policy,
    contractType,
    rate,
    startDate,
    duration,
    experienceLevel,
    stack,
    description: descriptionSnippet,
    postedAt,
    tags,
    confidence: 0,
    evidence: [],
  };

  const descriptionLength = descriptionSnippet?.length ?? 0;
  offer.confidence = computeConfidence({
    hasTitle: Boolean(title),
    hasRate: Boolean(rate),
    hasLocationOrRemote: Boolean(location || remoteInfo.isRemote),
    stackCount: stack.length,
    descriptionLength,
    hasContract: Boolean(contractType),
  });

  populateEvidence(offer, heading, {
    rateText,
    location,
    contractType,
    startDate,
    duration,
    experienceLevel,
    postedAt,
    remoteSnippet: remoteInfo.snippet,
    descriptionSnippet,
    tags,
  });

  const essentialSignals = [
    Boolean(rate),
    Boolean(location || remoteInfo.isRemote),
    stack.length >= 2,
    descriptionLength >= 150,
  ];
  const ready = essentialSignals.filter(Boolean).length >= 2 && descriptionLength >= 120;
  const reason = ready ? undefined : "informations partielles";

  return { offer, ready, reason };
}

function extractListOffers(document: Document, pageUrl: URL): OfferDetectionItem[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  const cards: Array<{ root: Element; anchor: HTMLAnchorElement; title: string }> = [];
  const seen = new Set<Element>();

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

  const offers: OfferDetectionItem[] = [];
  for (const card of cards) {
    const absoluteUrl = toAbsoluteUrl(card.anchor.getAttribute("href") ?? "", pageUrl);
    if (!absoluteUrl) {
      continue;
    }

    const cardText = normalizeText(card.root.textContent);
    const segments = splitSegments(cardText);
    const metaCandidates = collectMetaTexts(card.root);
    const combinedSegments = uniqueStrings([...segments, ...metaCandidates]);

    const rateText = combinedSegments.find(looksLikeRate);
    const rate = rateText ? parseRate(rateText) : undefined;

    let location = findLocation(combinedSegments, { includeRemote: true });
    const remoteInfo = detectRemote(combinedSegments);
    if (!location && remoteInfo.snippet) {
      location = remoteInfo.snippet;
    }

    const stackSet = new Set<string>();
    detectTechnologiesFromTexts([card.title, ...combinedSegments], stackSet);
    const tags = collectTags(card.root);
    for (const tag of tags) {
      stackSet.add(tag);
    }
    const stack = Array.from(stackSet);

    const snippet = buildCardSnippet(card.root, card.title);

    const offer: OfferDetectionItem = {
      source: "FreeWork",
      url: absoluteUrl,
      title: card.title,
      location,
      isRemote: remoteInfo.isRemote,
      remotePolicy: remoteInfo.policy,
      contractType: findContractType(combinedSegments),
      rate,
      stack,
      description: snippet,
      tags: uniqueStrings([...tags, ...stack]),
      confidence: 0,
      evidence: [],
    };

    offer.confidence = computeConfidence({
      hasTitle: true,
      hasRate: Boolean(rate),
      hasLocationOrRemote: Boolean(location || remoteInfo.isRemote),
      stackCount: stack.length,
      descriptionLength: snippet.length,
      hasContract: Boolean(offer.contractType),
    });

    populateEvidence(offer, card.anchor, {
      rateText,
      location,
      contractType: offer.contractType,
      descriptionSnippet: snippet,
      remoteSnippet: remoteInfo.snippet,
      tags: offer.tags,
    });

    offers.push(offer);
  }

  return offers;
}

function populateEvidence(
  offer: OfferDetectionItem,
  titleElement: Element | null,
  parts: {
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
  },
) {
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

function findMainHeading(root: ParentNode): Element | null {
  const heading = root.querySelector("h1") ?? root.querySelector("h2");
  return heading;
}

function collectMetaTexts(root: ParentNode): string[] {
  const selectors = [
    ".meta",
    "[class*='meta']",
    "[class*='info']",
    "header",
    "ul",
    "dl",
  ];
  const collected = new Set<string>();
  for (const selector of selectors) {
    const elements = root instanceof Document ? root.querySelectorAll(selector) : root.querySelectorAll(selector);
    for (const element of elements) {
      for (const child of Array.from(element.querySelectorAll("span, div, li, dt, dd, p"))) {
        const text = normalizeText(child.textContent);
        if (!text) continue;
        if (text.length > 140) continue;
        collected.add(text);
      }
    }
  }

  if (root instanceof Element) {
    const immediateSpans = Array.from(root.querySelectorAll("span, li, p"));
    for (const span of immediateSpans) {
      const text = normalizeText(span.textContent);
      if (!text || text.length > 140) continue;
      collected.add(text);
    }
  }

  return Array.from(collected);
}

function findContractType(metaTexts: string[]): string | undefined {
  for (const { pattern, label } of CONTRACT_PATTERNS) {
    if (metaTexts.some((text) => pattern.test(text))) {
      return label;
    }
  }
  return undefined;
}

function detectRemote(texts: string[]): { isRemote: boolean; snippet?: string; policy?: string } {
  for (const text of texts) {
    if (!text) continue;
    for (const pattern of REMOTE_KEYWORDS) {
      if (pattern.test(text)) {
        return { isRemote: true, snippet: text, policy: normalizeRemotePolicy(text) };
      }
    }
  }
  return { isRemote: false };
}

function normalizeRemotePolicy(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (normalized.includes("hybride")) {
    return "hybrid";
  }
  if (normalized.includes("full")) {
    return "full-remote";
  }
  if (normalized.includes("remote") || normalized.includes("télétravail") || normalized.includes("teletravail")) {
    return "remote";
  }
  return undefined;
}

function findByLabel(metaTexts: string[], label: RegExp): string | undefined {
  for (const text of metaTexts) {
    const match = text.match(label);
    if (match) {
        const parts = text.split(/[:-]/);
      if (parts.length > 1) {
        return normalizeText(parts.slice(1).join(":"));
      }
      const after = text.slice(match.index ?? 0 + match[0].length).trim();
      if (after) {
        return normalizeText(after);
      }
      return text;
    }
  }
  return undefined;
}

function findExperience(metaTexts: string[]): string | undefined {
  for (const text of metaTexts) {
    if (/exp[eé]rience/i.test(text) || /junior/i.test(text) || /senior/i.test(text) || /\b\d+\s*(ans|years)/i.test(text)) {
      return text;
    }
  }
  return undefined;
}

function findPostedAt(metaTexts: string[]): string | undefined {
  for (const text of metaTexts) {
    if (/publi[eé]e?/i.test(text) || /post[eé]e?/i.test(text) || /il y a/i.test(text)) {
      return text;
    }
  }
  return undefined;
}

function findLocation(metaTexts: string[], options: { includeRemote: boolean }): string | undefined {
  for (const text of metaTexts) {
    if (!text) continue;
    if (!options.includeRemote && REMOTE_KEYWORDS.some((pattern) => pattern.test(text))) {
      continue;
    }
    if (looksLikeRate(text) || /dur[eé]e/i.test(text) || /d[eé]marrage/i.test(text) || /exp[eé]rience/i.test(text)) {
      continue;
    }
    const lower = text.toLowerCase();
    if (/freelance|cdi|cdd|stage|alternance|portage/.test(lower)) {
      continue;
    }
    if (LOCATION_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      return text;
    }
    if (/\d{5}/.test(text) && /[A-Za-z]/.test(text)) {
      return text;
    }
    const words = lower.split(/[,•-]/).map((part) => part.trim());
    for (const word of words) {
      if (word.length >= 3 && /^[a-zéèêàùâûç\s]+$/.test(word) && word.split(" ").length <= 3) {
        if (!looksLikeRate(word) && !/exp[eé]rience|dur[eé]e|d[eé]marrage/.test(word)) {
          return text;
        }
      }
    }
  }
  return undefined;
}

function collectTags(root: ParentNode): string[] {
  const selectors = [".tag", "[class*='tag']", "[class*='skill']", "[class*='stack']", "[data-tag]"];
  const tags = new Set<string>();
  for (const selector of selectors) {
    const elements = root instanceof Document ? root.querySelectorAll(selector) : root.querySelectorAll(selector);
    for (const element of elements) {
      const text = normalizeText(element.textContent);
      if (!text || text.length > 40) continue;
      const className = element.getAttribute("class")?.toLowerCase() ?? "";
      const classes = className.split(/\s+/);
      if (classes.some((cls) => cls === "tags" || cls === "tags-list" || cls === "tag-list")) {
        continue;
      }
      if (element.childElementCount > 0) {
        const hasTagChild = Array.from(element.children).some((child) => {
          const childClass = child.getAttribute("class")?.toLowerCase() ?? "";
          return childClass.includes("tag");
        });
        if (hasTagChild) {
          continue;
        }
      }
      if (/^tag$/i.test(text)) continue;
      tags.add(text);
    }
  }
  return Array.from(tags);
}

function extractCompany(root: ParentNode): string | undefined {
  const headings = Array.from(root.querySelectorAll("h2, h3, strong"));
  for (const heading of headings) {
    const text = normalizeText(heading.textContent);
    if (!text) continue;
    if (/soci[eé]t[eé]|entreprise|client/i.test(text)) {
      const nextText = normalizeText(getFollowingText(heading));
      if (nextText) {
        return nextText;
      }
    }
  }
  return undefined;
}

function getFollowingText(element: Element): string {
  let node: Element | null = element.nextElementSibling;
  while (node) {
    const text = normalizeText(node.textContent);
    if (text) {
      return text;
    }
    node = node.nextElementSibling;
  }
  return "";
}

function extractDescription(main: Element | Document): string | undefined {
  const container = main instanceof Document ? main.body : main;
  if (!container) return undefined;

  const candidates = Array.from(container.querySelectorAll("article, section, div"));
  let bestText = "";
  let bestScore = 0;
  for (const candidate of candidates) {
    const text = normalizeText(candidate.textContent);
    if (text.length < 80) continue;
    const className = candidate.getAttribute("class")?.toLowerCase() ?? "";
    const dataSection = candidate.getAttribute("data-section")?.toLowerCase() ?? "";
    let score = text.length;
    if (/description|mission|detail|content|job-body|presentation/.test(className + dataSection)) {
      score += 250;
    }
    if (candidate.querySelector("p")) {
      score += 50;
    }
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  if (!bestText) {
    const fallback = normalizeText(container.textContent);
    if (fallback.length >= 120) {
      bestText = fallback;
    }
  }

  if (!bestText) {
    return undefined;
  }

  return bestText;
}

function buildCardSnippet(card: Element, title: string): string {
  const text = normalizeText(card.textContent);
  if (!text) return "";
  const cleaned = text.replace(title, "").trim();
  const snippet = cleaned.length > 0 ? cleaned : text;
  return truncate(snippet, 320);
}

function splitSegments(text: string): string[] {
  return text
    .split(/\n|•|\||,|;|\u2022/) // bullet separators
    .map((segment) => normalizeText(segment))
    .filter((segment) => Boolean(segment));
}

function detectTechnologiesFromTexts(texts: string[], stack: Set<string>) {
  for (const text of texts) {
    if (!text) continue;
    for (const tech of TECHNOLOGY_PATTERNS) {
      if (tech.pattern.test(text)) {
        stack.add(tech.label);
      }
    }
  }
}

function computeConfidence(params: {
  hasTitle: boolean;
  hasRate: boolean;
  hasLocationOrRemote: boolean;
  stackCount: number;
  descriptionLength: number;
  hasContract: boolean;
}): number {
  let score = 0.25;
  if (params.hasTitle) score += 0.2;
  if (params.hasRate) score += 0.15;
  if (params.hasLocationOrRemote) score += 0.15;
  if (params.stackCount >= 2) score += 0.1;
  else if (params.stackCount === 1) score += 0.05;
  if (params.descriptionLength >= 180) score += 0.1;
  else if (params.descriptionLength >= 60) score += 0.05;
  if (params.hasContract) score += 0.05;
  return Math.min(1, Math.max(0, score));
}

function pushEvidence(list: OfferEvidence[], label: string, snippet?: string, selector?: string) {
  if (!snippet) return;
  const normalized = truncate(snippet, 220);
  list.push({ label, snippet: normalized, selector });
}

function buildSelector(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && segments.length < 4) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
      segments.unshift(segment);
      break;
    }
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
    }
    segments.unshift(segment);
    current = current.parentElement;
  }
  return segments.join(" > ");
}

function looksLikeRate(text: string): boolean {
  return /€|eur|\beuros?|\btjm/i.test(text) && /\d/.test(text);
}

function parseRate(rawText: string): NormalizedRate | undefined {
  const raw = normalizeText(rawText);
  if (!raw) return undefined;
  const valueMatch = raw.match(/(\d+[\d\s,.]*)/);
  const currency = /€/.test(raw)
    ? "EUR"
    : /\bchf\b/i.test(raw)
      ? "CHF"
      : /\busd\b|\$/.test(raw)
        ? "USD"
        : undefined;
  const periodMatch = raw.match(/(jour|day|mois|month|an|year|semaine|week)/i);
  const period = periodMatch
    ? periodMatch[0].toLowerCase().startsWith("jour") || periodMatch[0].toLowerCase().startsWith("day")
      ? "day"
      : periodMatch[0].toLowerCase().startsWith("mois") || periodMatch[0].toLowerCase().startsWith("month")
        ? "month"
        : periodMatch[0].toLowerCase().startsWith("semaine") || periodMatch[0].toLowerCase().startsWith("week")
          ? "week"
          : "year"
    : undefined;

  let value: number | undefined;
  if (valueMatch) {
    const numeric = valueMatch[1].replace(/[\s,]/g, (char) => (char === "," ? "." : ""));
    const parsed = Number.parseFloat(numeric);
    if (!Number.isNaN(parsed)) {
      value = Number(parsed.toFixed(2));
    }
  }

  return {
    raw,
    value,
    currency,
    period,
  };
}

function truncate(value: string, max = 800): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}…`;
}

function uniqueStrings(values: string[]): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    set.add(value);
  }
  return Array.from(set);
}

function normalizeText(value: string | null | undefined): string {
  return value ? value.replace(/\s+/g, " ").trim() : "";
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

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch (error) {
    return null;
  }
}

function isFreeWorkDomain(url: URL): boolean {
  return url.hostname.endsWith(FREEWORK_HOST_SUFFIX);
}

function toAbsoluteUrl(href: string, base: URL): string | null {
  try {
    return new URL(href, base).toString();
  } catch (error) {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function currentTime(options: DetectionOptions): number {
  const nowProvider = options.now ?? (() => new Date());
  return nowProvider().getTime();
}
