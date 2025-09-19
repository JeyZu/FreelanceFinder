// src/popup/dom.ts
function getElements() {
  const statusContainer = requireElement(document.getElementById("status"));
  return {
    statusContainer,
    statusEmoji: requireElement(statusContainer.querySelector(".status-emoji")),
    statusText: requireElement(document.getElementById("status-text")),
    analyzeButton: requireElement(document.getElementById("analyze")),
    resetButton: requireElement(document.getElementById("reset")),
    copyButton: requireElement(document.getElementById("copy")),
    copyFeedback: requireElement(document.getElementById("copy-feedback")),
    resultSection: requireElement(document.getElementById("result")),
    summaryList: requireElement(document.getElementById("summary")),
    jsonOutput: requireElement(document.getElementById("json-output")),
    jsonPanel: requireElement(document.getElementById("json-panel")),
    evidenceToggle: requireElement(document.getElementById("toggle-evidence")),
    evidenceList: requireElement(document.getElementById("evidence-list")),
    openTourButton: requireElement(document.getElementById("open-tour")),
    tourDialog: requireElement(document.getElementById("tour")),
    tourSteps: Array.from(document.querySelectorAll(".tour-step")),
    tourPrev: requireElement(document.getElementById("tour-prev")),
    tourNext: requireElement(document.getElementById("tour-next")),
    tourClose: requireElement(document.getElementById("tour-close"))
  };
}
function requireElement(value) {
  if (!value) {
    throw new Error("popup_element_missing");
  }
  return value;
}

