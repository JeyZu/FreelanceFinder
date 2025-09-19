import { normalizeText } from "../normalize/text";

export function collectTags(root: ParentNode): string[] {
  const selectors = [".tag", "[class*='tag']", "[class*='skill']", "[class*='stack']", "[data-tag]"];
  const tags = new Set<string>();

  for (const selector of selectors) {
    const scope = root instanceof Document ? root : root;
    const elements = scope.querySelectorAll(selector);
    for (const element of elements) {
      const text = normalizeText(element.textContent);
      if (!text || text.length > 40) continue;

      const className = element.getAttribute("class")?.toLowerCase() ?? "";
      const classes = className.split(/\s+/);
      if (classes.some((cls) => cls === "tags" || cls === "tags-list" || cls === "tag-list")) {
        continue;
      }

      if (element.childElementCount > 0) {
        const hasTagChild = Array.from(element.children).some((child) => {
          const childClass = child.getAttribute("class")?.toLowerCase() ?? "";
          return childClass.includes("tag");
        });
        if (hasTagChild) {
          continue;
        }
      }

      if (/^tag$/i.test(text)) continue;
      tags.add(text);
    }
  }

  return Array.from(tags);
}
