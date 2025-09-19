import type { AnalysisResponse } from "../lib/messages";

export interface PopupState {
  activeTabId: number | null;
  currentResult: AnalysisResponse | null;
  isAnalyzing: boolean;
  retryTimeoutId: ReturnType<typeof setTimeout> | null;
  isFreeWorkTab: boolean;
  tourIndex: number;
}

const state: PopupState = {
  activeTabId: null,
  currentResult: null,
  isAnalyzing: false,
  retryTimeoutId: null,
  isFreeWorkTab: false,
  tourIndex: 0,
};

export function getState(): PopupState {
  return state;
}

export function setActiveTab(tabId: number | null): void {
  state.activeTabId = tabId;
}

export function setFreeWorkTab(value: boolean): void {
  state.isFreeWorkTab = value;
}

export function setAnalyzing(value: boolean): void {
  state.isAnalyzing = value;
}

export function setCurrentResult(result: AnalysisResponse | null): void {
  state.currentResult = result;
}

export function scheduleRetry(callback: () => void, delayMs: number): void {
  clearRetry();
  state.retryTimeoutId = setTimeout(callback, delayMs);
}

export function clearRetry(): void {
  if (state.retryTimeoutId) {
    clearTimeout(state.retryTimeoutId);
    state.retryTimeoutId = null;
  }
}

export function setTourIndex(value: number): void {
  state.tourIndex = value;
}
