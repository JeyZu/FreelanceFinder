export interface RemoteInfo {
  isRemote: boolean;
  snippet?: string;
  policy?: string;
}

export const REMOTE_PATTERNS = [
  /full\s*remote/i,
  /remote/i,
  /télétravail/i,
  /teletravail/i,
  /hybride/i,
  /home\s*office/i,
];

export function detectRemote(texts: string[]): RemoteInfo {
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

export function normalizeRemotePolicy(text: string): string | undefined {
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
