// ../../packages/detectors/src/utils/time.ts
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function timestamp(options) {
  const nowProvider = options.now ?? (() => /* @__PURE__ */ new Date());
  return nowProvider().getTime();
}

// ../../packages/detectors/src/state/poller.ts
async function pollUntil(options, config, check, isReady) {
  const start = timestamp(options);
  const deadline = start + config.maxWaitMs;
  let attempts = 1;
  let value = check();
  if (isReady(value)) {
    const waited = Math.max(0, timestamp(options) - start);
    return { value, attempts, waitedMs: waited };
  }
  for (let now = start; now < deadline; now = timestamp(options)) {
    const remaining = Math.max(0, deadline - now);
    const waitDuration = Math.min(config.pollIntervalMs, remaining);
    if (waitDuration > 0) {
      await delay(waitDuration);
    }
    attempts += 1;
    value = check();
    if (isReady(value)) {
      const waited = Math.max(0, timestamp(options) - start);
      return { value, attempts, waitedMs: waited };
    }
  }
  const waitedMs = Math.max(0, timestamp(options) - start);
  return { value, attempts, waitedMs };
}

// ../../packages/detectors/src/utils/url.ts
var FREEWORK_HOST_SUFFIX = "free-work.com";
function safeParseUrl(url) {
  try {
    return new URL(url);
  } catch (error) {
    return null;
  }
}
function isFreeWorkDomain(url) {
  return url.hostname.endsWith(FREEWORK_HOST_SUFFIX);
}
function toAbsoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch (error) {
    return null;
  }
}

// ../../packages/detectors/src/parsing/heading.ts
function findMainHeading(root) {
  const heading = root.querySelector("h1") ?? root.querySelector("h2");
  return heading;
}

