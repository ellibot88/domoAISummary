import type { CardRenderResult } from '../types';
import { callCodeEngine } from './codeengine';

/**
 * Fetch rendered card data for all cards on a page via the
 * existing "Dashboard Card Data Queries" Code Engine package.
 *
 * Returns only cards that rendered successfully with a tableSummary.
 * Returns [] on any error — card renders are supplementary, never blocking.
 */
export async function getPageCardRenders(pageId: string): Promise<CardRenderResult[]> {
  try {
    const raw = await callCodeEngine('getPageTableSummaries', { pageId });

    // The Code Engine function returns JSON.stringify(...), so the result
    // may arrive as a string that needs parsing, or already unwrapped.
    const response = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!response?.success) {
      console.warn('Card render request failed:', response?.error);
      return [];
    }

    const cards = response?.cards;
    if (!Array.isArray(cards)) return [];

    return cards.filter(
      (c: any): c is CardRenderResult => c.success && c.tableSummary != null
    );
  } catch (err) {
    console.error('Failed to fetch card renders:', err);
    return [];
  }
}
