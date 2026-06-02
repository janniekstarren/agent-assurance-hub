/**
 * Shared mock transport.
 *
 * Every service returns a Promise with realistic latency so the UI exercises
 * genuine loading states. `ERROR_RATE` is 0 by default for a smooth demo; raise
 * it (or pass `errorRate`) to exercise the error states that every data view
 * implements. Swapping mock -> live means replacing the bodies of the service
 * functions with real fetch() calls; the signatures stay the same.
 */

/** Bump to e.g. 0.06 to exercise error states across the app. */
export const ERROR_RATE = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function respond<T>(
  value: T,
  opts?: { min?: number; max?: number; label?: string; errorRate?: number },
): Promise<T> {
  const { min = 160, max = 460, label = 'request', errorRate = ERROR_RATE } = opts ?? {};
  await delay(min + Math.random() * (max - min));
  if (errorRate > 0 && Math.random() < errorRate) {
    throw new Error(`Simulated ${label} failure — retry to recover.`);
  }
  return value;
}
