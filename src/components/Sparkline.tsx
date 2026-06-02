/** Tiny area sparkline for KPI tiles and inline trends. */

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useId } from 'react';
import type { TimePoint } from '../types/domain';
import { useChartTheme } from './charts';

export function Sparkline({
  data,
  color,
  height = 40,
}: {
  data: TimePoint[];
  color?: string;
  height?: number;
}) {
  const chart = useChartTheme();
  const stroke = color ?? chart.brand;
  const gid = useId().replace(/:/g, '');
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gid})`}
            isAnimationActive
            animationDuration={900}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
