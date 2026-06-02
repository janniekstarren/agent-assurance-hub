/** Number count-up with easing, honouring prefers-reduced-motion. */

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, duration = 800): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const from = fromRef.current;
    startRef.current = null;
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const v = from + (target - from) * easeOutCubic(t);
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return value;
}

export function CountUp({
  value,
  duration,
  format,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const v = useCountUp(value, duration);
  return <>{format ? format(v) : Math.round(v).toLocaleString('en-AU')}</>;
}
