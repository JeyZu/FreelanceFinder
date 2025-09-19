const CONTRACT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /freelance/i, label: "Freelance" },
  { pattern: /cdi/i, label: "CDI" },
  { pattern: /cdd/i, label: "CDD" },
  { pattern: /portage/i, label: "Portage" },
  { pattern: /stage/i, label: "Stage" },
  { pattern: /alternance/i, label: "Alternance" },
];

export function findContractType(metaTexts: string[]): string | undefined {
  for (const { pattern, label } of CONTRACT_PATTERNS) {
    if (metaTexts.some((text) => pattern.test(text))) {
      return label;
    }
  }
  return undefined;
}
