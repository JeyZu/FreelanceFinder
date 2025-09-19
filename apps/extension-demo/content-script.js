// src/lib/offer-summary.ts
var LIST_PREVIEW_LIMIT = 3;
var STACK_PREVIEW_LIMIT = 6;
function buildSummary(pageType, offers) {
  if (pageType === "detail" && offers[0]) {
    return { items: buildDetailSummary(offers[0]) };
  }
  return { items: buildListSummary(offers.slice(0, LIST_PREVIEW_LIMIT)) };
}
function buildDetailSummary(offer) {
  const items = [];
  if (offer.title) {
    items.push({ label: "Titre", value: offer.title });
  }
  const location = formatLocation(offer);
  if (location) {
    items.push({ label: "Lieu / Remote", value: location });
  }
  if (offer.contractType) {
    items.push({ label: "Contrat", value: offer.contractType });
  }
  if (offer.rate?.raw) {
    items.push({ label: "Taux", value: offer.rate.raw });
  }
  if (offer.stack.length > 0) {
    items.push({ label: "Stack", value: offer.stack.slice(0, STACK_PREVIEW_LIMIT).join(" \xB7 ") });
  }
  return items;
}
function buildListSummary(offers) {
  return offers.map((offer, index) => {
    const parts = [offer.title, formatLocation(offer), offer.rate?.raw].filter(Boolean);
    const value = parts.join(" \u2014 ") || "Offre d\xE9tect\xE9e";
    return { label: `${index + 1}.`, value };
  });
}
function formatLocation(offer) {
  const parts = [];
  if (offer.location) {
    parts.push(offer.location);
  }
  if (offer.isRemote) {
    const policy = offer.remotePolicy ?? "Remote";
    if (!parts.some((part) => part.toLowerCase().includes("remote"))) {
      parts.push(policy);
    }
  }
  if (parts.length === 0) {
    return void 0;
  }
  return parts.join(" \u2014 ");
}

// src/lib/evidence-format.ts
function flattenEvidence(offers) {
  const collected = [];
  offers.forEach((offer, index) => {
    const prefix = offers.length > 1 ? `${index + 1}. ` : "";
    offer.evidence.forEach((entry) => {
      collected.push(`${prefix}${formatLabel(entry.label)} \u2014 ${entry.snippet}`);
    });
  });
  return collected;
}
function formatLabel(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// src/lib/result-mapper.ts
function mapDetectionOutcome(outcome, context) {
  if (outcome.status === "out_of_scope") {
    return {
      kind: "out_of_scope",
      evidence: [`URL analys\xE9e : ${context.url}`]
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
      source: "detector"
    };
    return {
      kind: outcome.pageType === "detail" ? "detail" : "list",
      offersCount: outcome.offers.length,
      summary,
      rawJson,
      evidence
    };
  }
  const reason = outcome.diagnostics?.reason;
  if (outcome.status === "content_delayed") {
    return {
      kind: "pending",
      reason: reason ?? "contenu tardif",
      evidence: ["Contenu encore en chargement d\xE9tect\xE9 par le moteur FreeWork."]
    };
  }
  return {
    kind: "none",
    reason,
    evidence: reason ? [`Motif : ${reason}.`] : []
  };
}

// src/lib/detector-loader.ts
var detectorPromise = null;
var importer = defaultImporter;
async function loadDetector() {
  if (!detectorPromise) {
    detectorPromise = importer().then(validateModule);
  }
  try {
    return await detectorPromise;
  } catch (error) {
    detectorPromise = null;
    throw error;
  }
}
function validateModule(module) {
  if (typeof module.detectFreeWorkOffers !== "function") {
    throw new Error("detector_export_missing");
  }
  return module.detectFreeWorkOffers;
}
function defaultImporter() {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== "function") {
    throw new Error("chrome_runtime_unavailable");
  }
  return import(runtime.getURL("detector.js"));
}

// src/content-script.ts
var MESSAGE_TYPE = "FREELANCEFINDER_ANALYZE";
async function analyzeCurrentDocument() {
  const url = window.location.href;
  const detect = await loadDetector();
  const outcome = await detect(document, { url });
  const context = { url, detectedAt: (/* @__PURE__ */ new Date()).toISOString() };
  return mapDetectionOutcome(outcome, context);
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== MESSAGE_TYPE) {
    return;
  }
  analyzeCurrentDocument().then((result) => sendResponse(result)).catch(() => {
    sendResponse({
      kind: "none",
      reason: "erreur inattendue",
      evidence: ["Une erreur interne a interrompu la d\xE9tection."]
    });
  });
  return true;
});
