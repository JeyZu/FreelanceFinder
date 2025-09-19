import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { detectFreeWorkOffers } from "#detectors/freework";
import { configureDetectorImporter, loadDetector, resetDetectorCache, type DetectorImporter } from "./detector-loader";

type DetectFn = typeof detectFreeWorkOffers;

describe("detector-loader", () => {
  beforeEach(() => {
    resetDetectorCache();
  });

  afterEach(() => {
    configureDetectorImporter();
    resetDetectorCache();
  });

  it("loads the detector once and reuses the cached instance", async () => {
    const detector = vi.fn<Parameters<DetectFn>, ReturnType<DetectFn>>();
    const importer = vi
      .fn<Parameters<DetectorImporter>, ReturnType<DetectorImporter>>()
      .mockResolvedValue({ detectFreeWorkOffers: detector });

    configureDetectorImporter(importer);
    const first = await loadDetector();
    const second = await loadDetector();

    expect(first).toBe(detector);
    expect(second).toBe(detector);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it("retries when the module import fails", async () => {
    const detector = vi.fn<Parameters<DetectFn>, ReturnType<DetectFn>>();
    const importer = vi
      .fn<Parameters<DetectorImporter>, ReturnType<DetectorImporter>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ detectFreeWorkOffers: detector });

    configureDetectorImporter(importer);
    await expect(loadDetector()).rejects.toThrow("boom");

    const loaded = await loadDetector();
    expect(loaded).toBe(detector);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("throws a clear error when the detector export is missing", async () => {
    const emptyImporter: DetectorImporter = () => Promise.resolve({});
    configureDetectorImporter(emptyImporter);
    await expect(loadDetector()).rejects.toThrow("detector_export_missing");
  });
});
