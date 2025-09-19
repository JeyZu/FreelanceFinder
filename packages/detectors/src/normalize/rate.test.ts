import { describe, expect, it } from "vitest";
import { looksLikeRate, parseRate } from "./rate";

describe("rate normalization", () => {
  it("detects textual rates", () => {
    expect(looksLikeRate("TJM 600 € / jour")).toBe(true);
    expect(looksLikeRate("Salaire compétitif")).toBe(false);
  });

  it("parses european daily rate", () => {
    const rate = parseRate("TJM 600 € / jour");
    expect(rate).toEqual({ raw: "TJM 600 € / jour", value: 600, currency: "EUR", period: "day" });
  });

  it("parses usd monthly rate", () => {
    const rate = parseRate("Budget : 1 200 usd / month");
    expect(rate).toEqual({ raw: "Budget : 1 200 usd / month", value: 1200, currency: "USD", period: "month" });
  });

  it("returns undefined when no numeric value", () => {
    expect(parseRate("Tarif à négocier")).toBeUndefined();
  });
});
