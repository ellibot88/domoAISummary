import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiItem } from '../types';

function formatValue(value: string | number, format?: string): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency':
      return value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `$${(value / 1_000).toFixed(1)}K`
          : `$${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return value >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : value >= 1_000
          ? `${(value / 1_000).toFixed(1)}K`
          : value.toLocaleString();
  }
}

export default function KpiNumber({ label, value, format, trend, trendValue }: KpiItem) {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendClass =
    trend === 'up' ? 'kpi-trend-up' : trend === 'down' ? 'kpi-trend-down' : 'kpi-trend-flat';

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{formatValue(value, format)}</div>
      {(trend || trendValue) && (
        <div className={`kpi-trend ${trendClass}`}>
          <TrendIcon size={14} />
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
}
