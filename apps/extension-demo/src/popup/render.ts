import type { AnalysisSuccessResult } from "../lib/messages";
import type { PopupElements } from "./dom";
import type { StatusInfo } from "./status";

export function setStatus(elements: PopupElements, info: StatusInfo): void {
  elements.statusEmoji.textContent = info.emoji;
  elements.statusText.textContent = info.text;
}

export function resetView(elements: PopupElements, activeTabId: number | null): void {
  elements.resultSection.hidden = true;
  elements.summaryList.innerHTML = "";
  elements.jsonOutput.textContent = "";
  elements.jsonPanel.open = false;
  elements.copyButton.disabled = true;
  elements.evidenceToggle.disabled = true;
  elements.evidenceToggle.setAttribute("aria-expanded", "false");
  elements.evidenceToggle.textContent = "Voir les indices";
  elements.evidenceList.hidden = true;
  elements.evidenceList.innerHTML = "";
  elements.copyFeedback.textContent = "";
  elements.resetButton.disabled = true;
  updateBadge(activeTabId, "");
}

export function renderSuccess(
  elements: PopupElements,
  result: AnalysisSuccessResult,
  activeTabId: number | null,
): void {
  elements.resultSection.hidden = false;
  elements.resetButton.disabled = false;
  elements.copyButton.disabled = false;
  renderSummary(elements, result);
  renderEvidence(elements, result.evidence);
  renderJson(elements, result.rawJson);
  updateBadge(activeTabId, result.offersCount > 0 ? String(result.offersCount) : "");
}

export function renderEvidence(elements: PopupElements, evidence: string[]): void {
  elements.evidenceList.innerHTML = "";
  if (evidence.length === 0) {
    elements.evidenceToggle.disabled = true;
    elements.evidenceList.hidden = true;
    elements.evidenceToggle.setAttribute("aria-expanded", "false");
    elements.evidenceToggle.textContent = "Voir les indices";
    return;
  }

  elements.evidenceToggle.disabled = false;
  elements.evidenceList.hidden = true;
  elements.evidenceToggle.textContent = "Voir les indices";
  elements.evidenceToggle.setAttribute("aria-expanded", "false");
  evidence.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    elements.evidenceList.appendChild(item);
  });
}

export function renderJson(elements: PopupElements, payload: Record<string, unknown>): void {
  elements.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}

export function renderSummary(elements: PopupElements, result: AnalysisSuccessResult): void {
  elements.summaryList.innerHTML = "";
  result.summary.items.forEach((item) => {
    const listItem = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = item.label;
    listItem.appendChild(strong);
    const textNode = document.createElement("span");
    textNode.textContent = item.value;
    listItem.appendChild(textNode);
    elements.summaryList.appendChild(listItem);
  });
}

export function updateBadge(activeTabId: number | null, text: string): void {
  if (activeTabId === null) {
    return;
  }
  chrome.action.setBadgeBackgroundColor({ tabId: activeTabId, color: "#0f766e" });
  chrome.action.setBadgeText({ tabId: activeTabId, text });
}

export function toggleEvidence(elements: PopupElements): void {
  const isHidden = elements.evidenceList.hidden;
  if (isHidden) {
    elements.evidenceList.hidden = false;
    elements.evidenceToggle.textContent = "Masquer les indices";
    elements.evidenceToggle.setAttribute("aria-expanded", "true");
  } else {
    elements.evidenceList.hidden = true;
    elements.evidenceToggle.textContent = "Voir les indices";
    elements.evidenceToggle.setAttribute("aria-expanded", "false");
  }
}

export function renderCopyFeedback(elements: PopupElements, message: string): void {
  elements.copyFeedback.textContent = message;
}

export function syncTour(elements: PopupElements, index: number): void {
  elements.tourSteps.forEach((step, position) => {
    step.hidden = position !== index;
  });
  elements.tourPrev.disabled = index === 0;
  elements.tourNext.textContent = index === elements.tourSteps.length - 1 ? "Terminer" : "Suivant";
}
