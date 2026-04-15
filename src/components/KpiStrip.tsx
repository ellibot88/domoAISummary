import type { KpiItem } from '../types';
import KpiNumber from './KpiNumber';

interface Props {
  kpis: KpiItem[];
}

export default function KpiStrip({ kpis }: Props) {
  if (kpis.length === 0) return null;

  return (
    <div className="kpi-strip">
      {kpis.map((kpi, i) => (
        <KpiNumber key={i} {...kpi} />
      ))}
    </div>
  );
}
