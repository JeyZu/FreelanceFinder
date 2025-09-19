export function buildSelector(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && segments.length < 4) {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
      segments.unshift(segment);
      break;
    }
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList).slice(0, 2).join('.')}`;
    }
    segments.unshift(segment);
    current = current.parentElement;
  }
  return segments.join(" > ");
}
