import domo from 'ryuu.js';
import type {
  UserPersona,
  DatasetSample,
  DashboardSummaryResult,
  FollowUpMessage,
  CardRenderResult,
} from '../types';
import { buildSummaryPrompt, buildFollowUpPrompt } from '../utils/prompt';
import { parseStructuredResponse } from '../utils/parseAiResponse';
import { getAIConfig } from './systemPrompt';
import { getFilesetContent } from './fileset';

async function generateText(input: string, systemPrompt: string, model: string): Promise<string> {
  const payload = {
    input,
    promptTemplate: { template: `${systemPrompt}\n\n\${input}` },
    model,
  };

  const response = (await domo.post('/domo/ai/v1/text/generation', payload)) as any;
  const body = response?.data ?? response?.body ?? response;
  const candidate = body?.output ?? body?.choices?.[0]?.output;
  const output = typeof candidate === 'string' ? candidate.trim() : '';
  if (!output) throw new Error('AI returned no usable output');
  return output;
}

export async function generateDashboardSummary(
  persona: UserPersona,
  datasets: DatasetSample[],
  cardTitles: string[],
  cardRenders?: CardRenderResult[]
): Promise<DashboardSummaryResult> {
  const config = await getAIConfig();

  // Fetch fileset content if configured
  const filesetContext = config.filesetId
    ? await getFilesetContent(config.filesetId)
    : '';

  const prompt = buildSummaryPrompt(persona, datasets, cardTitles, filesetContext || undefined, cardRenders);
  const output = await generateText(prompt, config.systemPrompt, config.model);
  return parseStructuredResponse(output);
}

export async function askFollowUp(
  question: string,
  summaryResult: DashboardSummaryResult,
  dataContext: DatasetSample[],
  history: FollowUpMessage[],
  cardRenders?: CardRenderResult[]
): Promise<string> {
  const config = await getAIConfig();

  const filesetContext = config.filesetId
    ? await getFilesetContent(config.filesetId)
    : '';

  const prompt = buildFollowUpPrompt(question, summaryResult, dataContext, history, filesetContext || undefined, cardRenders);
  return generateText(prompt, config.systemPrompt, config.model);
}