// src/popup/render.ts
function setStatus(elements, info) {
  elements.statusEmoji.textContent = info.emoji;
  elements.statusText.textContent = info.text;
}
function resetView(elements, activeTabId) {
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
function renderSuccess(elements, result, activeTabId) {
  elements.resultSection.hidden = false;
  elements.resetButton.disabled = false;
  elements.copyButton.disabled = false;
  renderSummary(elements, result);
  renderEvidence(elements, result.evidence);
  renderJson(elements, result.rawJson);
  updateBadge(activeTabId, result.offersCount > 0 ? String(result.offersCount) : "");
}
function renderEvidence(elements, evidence) {
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
function renderJson(elements, payload) {
  elements.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}
function renderSummary(elements, result) {
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
function updateBadge(activeTabId, text) {
  if (activeTabId === null) {
    return;
  }
  chrome.action.setBadgeBackgroundColor({ tabId: activeTabId, color: "#0f766e" });
  chrome.action.setBadgeText({ tabId: activeTabId, text });
}
function toggleEvidence(elements) {
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
function renderCopyFeedback(elements, message) {
  elements.copyFeedback.textContent = message;
}
function syncTour(elements, index) {
  elements.tourSteps.forEach((step, position) => {
    step.hidden = position !== index;
  });
  elements.tourPrev.disabled = index === 0;
  elements.tourNext.textContent = index === elements.tourSteps.length - 1 ? "Terminer" : "Suivant";
}

// src/popup/status.ts
function formatStatus(result) {
  if (!result) {
    return { emoji: "\u{1F7E1}", text: "Pr\xEAt \xE0 analyser." };
  }
  if (result.kind === "detail") {
    const count = result.offersCount || 1;
    return { emoji: "\u2705", text: `D\xE9tail d\xE9tect\xE9 (${count} offre)` };
  }
  if (result.kind === "list") {
    const count = result.offersCount || 0;
    return { emoji: "\u2705", text: `Liste d\xE9tect\xE9e : ${count} offre${count > 1 ? "s" : ""}` };
  }
  if (result.kind === "out_of_scope") {
    return { emoji: "\u26D4", text: "Page hors p\xE9rim\xE8tre FreeWork" };
  }
  if (result.kind === "pending") {
    return { emoji: "\u23F3", text: "Contenu en cours de chargement, r\xE9essayez." };
  }
  if (result.kind === "none") {
    const reason = result.reason ? ` \u2014 ${capitalizeFirst(result.reason)}` : "";
    return { emoji: "\u26A0\uFE0F", text: `Aucune offre d\xE9tectable${reason}` };
  }
  return { emoji: "\u26A0\uFE0F", text: "Aucune offre d\xE9tectable." };
}
function capitalizeFirst(text) {
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// src/popup/state.ts
var state = {
  activeTabId: null,
  currentResult: null,
  isAnalyzing: false,
  retryTimeoutId: null,
  isFreeWorkTab: false,
  tourIndex: 0
};
function getState() {
  return state;
}
function setActiveTab(tabId) {
  state.activeTabId = tabId;
}
function setFreeWorkTab(value) {
  state.isFreeWorkTab = value;
}
function setAnalyzing(value) {
  state.isAnalyzing = value;
}
function setCurrentResult(result) {
  state.currentResult = result;
}
function scheduleRetry(callback, delayMs) {
  clearRetry();
  state.retryTimeoutId = setTimeout(callback, delayMs);
}
function clearRetry() {
  if (state.retryTimeoutId) {
    clearTimeout(state.retryTimeoutId);
    state.retryTimeoutId = null;
  }
}
function setTourIndex(value) {
  state.tourIndex = value;
}

// src/popup/actions.ts
var MESSAGE_TYPE = "FREELANCEFINDER_ANALYZE";
var MAX_RETRY_ATTEMPTS = 3;
var RETRY_DELAY_MS = 1200;
var COPY_FEEDBACK_TIMEOUT_MS = 2e3;
async function setupPopup(elements) {
  registerEventListeners(elements);
  await initialize(elements);
}
function registerEventListeners(elements) {
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
async function initialize(elements) {
  const tab = await getActiveTab();
  if (!tab) {
    setStatus(elements, { emoji: "\u26A0\uFE0F", text: "Onglet actif introuvable." });
    elements.analyzeButton.disabled = true;
    elements.resetButton.disabled = false;
    return;
  }
  setActiveTab(tab.id ?? null);
  const url = tab.url ?? "";
  const isFreeWorkTab = isFreeWorkUrl(url);
  setFreeWorkTab(isFreeWorkTab);
  if (!isFreeWorkTab) {
    setStatus(elements, { emoji: "\u26D4", text: "Page hors p\xE9rim\xE8tre FreeWork" });
    elements.analyzeButton.disabled = true;
    elements.resetButton.disabled = false;
    return;
  }
  setStatus(elements, { emoji: "\u{1F7E1}", text: "Pr\xEAt \xE0 analyser cette page FreeWork." });
  elements.analyzeButton.disabled = false;
}
function handleAnalyze(elements) {
  const state2 = getState();
  if (state2.isAnalyzing || state2.activeTabId === null) {
    return;
  }
  clearRetry();
  setAnalyzing(true);
  setStatus(elements, { emoji: "\u{1F50D}", text: "Analyse en cours\u2026" });
  elements.resetButton.disabled = false;
  elements.analyzeButton.disabled = true;
  requestAnalysis(elements, 1);
}
function requestAnalysis(elements, attempt) {
  const state2 = getState();
  if (state2.activeTabId === null) {
    finalizeAnalysis(elements, { kind: "none", reason: "onglet inactif", evidence: [] });
    return;
  }
  sendMessage(state2.activeTabId, { type: MESSAGE_TYPE }).then((response) => {
    if (!response) {
      throw new Error("no_response");
    }
    if (response.kind === "pending" && attempt < MAX_RETRY_ATTEMPTS) {
      setStatus(elements, formatStatus(response));
      scheduleRetry(() => requestAnalysis(elements, attempt + 1), RETRY_DELAY_MS);
      return;
    }
    finalizeAnalysis(elements, response);
  }).catch(() => {
    setStatus(elements, { emoji: "\u26A0\uFE0F", text: "Aucune offre d\xE9tectable \u2014 contenu inaccessible." });
    elements.analyzeButton.disabled = !getState().isFreeWorkTab;
    setAnalyzing(false);
  });
}
function finalizeAnalysis(elements, result) {
  clearRetry();
  setCurrentResult(result);
  const statusInfo = formatStatus(result);
  setStatus(elements, statusInfo);
  const state2 = getState();
  if (isSuccessResult(result)) {
    renderSuccess(elements, result, state2.activeTabId);
  } else {
    elements.resetButton.disabled = false;
    elements.resultSection.hidden = true;
    elements.copyButton.disabled = true;
    updateBadge(state2.activeTabId, "");
  }
  elements.analyzeButton.disabled = !state2.isFreeWorkTab;
  setAnalyzing(false);
}
function handleReset(elements) {
  clearRetry();
  setCurrentResult(null);
  resetView(elements, getState().activeTabId);
  const state2 = getState();
  if (state2.isFreeWorkTab) {
    setStatus(elements, { emoji: "\u{1F7E1}", text: "Pr\xEAt \xE0 analyser cette page FreeWork." });
    elements.analyzeButton.disabled = false;
  } else {
    setStatus(elements, { emoji: "\u26D4", text: "Page hors p\xE9rim\xE8tre FreeWork" });
    elements.analyzeButton.disabled = true;
  }
  setAnalyzing(false);
}
function handleCopy(elements) {
  const state2 = getState();
  if (!isSuccessResult(state2.currentResult)) {
    return;
  }
  const jsonString = JSON.stringify(state2.currentResult.rawJson, null, 2);
  navigator.clipboard.writeText(jsonString).then(() => {
    renderCopyFeedback(elements, "JSON copi\xE9 dans le presse-papier.");
    setTimeout(() => renderCopyFeedback(elements, ""), COPY_FEEDBACK_TIMEOUT_MS);
  }).catch(() => {
    renderCopyFeedback(elements, "Impossible de copier automatiquement.");
  });
}
function openTour(elements) {
  setTourIndex(0);
  syncTour(elements, 0);
  if (typeof elements.tourDialog.showModal === "function") {
    elements.tourDialog.showModal();
  }
}
function nextTourStep(elements) {
  const state2 = getState();
  const lastIndex = elements.tourSteps.length - 1;
  if (state2.tourIndex < lastIndex) {
    const nextIndex = state2.tourIndex + 1;
    setTourIndex(nextIndex);
    syncTour(elements, nextIndex);
    return;
  }
  elements.tourDialog.close();
}
function previousTourStep(elements) {
  const state2 = getState();
  if (state2.tourIndex === 0) {
    return;
  }
  const previousIndex = state2.tourIndex - 1;
  setTourIndex(previousIndex);
  syncTour(elements, previousIndex);
}
function isFreeWorkUrl(url) {
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
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs && tabs.length > 0) {
    return tabs[0];
  }
  return null;
}
function sendMessage(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
function isSuccessResult(result) {
  return result !== null && (result.kind === "detail" || result.kind === "list");
}

// src/popup/popup.ts
async function bootstrap() {
  try {
    const elements = getElements();
    await setupPopup(elements);
  } catch (error) {
    console.error("popup_init_failed", error);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
