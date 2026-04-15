import type { DashboardSummaryResult, KpiItem, ChartSpec } from '../types';

const VALID_CHART_TYPES = new Set([
  'BAR', 'STACKEDBAR', 'HORIZ_BAR', 'LINE', 'CURVED_LINE',
  'STACKED_AREA', 'PIE', 'DONUT', 'FUNNEL', 'BUBBLE',
]);

const VALID_DATA_TYPES = new Set(['STRING', 'DOUBLE', 'LONG', 'DATETIME', 'DATE']);
const VALID_MAPPINGS = new Set(['ITEM', 'VALUE', 'SERIES']);

function validateKpi(raw: any): KpiItem | null {
  if (!raw || typeof raw.label !== 'string') return null;
  return {
    label: raw.label,
    value: raw.value ?? 0,
    format: ['number', 'currency', 'percent'].includes(raw.format) ? raw.format : 'number',
    trend: ['up', 'down', 'flat'].includes(raw.trend) ? raw.trend : undefined,
    trendValue: typeof raw.trendValue === 'string' ? raw.trendValue : undefined,
  };
}

function validateChart(raw: any): ChartSpec | null {
  if (!raw?.title || !raw?.chartType || !raw?.data) return null;

  const chartType = String(raw.chartType).toUpperCase();
  if (!VALID_CHART_TYPES.has(chartType)) return null;

  const columns = raw.data?.columns;
  const rows = raw.data?.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows)) return null;
  if (columns.length === 0 || rows.length === 0) return null;

  const validatedColumns = columns.map((col: any) => ({
    type: VALID_DATA_TYPES.has(String(col.type).toUpperCase())
      ? String(col.type).toUpperCase()
      : 'STRING',
    mapping: VALID_MAPPINGS.has(String(col.mapping).toUpperCase())
      ? String(col.mapping).toUpperCase()
      : 'ITEM',
    label: col.label || col.name || '',
  }));

  return {
    title: raw.title,
    chartType,
    data: { columns: validatedColumns, rows },
  };
}

export function parseStructuredResponse(raw: string): DashboardSummaryResult {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);

    const narrative =
      typeof parsed.narrative === 'string' && parsed.narrative.length > 0
        ? parsed.narrative
        : 'Dashboard summary is being prepared.';

    const kpis: KpiItem[] = Array.isArray(parsed.kpis)
      ? parsed.kpis.map(validateKpi).filter((k: KpiItem | null): k is KpiItem => k !== null)
      : [];

    const charts: ChartSpec[] = Array.isArray(parsed.charts)
      ? parsed.charts.map(validateChart).filter((c: ChartSpec | null): c is ChartSpec => c !== null)
      : [];

    return { narrative, kpis, charts };
  } catch {
    // If JSON parsing fails, treat entire output as narrative
    return {
      narrative: raw.length > 0 ? raw : 'Unable to generate summary.',
      kpis: [],
      charts: [],
    };
  }
}
