import domo from 'ryuu.js';

let cachedContent: Record<string, string> = {};

/**
 * Query a fileset for relevant content using semantic search.
 * Results are cached in memory for the session.
 */
export async function getFilesetContent(filesetId: string, searchQuery?: string): Promise<string> {
  if (!filesetId) return '';
  if (cachedContent[filesetId]) return cachedContent[filesetId];

  try {
    const response = (await domo.post(
      `/domo/files/v1/filesets/${filesetId}/query`,
      {
        query: searchQuery || 'summary template formatting instructions guidelines',
        directoryPath: '',
        topK: 10,
      }
    )) as any;

    const matches = response?.matches || [];
    if (matches.length === 0) return '';

    const chunks = matches
      .map((m: any) => {
        const text = m?.content?.text || '';
        const path = m?.metadata?.path || '';
        return text.trim() ? `--- ${path} ---\n${text.trim()}` : '';
      })
      .filter((c: string) => c.length > 0);

    const result = chunks.join('\n\n');
    cachedContent[filesetId] = result;
    return result;
  } catch (err) {
    console.warn('Failed to query fileset:', err);
    return '';
  }
}

export function clearFilesetCache(): void {
  cachedContent = {};
}
