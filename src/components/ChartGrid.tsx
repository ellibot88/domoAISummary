import type { ChartSpec } from '../types';
import PhoenixChart from './PhoenixChart';

interface Props {
  charts: ChartSpec[];
}

export default function ChartGrid({ charts }: Props) {
  if (charts.length === 0) return null;

  return (
    <div className={`chart-grid chart-grid-${Math.min(charts.length, 3)}`}>
      {charts.slice(0, 3).map((chart, i) => (
        <PhoenixChart key={i} spec={chart} />
      ))}
    </div>
  );
}
