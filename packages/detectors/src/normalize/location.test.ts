import { describe, expect, it } from "vitest";
import { findLocation } from "./location";

const baseSegments = ["Paris 75009", "Freelance", "TJM 600 €"];

describe("location detection", () => {
  it("returns explicit city when present", () => {
    expect(findLocation(baseSegments, { includeRemote: false })).toBe("Paris 75009");
  });

  it("ignores remote keyword when includeRemote false", () => {
    const segments = ["Remote", "France"];
    expect(findLocation(segments, { includeRemote: false })).toBe("France");
  });

  it("accepts remote snippets when includeRemote true", () => {
    const segments = ["Full remote possible"];
    expect(findLocation(segments, { includeRemote: true })).toBe("Full remote possible");
  });

  it("returns undefined when nothing matches", () => {
    expect(findLocation(["Contrat freelance"], { includeRemote: true })).toBeUndefined();
  });
});
