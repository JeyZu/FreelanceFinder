import type { DetectionOptions } from "../types";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function timestamp(options: DetectionOptions): number {
  const nowProvider = options.now ?? (() => new Date());
  return nowProvider().getTime();
}
