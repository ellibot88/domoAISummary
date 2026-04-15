import { useRef, useEffect } from 'react';
import type { ChartSpec } from '../types';

// Dynamic imports from domo-phoenix
let phoenixLib: any = null;

async function getPhoenix() {
  if (phoenixLib) return phoenixLib;
  try {
    phoenixLib = await import('@domoinc/domo-phoenix');
  } catch {
    phoenixLib = null;
  }
  return phoenixLib;
}

const CHART_TYPE_KEYS: Record<string, string> = {
  BAR: 'BAR',
  STACKEDBAR: 'STACKEDBAR',
  HORIZ_BAR: 'HORIZ_BAR',
  LINE: 'LINE',
  CURVED_LINE: 'CURVED_LINE',
  STACKED_AREA: 'STACKED_AREA',
  PIE: 'PIE',
  DONUT: 'DONUT',
  FUNNEL: 'FUNNEL',
  BUBBLE: 'BUBBLE',
  NAUTILUS: 'NAUTILUS',
  WORD_CLOUD: 'WORD_CLOUD',
};

const DATA_TYPE_KEYS: Record<string, string> = {
  STRING: 'STRING',
  DOUBLE: 'DOUBLE',
  LONG: 'LONG',
  DATETIME: 'DATE_TIME',
  DATE: 'DATE_TIME',
};

const MAPPING_KEYS: Record<string, string> = {
  ITEM: 'ITEM',
  VALUE: 'VALUE',
  SERIES: 'SERIES',
};

interface Props {
  spec: ChartSpec;
  width?: number;
  height?: number;
}

export default function PhoenixChart({ spec, width = 350, height = 250 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function renderChart() {
      if (!containerRef.current) return;
      const phoenix = await getPhoenix();
      if (!phoenix || !mounted) return;

      const { Chart, CHART_TYPE, DATA_TYPE, MAPPING } = phoenix;
      containerRef.current.innerHTML = '';

      const chartType = CHART_TYPE[CHART_TYPE_KEYS[spec.chartType] || 'BAR'];
      const phoenixData = {
        columns: spec.data.columns.map((col) => ({
          type: DATA_TYPE[DATA_TYPE_KEYS[col.type] || 'STRING'],
          mapping: MAPPING[MAPPING_KEYS[col.mapping] || 'ITEM'],
          label: col.label || '',
        })),
        rows: spec.data.rows,
      };

      try {
        const chart = new Chart(chartType, phoenixData, {
          width,
          height,
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
        });
        if (mounted && containerRef.current) {
          containerRef.current.appendChild(chart.canvas);
          chart.render();
        }
      } catch (err) {
        console.error('Phoenix chart render failed:', err);
        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = '<p class="chart-error">Unable to render chart</p>';
        }
      }
    }

    renderChart();
    return () => { mounted = false; };
  }, [spec, width, height]);

  return (
    <div className="phoenix-chart-wrapper">
      <h4 className="chart-title">{spec.title}</h4>
      <div ref={containerRef} className="chart-container" />
    </div>
  );
}
