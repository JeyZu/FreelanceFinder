export function findMainHeading(root: ParentNode): Element | null {
  const heading = root.querySelector("h1") ?? root.querySelector("h2");
  return heading;
}
