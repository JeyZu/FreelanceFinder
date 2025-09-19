const statusContainer = document.getElementById('status');
const statusEmoji = statusContainer.querySelector('.status-emoji');
const statusText = document.getElementById('status-text');
const analyzeButton = document.getElementById('analyze');
const resetButton = document.getElementById('reset');
const copyButton = document.getElementById('copy');
const copyFeedback = document.getElementById('copy-feedback');
const resultSection = document.getElementById('result');
const summaryList = document.getElementById('summary');
const jsonOutput = document.getElementById('json-output');
const jsonPanel = document.getElementById('json-panel');
const evidenceToggle = document.getElementById('toggle-evidence');
const evidenceList = document.getElementById('evidence-list');
const openTourButton = document.getElementById('open-tour');
const tourDialog = document.getElementById('tour');
const tourSteps = Array.from(tourDialog.querySelectorAll('.tour-step'));
const tourPrev = document.getElementById('tour-prev');
const tourNext = document.getElementById('tour-next');
const tourClose = document.getElementById('tour-close');

let activeTabId = null;
let currentResult = null;
let retryTimeout = null;
let isAnalyzing = false;
let tourIndex = 0;
let isFreeWorkTab = false;

function setStatus(emoji, text) {
  statusEmoji.textContent = emoji;
  statusText.textContent = text;
}

function disableAnalysis() {
  analyzeButton.disabled = true;
}

function enableAnalysis() {
  analyzeButton.disabled = !isFreeWorkTab;
}

function resetUiState() {
  currentResult = null;
  resultSection.hidden = true;
  summaryList.innerHTML = '';
  jsonOutput.textContent = '';
  jsonPanel.open = false;
  copyButton.disabled = true;
  evidenceToggle.disabled = true;
  evidenceToggle.setAttribute('aria-expanded', 'false');
  evidenceList.hidden = true;
  evidenceList.innerHTML = '';
  copyFeedback.textContent = '';
  resetButton.disabled = true;
  if (activeTabId !== null) {
    chrome.action.setBadgeText({ tabId: activeTabId, text: '' });
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs && tabs.length > 0) {
    return tabs[0];
  }
  return null;
}

function isFreeWorkUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith('free-work.com');
  } catch (error) {
    return false;
  }
}

function renderSummary(summary) {
  summaryList.innerHTML = '';
  if (!summary || !Array.isArray(summary.items)) {
    return;
  }

  summary.items.forEach((item) => {
    const listItem = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = item.label;
    listItem.appendChild(strong);
    const textNode = document.createElement('span');
    textNode.textContent = item.value;
    listItem.appendChild(textNode);
    summaryList.appendChild(listItem);
  });
}

function renderEvidence(evidence) {
  evidenceList.innerHTML = '';
  if (!Array.isArray(evidence) || evidence.length === 0) {
    evidenceToggle.disabled = true;
    evidenceList.hidden = true;
    return;
  }

  evidenceToggle.disabled = false;
  evidence.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = entry;
    evidenceList.appendChild(item);
  });
}

function formatStatus(result) {
  if (!result) {
    return { emoji: '🟡', text: 'Prêt à analyser.' };
  }

  if (result.kind === 'detail') {
    const count = result.offersCount || 1;
    return { emoji: '✅', text: `Détail détecté (${count} offre)` };
  }

  if (result.kind === 'list') {
    const count = result.offersCount || 0;
    return { emoji: '✅', text: `Liste détectée : ${count} offre${count > 1 ? 's' : ''}` };
  }

  if (result.kind === 'out_of_scope') {
    return { emoji: '⛔', text: 'Page hors périmètre FreeWork' };
  }

  if (result.kind === 'pending') {
    return { emoji: '⏳', text: 'Contenu en cours de chargement, réessayez.' };
  }

  if (result.kind === 'none') {
    const reason = result.reason ? ` — ${capitalizeFirst(result.reason)}` : '';
    return { emoji: '⚠️', text: `Aucune offre détectable${reason}` };
  }

  return { emoji: '⚠️', text: 'Aucune offre détectable.' };
}

