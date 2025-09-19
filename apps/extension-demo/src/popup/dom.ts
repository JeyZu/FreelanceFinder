export interface PopupElements {
  statusContainer: HTMLElement;
  statusEmoji: HTMLElement;
  statusText: HTMLElement;
  analyzeButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  copyFeedback: HTMLElement;
  resultSection: HTMLElement;
  summaryList: HTMLUListElement;
  jsonOutput: HTMLElement;
  jsonPanel: HTMLDetailsElement;
  evidenceToggle: HTMLButtonElement;
  evidenceList: HTMLUListElement;
  openTourButton: HTMLButtonElement;
  tourDialog: HTMLDialogElement;
  tourSteps: HTMLElement[];
  tourPrev: HTMLButtonElement;
  tourNext: HTMLButtonElement;
  tourClose: HTMLButtonElement;
}

export function getElements(): PopupElements {
  const statusContainer = requireElement<HTMLElement>(document.getElementById("status"));
  const statusEmojiElement = statusContainer.querySelector<HTMLElement>(".status-emoji");
  return {
    statusContainer,
    statusEmoji: requireElement<HTMLElement>(statusEmojiElement),
    statusText: requireElement<HTMLElement>(document.getElementById("status-text")),
    analyzeButton: requireElement<HTMLButtonElement>(document.getElementById("analyze") as HTMLButtonElement),
    resetButton: requireElement<HTMLButtonElement>(document.getElementById("reset") as HTMLButtonElement),
    copyButton: requireElement<HTMLButtonElement>(document.getElementById("copy") as HTMLButtonElement),
    copyFeedback: requireElement<HTMLElement>(document.getElementById("copy-feedback")),
    resultSection: requireElement<HTMLElement>(document.getElementById("result")),
    summaryList: requireElement<HTMLUListElement>(document.getElementById("summary") as HTMLUListElement),
    jsonOutput: requireElement<HTMLElement>(document.getElementById("json-output")),
    jsonPanel: requireElement<HTMLDetailsElement>(document.getElementById("json-panel") as HTMLDetailsElement),
    evidenceToggle: requireElement<HTMLButtonElement>(document.getElementById("toggle-evidence") as HTMLButtonElement),
    evidenceList: requireElement<HTMLUListElement>(document.getElementById("evidence-list") as HTMLUListElement),
    openTourButton: requireElement<HTMLButtonElement>(document.getElementById("open-tour") as HTMLButtonElement),
    tourDialog: requireElement<HTMLDialogElement>(document.getElementById("tour") as HTMLDialogElement),
    tourSteps: Array.from(document.querySelectorAll<HTMLElement>(".tour-step")),
    tourPrev: requireElement<HTMLButtonElement>(document.getElementById("tour-prev") as HTMLButtonElement),
    tourNext: requireElement<HTMLButtonElement>(document.getElementById("tour-next") as HTMLButtonElement),
    tourClose: requireElement<HTMLButtonElement>(document.getElementById("tour-close") as HTMLButtonElement),
  };
}

function requireElement<T extends Element>(value: T | null | undefined): T {
  if (!value) {
    throw new Error("popup_element_missing");
  }
  return value;
}
