import { normalizeText } from "../normalize/text";

export function collectMetaTexts(root: ParentNode): string[] {
  const selectors = [".meta", "[class*='meta']", "[class*='info']", "header", "ul", "dl"];
  const collected = new Set<string>();

  for (const selector of selectors) {
    const scope = root instanceof Document ? root : root;
    const elements = scope.querySelectorAll(selector);
    for (const element of elements) {
      const nodes = element.querySelectorAll("span, div, li, dt, dd, p");
      for (const child of Array.from(nodes)) {
        const text = normalizeText(child.textContent);
        if (!text || text.length > 140) continue;
        collected.add(text);
      }
    }
  }

  if (root instanceof Element) {
    const inlineCandidates = root.querySelectorAll("span, li, p");
    for (const node of Array.from(inlineCandidates)) {
      const text = normalizeText(node.textContent);
      if (!text || text.length > 140) continue;
      collected.add(text);
    }
  }

  return Array.from(collected);
}

export function findByLabel(metaTexts: string[], label: RegExp): string | undefined {
  for (const text of metaTexts) {
    const match = text.match(label);
    if (match) {
      const parts = text.split(/[:-]/);
      if (parts.length > 1) {
        return normalizeText(parts.slice(1).join(":"));
      }
      const after = text.slice((match.index ?? 0) + match[0].length).trim();
      if (after) {
        return normalizeText(after);
      }
      return text;
    }
  }
  return undefined;
}

export function findExperience(metaTexts: string[]): string | undefined {
  for (const text of metaTexts) {
    if (/exp[eé]rience/i.test(text) || /junior/i.test(text) || /senior/i.test(text) || /\b\d+\s*(ans|years)/i.test(text)) {
      return text;
    }
  }
  return undefined;
}

export function findPostedAt(metaTexts: string[]): string | undefined {
  for (const text of metaTexts) {
    if (/publi[eé]e?/i.test(text) || /post[eé]e?/i.test(text) || /il y a/i.test(text)) {
      return text;
    }
  }
  return undefined;
}
