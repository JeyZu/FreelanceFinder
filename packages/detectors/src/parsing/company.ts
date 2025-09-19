import { normalizeText } from "../normalize/text";

export function extractCompany(root: ParentNode): string | undefined {
  const headings = Array.from(root.querySelectorAll("h2, h3, strong"));
  for (const heading of headings) {
    const text = normalizeText(heading.textContent);
    if (!text) continue;
    if (/soci[eé]t[eé]|entreprise|client/i.test(text)) {
      const nextText = normalizeText(getFollowingText(heading));
      if (nextText) {
        return nextText;
      }
    }
  }
  return undefined;
}

function getFollowingText(element: Element): string {
  let node: Element | null = element.nextElementSibling;
  while (node) {
    const text = normalizeText(node.textContent);
    if (text) {
      return text;
    }
    node = node.nextElementSibling;
  }
  return "";
}