// ../../packages/detectors/src/normalize/text.ts
function normalizeText(value) {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}
function truncate(value, max = 800) {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}\u2026`;
}

// ../../packages/detectors/src/parsing/meta.ts
function collectMetaTexts(root) {
  const selectors = [".meta", "[class*='meta']", "[class*='info']", "header", "ul", "dl"];
  const collected = /* @__PURE__ */ new Set();
  for (const selector of selectors) {
    const scope = root instanceof Document ? root : root;
    const elements = scope.querySelectorAll(selector);
    for (const element of elements) {
      const nodes = element.querySelectorAll("span, div, li, dt, dd, p");
      for (const child of Array.from(nodes)) {
        const text = normalizeText(child.textContent);
        if (!text || text.length > 140) continue;
        collected.add(text);
      }
    }
  }
  if (root instanceof Element) {
    const inlineCandidates = root.querySelectorAll("span, li, p");
    for (const node of Array.from(inlineCandidates)) {
      const text = normalizeText(node.textContent);
      if (!text || text.length > 140) continue;
      collected.add(text);
    }
  }
  return Array.from(collected);
}
function findByLabel(metaTexts, label) {
  for (const text of metaTexts) {
    const match = text.match(label);
    if (match) {
      const parts = text.split(/[:-]/);
      if (parts.length > 1) {
        return normalizeText(parts.slice(1).join(":"));
      }
      const after = text.slice((match.index ?? 0) + match[0].length).trim();
      if (after) {
        return normalizeText(after);
      }
      return text;
    }
  }
  return void 0;
}
function findExperience(metaTexts) {
  for (const text of metaTexts) {
    if (/exp[eé]rience/i.test(text) || /junior/i.test(text) || /senior/i.test(text) || /\b\d+\s*(ans|years)/i.test(text)) {
      return text;
    }
  }
  return void 0;
}
function findPostedAt(metaTexts) {
  for (const text of metaTexts) {
    if (/publi[eé]e?/i.test(text) || /post[eé]e?/i.test(text) || /il y a/i.test(text)) {
      return text;
    }
  }
  return void 0;
}

// ../../packages/detectors/src/parsing/contract.ts
var CONTRACT_PATTERNS = [
  { pattern: /freelance/i, label: "Freelance" },
  { pattern: /cdi/i, label: "CDI" },
  { pattern: /cdd/i, label: "CDD" },
  { pattern: /portage/i, label: "Portage" },
  { pattern: /stage/i, label: "Stage" },
  { pattern: /alternance/i, label: "Alternance" }
];
function findContractType(metaTexts) {
  for (const { pattern, label } of CONTRACT_PATTERNS) {
    if (metaTexts.some((text) => pattern.test(text))) {
      return label;
    }
  }
  return void 0;
}

// ../../packages/detectors/src/normalize/remote.ts
var REMOTE_PATTERNS = [
  /full\s*remote/i,
  /remote/i,
  /télétravail/i,
  /teletravail/i,
  /hybride/i,
  /home\s*office/i
];
function detectRemote(texts) {
  for (const text of texts) {
    if (!text) continue;
    for (const pattern of REMOTE_PATTERNS) {
      if (pattern.test(text)) {
        return { isRemote: true, snippet: text, policy: normalizeRemotePolicy(text) };
      }
    }
  }
  return { isRemote: false };
}
function normalizeRemotePolicy(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("hybride")) {
    return "hybrid";
  }
  if (normalized.includes("full")) {
    return "full-remote";
  }
  if (normalized.includes("remote") || normalized.includes("t\xE9l\xE9travail") || normalized.includes("teletravail")) {
    return "remote";
  }
  return void 0;
}

// ../../packages/detectors/src/normalize/rate.ts
var RATE_KEYWORDS = /(jour|day|mois|month|an|year|semaine|week|heure|hour)/i;
var RATE_NUMERIC_PATTERN = /(\d+[\d\s,.]*)/;
function looksLikeRate(text) {
  return /€|eur|\beuros?|\btjm/i.test(text) && /\d/.test(text);
}
function parseRate(rawText) {
  const raw = normalizeText(rawText);
  if (!raw) return void 0;
  const valueMatch = raw.match(RATE_NUMERIC_PATTERN);
  const periodMatch = raw.match(RATE_KEYWORDS);
  let value;
  if (valueMatch) {
    const numeric = valueMatch[1].replace(/[\s,]/g, (char) => char === "," ? "." : "");
    const parsed = Number.parseFloat(numeric);
    if (!Number.isNaN(parsed)) {
      value = Number(parsed.toFixed(2));
    }
  }
  const currency = /€/.test(raw) ? "EUR" : /\bchf\b/i.test(raw) ? "CHF" : /\busd\b|\$/.test(raw) ? "USD" : void 0;
  const period = periodMatch ? normalizePeriod(periodMatch[0]) : void 0;
  return { raw, value, currency, period };
}
function normalizePeriod(token) {
  const lowered = token.toLowerCase();
  if (lowered.startsWith("jour") || lowered.startsWith("day")) {
    return "day";
  }
  if (lowered.startsWith("mois") || lowered.startsWith("month")) {
    return "month";
  }
  if (lowered.startsWith("semaine") || lowered.startsWith("week")) {
    return "week";
  }
  if (lowered.includes("heure") || lowered.includes("hour")) {
    return "hour";
  }
  return "year";
}

// ../../packages/detectors/src/normalize/location.ts
var LOCATION_KEYWORDS = [
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
  "t\xE9l\xE9travail",
  "remote",
  "hybride",
  "france",
  "idf"
];
function findLocation(metaTexts, options) {
  for (const text of metaTexts) {
    if (!text) continue;
    if (!options.includeRemote && REMOTE_PATTERNS.some((pattern) => pattern.test(text))) {
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
  return void 0;
}

// ../../packages/detectors/src/parsing/tags.ts
function collectTags(root) {
  const selectors = [".tag", "[class*='tag']", "[class*='skill']", "[class*='stack']", "[data-tag]"];
  const tags = /* @__PURE__ */ new Set();
  for (const selector of selectors) {
    const scope = root instanceof Document ? root : root;
    const elements = scope.querySelectorAll(selector);
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

// ../../packages/detectors/src/parsing/company.ts
function extractCompany(root) {
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
  return void 0;
}
function getFollowingText(element) {
  let node = element.nextElementSibling;
  while (node) {
    const text = normalizeText(node.textContent);
    if (text) {
      return text;
    }
    node = node.nextElementSibling;
  }
  return "";
}

// ../../packages/detectors/src/parsing/description.ts
function extractDescription(main) {
  const container = main instanceof Document ? main.body : main;
  if (!container) return void 0;
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
    return void 0;
  }
  return truncate(bestText, 900);
}

// ../../packages/detectors/src/parsing/technologies.ts
var TECHNOLOGY_PATTERNS = [
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
  { label: "Elasticsearch", pattern: /elasticsearch|elastic/i }
];
function detectTechnologiesFromTexts(texts, stack) {
  for (const text of texts) {
    if (!text) continue;
    for (const tech of TECHNOLOGY_PATTERNS) {
      if (tech.pattern.test(text)) {
        stack.add(tech.label);
      }
    }
  }
}

// ../../packages/detectors/src/utils/selectors.ts
function buildSelector(element) {
  const segments = [];
  let current = element;
  while (current && segments.length < 4) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
      segments.unshift(segment);
      break;
    }
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
    }
    segments.unshift(segment);
    current = current.parentElement;
  }
  return segments.join(" > ");
}

// ../../packages/detectors/src/state/evidence.ts
function populateEvidence(offer, titleElement, parts) {
  const evidence = [];
  pushEvidence(evidence, "title", offer.title, titleElement ? buildSelector(titleElement) : void 0);
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
function pushEvidence(list, label, snippet, selector) {
  if (!snippet) return;
  const normalized = truncate(snippet, 220);
  list.push({ label, snippet: normalized, selector });
}

// ../../packages/detectors/src/state/confidence.ts
function computeConfidence(params) {
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

// ../../packages/detectors/src/freework/detail.ts
function extractDetailOffer(document, pageUrl) {
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
    metaData
  });
  applyConfidence(offer, stack.length, description?.length ?? 0, metaData);
  populateEvidence(offer, heading, buildEvidence(metaData, description, tags));
  const readiness = evaluateReadiness(stack.length, description?.length ?? 0, metaData);
  return { offer, ready: readiness.ready, reason: readiness.reason };
}
function resolveDetailRoot(document) {
  return document.querySelector("main") ?? document.body;
}
function isValidTitle(value) {
  return Boolean(value && value.trim().length >= 6);
}
function buildMetaData(main) {
  const texts = collectMetaTexts(main);
  const rateText = texts.find(looksLikeRate);
  const rate = rateText ? parseRate(rateText) : void 0;
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
    postedAt: findPostedAt(texts)
  };
}
function buildStack(metaTexts, description, tags) {
  const stackSet = new Set(tags);
  detectTechnologiesFromTexts([...metaTexts, description ?? ""], stackSet);
  return Array.from(stackSet);
}
function assembleOffer(params) {
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
    evidence: []
  };
}
function applyConfidence(offer, stackCount, descriptionLength, metaData) {
  offer.confidence = computeConfidence({
    hasTitle: Boolean(offer.title),
    hasRate: Boolean(metaData.rate),
    hasLocationOrRemote: Boolean(metaData.location || metaData.remote.isRemote),
    stackCount,
    descriptionLength,
    hasContract: Boolean(metaData.contractType)
  });
}
function buildEvidence(metaData, description, tags) {
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
    tags
  };
}
function evaluateReadiness(stackCount, descriptionLength, metaData) {
  const essentialSignals = [
    Boolean(metaData.rate),
    Boolean(metaData.location || metaData.remote.isRemote),
    stackCount >= 2,
    descriptionLength >= 150
  ];
  const ready = essentialSignals.filter(Boolean).length >= 2 && descriptionLength >= 120;
  return ready ? { ready } : { ready: false, reason: "informations partielles" };
}

// ../../packages/detectors/src/parsing/cards.ts
function splitSegments(text) {
  return text.split(/\n|•|\||,|;|\u2022/).map((segment) => normalizeText(segment)).filter((segment) => Boolean(segment));
}
function buildCardSnippet(card, title) {
  const text = normalizeText(card.textContent);
  if (!text) return "";
  const cleaned = text.replace(title, "").trim();
  const snippet = cleaned.length > 0 ? cleaned : text;
  return truncate(snippet, 320);
}

// ../../packages/detectors/src/utils/collections.ts
function uniqueStrings(values) {
  const set = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (!value) continue;
    set.add(value);
  }
  return Array.from(set);
}

// ../../packages/detectors/src/freework/list.ts
function extractListOffers(document, pageUrl) {
  const offers = [];
  const cards = findOfferCards(document);
  for (const card of cards) {
    const offer = buildOfferFromCard(card, pageUrl);
    if (offer) {
      offers.push(offer);
    }
  }
  return offers;
}
function findOfferCards(document) {
  const seen = /* @__PURE__ */ new Set();
  const cards = [];
  const anchors = Array.from(document.querySelectorAll("a[href]"));
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
function buildOfferFromCard(card, pageUrl) {
  const absoluteUrl = toAbsoluteUrl(card.anchor.getAttribute("href") ?? "", pageUrl);
  if (!absoluteUrl) {
    return null;
  }
  const segments = collectCardSegments(card);
  const meta = deriveMetaData(segments);
  const tags = collectTags(card.root);
  const stack = buildCardStack(card.title, segments, tags);
  const snippet = buildCardSnippet(card.root, card.title);
  const offer = {
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
    evidence: []
  };
  applyCardConfidence(offer, stack.length, snippet.length, meta);
  populateEvidence(offer, card.anchor, buildCardEvidence(meta, snippet, offer.tags));
  return offer;
}
function collectCardSegments(card) {
  const cardText = normalizeText(card.root.textContent);
  const segments = splitSegments(cardText);
  const metaCandidates = collectMetaTexts(card.root);
  return uniqueStrings([...segments, ...metaCandidates]);
}
function deriveMetaData(segments) {
  const rateText = segments.find(looksLikeRate);
  const rate = rateText ? parseRate(rateText) : void 0;
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
    contractType: findContractType(segments)
  };
}
function buildCardStack(title, segments, tags) {
  const stackSet = /* @__PURE__ */ new Set();
  detectTechnologiesFromTexts([title, ...segments], stackSet);
  tags.forEach((tag) => stackSet.add(tag));
  return Array.from(stackSet);
}
function applyCardConfidence(offer, stackCount, descriptionLength, meta) {
  offer.confidence = computeConfidence({
    hasTitle: Boolean(offer.title),
    hasRate: Boolean(meta.rate),
    hasLocationOrRemote: Boolean(meta.location || meta.remote.isRemote),
    stackCount,
    descriptionLength,
    hasContract: Boolean(meta.contractType)
  });
}
function buildCardEvidence(meta, snippet, tags) {
  return {
    rateText: meta.rateText,
    location: meta.location,
    contractType: meta.contractType,
    descriptionSnippet: snippet,
    remoteSnippet: meta.remote.snippet,
    tags
  };
}

// ../../packages/detectors/src/freework/detector.ts
var DEFAULT_MAX_WAIT_MS = 1800;
var DEFAULT_POLL_INTERVAL_MS = 40;
async function detectFreeWorkOffers(document, options) {
  const pageUrl = ensureFreeWorkUrl(options.url);
  if (!pageUrl) {
    return buildOutOfScopeOutcome();
  }
  const pollingConfig = resolvePollingConfig(options);
  const pollResult = await pollUntil(
    options,
    pollingConfig,
    () => analyseDocument(document, pageUrl),
    isSuccessfulAnalysis
  );
  return finalizeOutcome(pollResult.value, pollResult);
}
function ensureFreeWorkUrl(rawUrl) {
  const parsedUrl = safeParseUrl(rawUrl);
  if (!parsedUrl || !isFreeWorkDomain(parsedUrl)) {
    return null;
  }
  return parsedUrl;
}
function resolvePollingConfig(options) {
  return {
    maxWaitMs: options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS,
    pollIntervalMs: options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  };
}
function isSuccessfulAnalysis(analysis) {
  return analysis.ready && analysis.offers.length > 0;
}
function buildOutOfScopeOutcome() {
  return {
    status: "out_of_scope",
    message: "Page hors p\xE9rim\xE8tre FreeWork",
    pageType: "unknown",
    offers: []
  };
}
function finalizeOutcome(analysis, pollResult) {
  if (analysis.offers.length > 0) {
    return {
      status: "ok",
      message: analysis.message ?? buildSuccessMessage(analysis.pageType, analysis.offers.length),
      pageType: analysis.pageType,
      offers: analysis.offers,
      diagnostics: {
        attempts: pollResult.attempts,
        waitedMs: pollResult.waitedMs
      }
    };
  }
  const reason = analysis.reason ?? "contenu insuffisant";
  const status = reason === "contenu tardif" ? "content_delayed" : "no_offers";
  return {
    status,
    message: `Aucune offre d\xE9tectable (${reason})`,
    pageType: analysis.pageType,
    offers: [],
    diagnostics: {
      attempts: pollResult.attempts,
      waitedMs: pollResult.waitedMs,
      reason
    }
  };
}
function analyseDocument(document, pageUrl) {
  const detail = extractDetailOffer(document, pageUrl);
  if (detail.offer && detail.ready) {
    return {
      pageType: "detail",
      offers: [detail.offer],
      ready: true,
      message: "Offre d\xE9tect\xE9e (d\xE9tail)"
    };
  }
  const listOffers = extractListOffers(document, pageUrl);
  if (listOffers.length >= 2) {
    return {
      pageType: "list",
      offers: listOffers,
      ready: true,
      message: `Liste d\xE9tect\xE9e : ${listOffers.length} offres`
    };
  }
  if (detail.offer) {
    return {
      pageType: "detail",
      offers: [],
      ready: false,
      reason: detail.reason ?? "informations partielles"
    };
  }
  if (listOffers.length === 1) {
    return {
      pageType: "list",
      offers: [],
      ready: false,
      reason: "une seule carte d\xE9tect\xE9e"
    };
  }
  const hasHeading = Boolean(findMainHeading(document));
  return {
    pageType: "unknown",
    offers: [],
    ready: false,
    reason: hasHeading ? "structure atypique" : "contenu tardif"
  };
}
function buildSuccessMessage(pageType, count) {
  if (pageType === "list") {
    return `Liste d\xE9tect\xE9e : ${count} offres`;
  }
  if (pageType === "detail") {
    return "Offre d\xE9tect\xE9e (d\xE9tail)";
  }
  return "D\xE9tection FreeWork";
}

export { detectFreeWorkOffers };
