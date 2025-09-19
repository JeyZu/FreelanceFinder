import type { detectFreeWorkOffers } from "#detectors/freework";

type DetectFn = typeof detectFreeWorkOffers;
type DetectorModule = { detectFreeWorkOffers?: DetectFn };

export type DetectorImporter = () => Promise<DetectorModule>;

let detectorPromise: Promise<DetectFn> | null = null;
let importer: DetectorImporter = defaultImporter;

/**
 * Charge dynamiquement le détecteur FreeWork et garantit un cache cohérent.
 * L'import dynamique est isolé ici afin de pouvoir être testé et résilient.
 */
export async function loadDetector(): Promise<DetectFn> {
  if (!detectorPromise) {
    detectorPromise = importer().then(validateModule);
  }

  try {
    return await detectorPromise;
  } catch (error) {
    detectorPromise = null;
    throw error;
  }
}

export function configureDetectorImporter(customImporter?: DetectorImporter): void {
  importer = customImporter ?? defaultImporter;
  detectorPromise = null;
}

export function resetDetectorCache(): void {
  detectorPromise = null;
}

function validateModule(module: DetectorModule): DetectFn {
  if (typeof module.detectFreeWorkOffers !== "function") {
    throw new Error("detector_export_missing");
  }
  return module.detectFreeWorkOffers;
}

function defaultImporter(): Promise<DetectorModule> {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== "function") {
    throw new Error("chrome_runtime_unavailable");
  }
  return import(runtime.getURL("detector.js"));
}
