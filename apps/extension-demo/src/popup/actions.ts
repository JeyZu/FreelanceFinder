import type { AnalysisResponse, AnalysisSuccessResult } from "../lib/messages";
import type { PopupElements } from "./dom";
import { setStatus, resetView, renderSuccess, renderCopyFeedback, toggleEvidence, syncTour, updateBadge } from "./render";
import { formatStatus } from "./status";
import {
  getState,
  setActiveTab,
  setAnalyzing,
  setCurrentResult,
  scheduleRetry,
  clearRetry,
  setFreeWorkTab,
  setTourIndex,
} from "./state";

const MESSAGE_TYPE = "FREELANCEFINDER_ANALYZE";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1200;
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

export async function setupPopup(elements: PopupElements): Promise<void> {
  registerEventListeners(elements);
  await initialize(elements);
}

function registerEventListeners(elements: PopupElements): void {
  elements.analyzeButton.addEventListener("click", () => handleAnalyze(elements));
  elements.resetButton.addEventListener("click", () => handleReset(elements));
  elements.copyButton.addEventListener("click", () => handleCopy(elements));
  elements.evidenceToggle.addEventListener("click", () => toggleEvidence(elements));
  elements.openTourButton.addEventListener("click", () => openTour(elements));
  elements.tourPrev.addEventListener("click", () => previousTourStep(elements));
  elements.tourNext.addEventListener("click", () => nextTourStep(elements));
  elements.tourClose.addEventListener("click", () => elements.tourDialog.close());
  elements.tourDialog.addEventListener("cancel", () => elements.tourDialog.close());
}

async function initialize(elements: PopupElements): Promise<void> {
  const tab = await getActiveTab();
  if (!tab) {
    setStatus(elements, { emoji: "⚠️", text: "Onglet actif introuvable." });
    elements.analyzeButton.disabled = true;
    elements.resetButton.disabled = false;
    return;
  }

  setActiveTab(tab.id ?? null);
  const url = tab.url ?? "";
  const isFreeWorkTab = isFreeWorkUrl(url);
  setFreeWorkTab(isFreeWorkTab);

  if (!isFreeWorkTab) {
    setStatus(elements, { emoji: "⛔", text: "Page hors périmètre FreeWork" });
    elements.analyzeButton.disabled = true;
    elements.resetButton.disabled = false;
    return;
  }

  setStatus(elements, { emoji: "🟡", text: "Prêt à analyser cette page FreeWork." });
  elements.analyzeButton.disabled = false;
}

function handleAnalyze(elements: PopupElements): void {
  const state = getState();
  if (state.isAnalyzing || state.activeTabId === null) {
    return;
  }

  clearRetry();
  setAnalyzing(true);
  setStatus(elements, { emoji: "🔍", text: "Analyse en cours…" });
  elements.resetButton.disabled = false;
  elements.analyzeButton.disabled = true;
  requestAnalysis(elements, 1);
}

function requestAnalysis(elements: PopupElements, attempt: number): void {
  const state = getState();
  if (state.activeTabId === null) {
    finalizeAnalysis(elements, { kind: "none", reason: "onglet inactif", evidence: [] });
    return;
  }

  sendMessage<AnalysisResponse>(state.activeTabId, { type: MESSAGE_TYPE })
    .then((response) => {
      if (!response) {
        throw new Error("no_response");
      }

      if (response.kind === "pending" && attempt < MAX_RETRY_ATTEMPTS) {
        setStatus(elements, formatStatus(response));
        scheduleRetry(() => requestAnalysis(elements, attempt + 1), RETRY_DELAY_MS);
        return;
      }

      finalizeAnalysis(elements, response);
    })
    .catch(() => {
      setStatus(elements, { emoji: "⚠️", text: "Aucune offre détectable — contenu inaccessible." });
      elements.analyzeButton.disabled = !getState().isFreeWorkTab;
      setAnalyzing(false);
    });
}

function finalizeAnalysis(elements: PopupElements, result: AnalysisResponse): void {
  clearRetry();
  setCurrentResult(result);
  const statusInfo = formatStatus(result);
  setStatus(elements, statusInfo);

  const state = getState();
  if (isSuccessResult(result)) {
    renderSuccess(elements, result, state.activeTabId);
  } else {
    elements.resetButton.disabled = false;
    elements.resultSection.hidden = true;
    elements.copyButton.disabled = true;
    updateBadge(state.activeTabId, "");
  }

  elements.analyzeButton.disabled = !state.isFreeWorkTab;
  setAnalyzing(false);
}

function handleReset(elements: PopupElements): void {
  clearRetry();
  setCurrentResult(null);
  resetView(elements, getState().activeTabId);

  const state = getState();
  if (state.isFreeWorkTab) {
    setStatus(elements, { emoji: "🟡", text: "Prêt à analyser cette page FreeWork." });
    elements.analyzeButton.disabled = false;
  } else {
    setStatus(elements, { emoji: "⛔", text: "Page hors périmètre FreeWork" });
    elements.analyzeButton.disabled = true;
  }

  setAnalyzing(false);
}

function handleCopy(elements: PopupElements): void {
  const state = getState();
  if (!isSuccessResult(state.currentResult)) {
    return;
  }

  const jsonString = JSON.stringify(state.currentResult.rawJson, null, 2);
  navigator.clipboard
    .writeText(jsonString)
    .then(() => {
      renderCopyFeedback(elements, "JSON copié dans le presse-papier.");
      setTimeout(() => renderCopyFeedback(elements, ""), COPY_FEEDBACK_TIMEOUT_MS);
    })
    .catch(() => {
      renderCopyFeedback(elements, "Impossible de copier automatiquement.");
    });
}

function openTour(elements: PopupElements): void {
  setTourIndex(0);
  syncTour(elements, 0);
  if (typeof elements.tourDialog.showModal === "function") {
    elements.tourDialog.showModal();
  }
}

function nextTourStep(elements: PopupElements): void {
  const state = getState();
  const lastIndex = elements.tourSteps.length - 1;
  if (state.tourIndex < lastIndex) {
    const nextIndex = state.tourIndex + 1;
    setTourIndex(nextIndex);
    syncTour(elements, nextIndex);
    return;
  }
  elements.tourDialog.close();
}

function previousTourStep(elements: PopupElements): void {
  const state = getState();
  if (state.tourIndex === 0) {
    return;
  }
  const previousIndex = state.tourIndex - 1;
  setTourIndex(previousIndex);
  syncTour(elements, previousIndex);
}

function isFreeWorkUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith("free-work.com");
  } catch (error) {
    return false;
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs && tabs.length > 0) {
    return tabs[0];
  }
  return null;
}

function sendMessage<T>(tabId: number, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(response as T);
    });
  });
}

function isSuccessResult(result: AnalysisResponse | null): result is AnalysisSuccessResult {
  return result !== null && (result.kind === "detail" || result.kind === "list");
}
