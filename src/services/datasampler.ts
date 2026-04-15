import type { PageDataset, DatasetColumn, DatasetSample, AggregateStats } from '../types';
import { callCodeEngine } from './codeengine';

const MAX_DATASETS = 5;
const MAX_COLUMNS = 20;
const SAMPLE_LIMIT = 100;

export async function getDatasetSchema(datasetId: string): Promise<{ columns: DatasetColumn[]; datasetName: string }> {
  try {
    const response = await callCodeEngine('getDatasetSchema', { datasetId });
    const columns = (response?.columns || []).map((col: any) => ({
      name: col.name || '',
      type: col.type || 'STRING',
    }));
    return { columns, datasetName: response?.datasetName || '' };
  } catch {
    return { columns: [], datasetName: '' };
  }
}

function escapeSQL(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

export async function sampleDataset(
  datasetId: string,
  datasetName: string,
  columns: DatasetColumn[]
): Promise<DatasetSample> {
  const selectedCols = columns.slice(0, MAX_COLUMNS);
  const columnList = selectedCols.map((c) => escapeSQL(c.name)).join(', ');
  const sql = `SELECT ${columnList} FROM \`${datasetName}\` LIMIT ${SAMPLE_LIMIT}`;

  try {
    const response = await callCodeEngine('queryDataset', { datasetId, sql });

    const colNames: string[] = response?.columns || [];
    const rawRows: unknown[][] = response?.rows || [];

    const sampleRows = rawRows.map((row) => {
      const obj: Record<string, unknown> = {};
      colNames.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return {
      datasetId,
      datasetName,
      columns: selectedCols,
      sampleRows,
      rowCount: response?.numRows ?? sampleRows.length,
    };
  } catch (err) {
    console.error(`Failed to sample dataset ${datasetName}:`, err);
    return {
      datasetId,
      datasetName,
      columns: selectedCols,
      sampleRows: [],
      rowCount: 0,
    };
  }
}

export async function getAggregates(
  datasetId: string,
  datasetName: string,
  numericColumns: DatasetColumn[]
): Promise<Record<string, AggregateStats>> {
  if (numericColumns.length === 0) return {};

  const cols = numericColumns.slice(0, 10);
  const expressions = cols.flatMap((col) => {
    const name = escapeSQL(col.name);
    return [
      `SUM(${name}) AS ${escapeSQL(col.name + '_sum')}`,
      `AVG(${name}) AS ${escapeSQL(col.name + '_avg')}`,
      `MIN(${name}) AS ${escapeSQL(col.name + '_min')}`,
      `MAX(${name}) AS ${escapeSQL(col.name + '_max')}`,
      `COUNT(${name}) AS ${escapeSQL(col.name + '_count')}`,
    ];
  });

  const sql = `SELECT ${expressions.join(', ')} FROM \`${datasetName}\``;

  try {
    const response = await callCodeEngine('queryDataset', { datasetId, sql });

    const colNames: string[] = response?.columns || [];
    const row: unknown[] = response?.rows?.[0] || [];

    const result: Record<string, AggregateStats> = {};
    for (const col of cols) {
      const idx = (suffix: string) =>
        colNames.indexOf(`${col.name}_${suffix}`);
      result[col.name] = {
        sum: Number(row[idx('sum')]) || 0,
        avg: Number(row[idx('avg')]) || 0,
        min: Number(row[idx('min')]) || 0,
        max: Number(row[idx('max')]) || 0,
        count: Number(row[idx('count')]) || 0,
      };
    }
    return result;
  } catch {
    return {};
  }
}

const NUMERIC_TYPES = new Set([
  'LONG', 'DOUBLE', 'DECIMAL', 'FLOAT', 'INT', 'INTEGER', 'NUMERIC',
]);

export async function sampleAllDatasets(
  datasets: PageDataset[]
): Promise<DatasetSample[]> {
  // Filter out config/system datasets that aren't actual data
  const dataOnly = datasets.filter((ds) => {
    const lower = ds.name.toLowerCase();
    return !lower.includes('ai summary config') && !lower.includes('aiconfig');
  });
  const limited = dataOnly.slice(0, MAX_DATASETS);

  const results = await Promise.allSettled(
    limited.map(async (ds) => {
      // Get schema via Code Engine (returns columns + dataset name for SQL FROM clause)
      const schema = await getDatasetSchema(ds.id);
      let columns = schema.columns;
      let dsName = schema.datasetName || ds.name;

      // Fall back to columns from getPageDatasets if schema call failed
      if (columns.length === 0 && ds.columns && ds.columns.length > 0) {
        columns = ds.columns;
      }

      columns = columns.filter((c) => c.name && !c.name.startsWith('_BATCH_'));
      if (columns.length === 0) return null;

      const sample = await sampleDataset(ds.id, dsName, columns);

      const numericCols = columns.filter((c) =>
        NUMERIC_TYPES.has(c.type.toUpperCase())
      );
      const aggregates = await getAggregates(ds.id, dsName, numericCols);

      return { ...sample, aggregates };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<DatasetSample | null> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .filter((v): v is DatasetSample => v !== null && v.sampleRows.length > 0);
}
