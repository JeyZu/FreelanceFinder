import { describe, expect, it } from "vitest";
import { detectRemote } from "./remote";

describe("remote detection", () => {
  it("identifies remote snippets", () => {
    const result = detectRemote(["Mission en full remote"]);
    expect(result.isRemote).toBe(true);
    expect(result.policy).toBe("full-remote");
    expect(result.snippet).toBe("Mission en full remote");
  });

  it("returns false when no indicators", () => {
    expect(detectRemote(["Bureau à Paris"]).isRemote).toBe(false);
  });
});
