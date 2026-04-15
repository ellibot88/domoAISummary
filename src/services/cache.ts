import domo from 'ryuu.js';
import type { CachedSummary, DashboardSummaryResult, DatasetSample } from '../types';

const COLLECTION = 'DashboardSummaries';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

interface AppDBDoc {
  id: string;
  content: CachedSummary;
  createdOn?: string;
  updatedOn?: string;
}

export interface CacheHit {
  summary: DashboardSummaryResult;
  dataContext: DatasetSample[];
  createdAt: number;
}

async function getAllDocs(): Promise<AppDBDoc[]> {
  try {
    const response = (await domo.get(
      `/domo/datastores/v1/collections/${COLLECTION}/documents`
    )) as any;
    return Array.isArray(response) ? response : [];
  } catch {
    return [];
  }
}

export async function getCachedSummary(
  personaKey: string,
  pageId: string
): Promise<CacheHit | null> {
  try {
    const docs = await getAllDocs();

    // Find matching doc by personaKey and pageId
    const match = docs.find((doc) => {
      const c = doc.content;
      return c && c.personaKey === personaKey && c.pageId === pageId;
    });

    if (!match) return null;

    const content = match.content;
    const createdAt = content.createdAt || 0;
    const age = Date.now() - createdAt;

    if (age > TWENTY_FOUR_HOURS) return null;

    try {
      const summary: DashboardSummaryResult = JSON.parse(content.summary);
      const dataContext: DatasetSample[] = JSON.parse(content.dataContext || '[]');
      return { summary, dataContext, createdAt };
    } catch {
      return null;
    }
  } catch (err) {
    console.error('Cache read failed:', err);
    return null;
  }
}

export async function saveSummary(
  personaKey: string,
  pageId: string,
  summary: DashboardSummaryResult,
  dataContext: DatasetSample[],
  persona: { role: string; title: string; persona: string }
): Promise<void> {
  const doc: CachedSummary = {
    personaKey,
    pageId,
    summary: JSON.stringify(summary),
    dataContext: JSON.stringify(
      dataContext.map((ds) => ({
        datasetId: ds.datasetId,
        datasetName: ds.datasetName,
        columns: ds.columns,
        sampleRows: [],
        rowCount: ds.rowCount,
      }))
    ),
    createdAt: Date.now(),
    userRole: persona.role,
    userTitle: persona.title,
    userPersona: persona.persona,
  };

  try {
    // Find existing doc to update
    const docs = await getAllDocs();
    const existing = docs.find((d) => {
      const c = d.content;
      return c && c.personaKey === personaKey && c.pageId === pageId;
    });

    if (existing) {
      await domo.put(
        `/domo/datastores/v1/collections/${COLLECTION}/documents/${existing.id}`,
        { content: doc }
      );
      return;
    }
  } catch {
    // Fall through to create
  }

  try {
    await domo.post(
      `/domo/datastores/v1/collections/${COLLECTION}/documents`,
      { content: doc }
    );
  } catch (err) {
    console.error('Cache write failed:', err);
  }
}
