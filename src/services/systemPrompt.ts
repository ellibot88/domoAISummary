import domo from 'ryuu.js';

const DEFAULT_SYSTEM_PROMPT = `You are a senior retail business analyst who creates actionable dashboard summaries. Your summaries are:
- Data-driven: every insight is backed by a specific number
- Action-oriented: you tell the reader what to do, not just what happened
- Concise: you respect the reader's time
- Persona-aware: you adjust depth and focus based on who's reading

Always format numbers clearly (e.g., $1.2M, +8.3%, 3,450 units). Bold all key metrics. Use bullet points for findings and recommended actions. Never use filler phrases.`;

const DEFAULT_MODEL = 'domo.domo_ai.domogpt-large-v2.2:anthropic';

export interface AIConfig {
  systemPrompt: string;
  model: string;
  filesetId: string;
}

let cachedConfig: AIConfig | null = null;

export async function getAIConfig(): Promise<AIConfig> {
  if (cachedConfig !== null) return cachedConfig;

  try {
    const rows = (await domo.get('/data/v1/aiConfig')) as any[];
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      const prompt = typeof row['System Prompt'] === 'string' && row['System Prompt'].trim().length > 0
        ? row['System Prompt'].trim()
        : DEFAULT_SYSTEM_PROMPT;
      const model = typeof row['AI_Model'] === 'string' && row['AI_Model'].trim().length > 0
        ? row['AI_Model'].trim()
        : DEFAULT_MODEL;
      const filesetId = typeof row['Fileset_Id'] === 'string' ? row['Fileset_Id'].trim() : '';

      cachedConfig = { systemPrompt: prompt, model, filesetId };
      return cachedConfig;
    }
  } catch (err) {
    console.warn('Failed to read AI config from dataset:', err);
  }

  cachedConfig = { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: DEFAULT_MODEL, filesetId: '' };
  return cachedConfig;
}

export async function getSystemPrompt(): Promise<string> {
  const config = await getAIConfig();
  return config.systemPrompt;
}

export async function getModel(): Promise<string> {
  const config = await getAIConfig();
  return config.model;
}

/** Reset the in-memory cache so next call reads fresh from the dataset */
export function clearAIConfigCache(): void {
  cachedConfig = null;
}
