/**
 * Number display.
 *
 * The count-up animation is intentionally disabled — numbers render their final
 * value immediately for instant, stable readability (no animating digits).
 */

export function useCountUp(target: number): number {
  return target;
}

export function CountUp({
  value,
  format,
}: {
  value: number;
  /** Accepted for API compatibility; ignored (no animation). */
  duration?: number;
  format?: (n: number) => string;
}) {
  return <>{format ? format(value) : Math.round(value).toLocaleString('en-AU')}</>;
}
