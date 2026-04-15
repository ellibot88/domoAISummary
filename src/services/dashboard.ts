import domo from 'ryuu.js';
import type { PageDataset, PageCard } from '../types';
import { callCodeEngine } from './codeengine';

export function getPageId(): string {
  return String((domo as any).env?.pageId || '');
}

export async function getPageDatasets(pageId: string): Promise<PageDataset[]> {
  try {
    const response = await callCodeEngine('getPageDatasets', { pageId });
    const datasets = response?.datasets || [];
    if (!Array.isArray(datasets)) return [];
    return datasets.map((ds: any) => ({
      id: String(ds.id),
      name: ds.name || `Dataset ${ds.id}`,
      description: ds.description || '',
      rows: ds.rows || 0,
      columns: (ds.columns || []).map((c: any) => ({
        name: c.name || '',
        type: c.type || 'STRING',
      })),
    }));
  } catch (err) {
    console.error('Failed to discover page datasets:', err);
    return [];
  }
}

export async function getPageCards(pageId: string): Promise<PageCard[]> {
  try {
    const response = await callCodeEngine('getPageCards', { pageId });
    const cards = response?.cards || [];
    if (!Array.isArray(cards)) return [];
    return cards
      .filter((c: any) => c.id != null)
      .map((c: any) => ({
        id: Number(c.id),
        title: c.title || `Card ${c.id}`,
        type: c.type || '',
      }));
  } catch (err) {
    console.error('Failed to discover page cards:', err);
    return [];
  }
}
