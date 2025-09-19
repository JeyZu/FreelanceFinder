import type { DetectionOptions } from "../types";
import { delay, timestamp } from "../utils/time";

export interface PollOutcome<T> {
  value: T;
  attempts: number;
  waitedMs: number;
}

interface PollConfig {
  maxWaitMs: number;
  pollIntervalMs: number;
}

export async function pollUntil<T>(
  options: DetectionOptions,
  config: PollConfig,
  check: () => T,
  isReady: (value: T) => boolean,
): Promise<PollOutcome<T>> {
  const start = timestamp(options);
  const deadline = start + config.maxWaitMs;

  let attempts = 1;
  let value = check();
  if (isReady(value)) {
    const waited = Math.max(0, timestamp(options) - start);
    return { value, attempts, waitedMs: waited };
  }

  for (let now = start; now < deadline; now = timestamp(options)) {
    const remaining = Math.max(0, deadline - now);
    const waitDuration = Math.min(config.pollIntervalMs, remaining);
    if (waitDuration > 0) {
      await delay(waitDuration);
    }
    attempts += 1;
    value = check();
    if (isReady(value)) {
      const waited = Math.max(0, timestamp(options) - start);
      return { value, attempts, waitedMs: waited };
    }
  }

  const waitedMs = Math.max(0, timestamp(options) - start);
  return { value, attempts, waitedMs };
}
