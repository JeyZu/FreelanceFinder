import { mapDetectionOutcome } from "./lib/result-mapper";
import type { AnalysisResponse } from "./lib/messages";
import { loadDetector } from "./lib/detector-loader";

const MESSAGE_TYPE = "FREELANCEFINDER_ANALYZE";

/**
 * Transforme le document courant en réponse structurée pour la popup.
 * Les erreurs sont remontées au caller pour être traduites en message utilisateur.
 */
async function analyzeCurrentDocument(): Promise<AnalysisResponse> {
  const url = window.location.href;
  const detect = await loadDetector();
  const outcome = await detect(document, { url });
  const context = { url, detectedAt: new Date().toISOString() };
  return mapDetectionOutcome(outcome, context);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== MESSAGE_TYPE) {
    return;
  }

  analyzeCurrentDocument()
    .then((result) => sendResponse(result))
    .catch(() => {
      sendResponse({
        kind: "none",
        reason: "erreur inattendue",
        evidence: ["Une erreur interne a interrompu la détection."],
      });
    });

  return true;
});