function capitalizeFirst(text) {
  if (!text) {
    return '';
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showResult(result) {
  currentResult = result;
  resultSection.hidden = false;
  renderSummary(result.summary);
  renderEvidence(result.evidence);
  jsonOutput.textContent = JSON.stringify(result.rawJson, null, 2);
  copyButton.disabled = false;
  resetButton.disabled = false;
  evidenceToggle.setAttribute('aria-expanded', 'false');
  evidenceList.hidden = true;

  const badgeText = result.offersCount && result.offersCount > 0 ? String(result.offersCount) : '';
  if (activeTabId !== null) {
    chrome.action.setBadgeBackgroundColor({ tabId: activeTabId, color: '#0f766e' });
    chrome.action.setBadgeText({ tabId: activeTabId, text: badgeText });
  }
}

async function requestAnalysis(attempt = 1) {
  if (activeTabId === null) {
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(activeTabId, { type: 'FREELANCEFINDER_ANALYZE' });

    if (!response) {
      throw new Error('no_response');
    }

    if (response.kind === 'pending' && attempt < 3) {
      const statusInfo = formatStatus(response);
      setStatus(statusInfo.emoji, statusInfo.text);
      retryTimeout = setTimeout(() => {
        requestAnalysis(attempt + 1);
      }, 1200);
      return;
    }

    finalizeAnalysis(response);
  } catch (error) {
    const statusInfo = { emoji: '⚠️', text: "Aucune offre détectable — contenu inaccessible." };
    setStatus(statusInfo.emoji, statusInfo.text);
    enableAnalysis();
    isAnalyzing = false;
  }
}

function finalizeAnalysis(result) {
  const statusInfo = formatStatus(result);
  setStatus(statusInfo.emoji, statusInfo.text);

  if (result.kind === 'detail' || result.kind === 'list') {
    showResult(result);
  } else {
    resetButton.disabled = false;
    resultSection.hidden = true;
    if (activeTabId !== null) {
      chrome.action.setBadgeText({ tabId: activeTabId, text: '' });
    }
  }

  enableAnalysis();
  isAnalyzing = false;
}

function handleAnalyze() {
  if (isAnalyzing) {
    return;
  }

  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  isAnalyzing = true;
  setStatus('🔍', 'Analyse en cours…');
  enableResetDuringAnalysis();
  disableAnalysis();
  requestAnalysis();
}

function enableResetDuringAnalysis() {
  resetButton.disabled = false;
}

function handleReset() {
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  resetUiState();
  if (isFreeWorkTab) {
    setStatus('🟡', 'Prêt à analyser une page FreeWork.');
  } else {
    setStatus('⛔', 'Page hors périmètre FreeWork');
  }
  enableAnalysis();
  isAnalyzing = false;
}

async function init() {
  const tab = await getActiveTab();

  if (!tab) {
    setStatus('⚠️', 'Onglet actif introuvable.');
    disableAnalysis();
    return;
  }

  activeTabId = tab.id;
  isFreeWorkTab = isFreeWorkUrl(tab.url || '');

  if (!isFreeWorkTab) {
    setStatus('⛔', 'Page hors périmètre FreeWork');
    disableAnalysis();
    resetButton.disabled = false;
    return;
  }

  setStatus('🟡', 'Prêt à analyser cette page FreeWork.');
  enableAnalysis();
}

function handleCopy() {
  if (!currentResult) {
    return;
  }

  const jsonString = JSON.stringify(currentResult.rawJson, null, 2);
  navigator.clipboard
    .writeText(jsonString)
    .then(() => {
      copyFeedback.textContent = 'JSON copié dans le presse-papier.';
      setTimeout(() => {
        copyFeedback.textContent = '';
      }, 2000);
    })
    .catch(() => {
      copyFeedback.textContent = 'Impossible de copier automatiquement.';
    });
}

function toggleEvidence() {
  const isHidden = evidenceList.hidden;
  if (isHidden) {
    evidenceList.hidden = false;
    evidenceToggle.textContent = 'Masquer les indices';
    evidenceToggle.setAttribute('aria-expanded', 'true');
  } else {
    evidenceList.hidden = true;
    evidenceToggle.textContent = 'Voir les indices';
    evidenceToggle.setAttribute('aria-expanded', 'false');
  }
}

function openTour() {
  tourIndex = 0;
  syncTour();
  if (typeof tourDialog.showModal === 'function') {
    tourDialog.showModal();
  }
}

function syncTour() {
  tourSteps.forEach((step, index) => {
    step.hidden = index !== tourIndex;
  });
  tourPrev.disabled = tourIndex === 0;
  tourNext.textContent = tourIndex === tourSteps.length - 1 ? 'Terminer' : 'Suivant';
}

function nextTourStep() {
  if (tourIndex < tourSteps.length - 1) {
    tourIndex += 1;
    syncTour();
    return;
  }
  tourDialog.close();
}

function previousTourStep() {
  if (tourIndex === 0) {
    return;
  }
  tourIndex -= 1;
  syncTour();
}

openTourButton.addEventListener('click', openTour);
analyzeButton.addEventListener('click', handleAnalyze);
resetButton.addEventListener('click', handleReset);
copyButton.addEventListener('click', handleCopy);
evidenceToggle.addEventListener('click', toggleEvidence);
tourPrev.addEventListener('click', previousTourStep);
tourNext.addEventListener('click', nextTourStep);
tourClose.addEventListener('click', () => tourDialog.close());
tourDialog.addEventListener('cancel', () => tourDialog.close());

document.addEventListener('DOMContentLoaded', () => {
  init();
});

