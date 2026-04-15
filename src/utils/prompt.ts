import type { UserPersona, DatasetSample, DashboardSummaryResult, FollowUpMessage, CardRenderResult } from '../types';

const PERSONA_GUIDANCE: Record<string, string> = {
  store_manager:
    'Focus on daily sales performance, foot traffic, labor hours, shrinkage, and inventory on-hand for their specific stores. Use operational, action-oriented language.',
  district_manager:
    'Focus on multi-store comparisons, territory totals, staffing efficiency, and underperforming locations. Use comparative, exception-focused language.',
  vp_merchandising:
    'Focus on category performance, margin %, sell-through rate, seasonal trends, and inventory turns. Use strategic, trend-driven language.',
  vp_operations:
    'Focus on supply chain metrics, logistics, store ops efficiency, cost per unit, and fulfillment rates. Emphasize efficiency and cost optimization.',
  marketing_director:
    'Focus on campaign ROI, customer acquisition cost, loyalty metrics, basket size, and conversion rates. Emphasize ROI and customer behavior insights.',
  finance:
    'Focus on P&L, EBITDA, budget vs actual, cash flow, and comp store sales. Use financially precise language with variance analysis.',
  executive:
    'Focus on high-level business health, YoY growth, market share, and strategic KPIs. Provide an executive summary with big-picture implications.',
  analyst:
    'Provide detailed breakdowns, highlight anomalies, note data quality observations, and surface statistical patterns. Use technical, data-dense language.',
  admin:
    'Provide a balanced executive overview with key business metrics, trends, and notable changes.',
  privileged:
    'Provide a clear operational summary with key metrics and actionable takeaways.',
  participant:
    'Provide a simple, easy-to-understand summary highlighting the most important numbers and what they mean.',
};

function getPersonaGuidance(persona: string): string {
  return (
    PERSONA_GUIDANCE[persona] ||
    PERSONA_GUIDANCE['participant'] ||
    'Provide a clear summary of the key metrics and trends.'
  );
}

export function buildSummaryPrompt(
  persona: UserPersona,
  datasets: DatasetSample[],
  cardTitles: string[],
  filesetContext?: string,
  cardRenders?: CardRenderResult[]
): string {
  const datasetDescriptions = datasets
    .map((ds) => {
      const colList = ds.columns.map((c) => `${c.name} (${c.type})`).join(', ');
      const sampleJson = JSON.stringify(ds.sampleRows.slice(0, 5), null, 2);

      let aggSection = '';
      if (ds.aggregates && Object.keys(ds.aggregates).length > 0) {
        const aggLines = Object.entries(ds.aggregates)
          .map(
            ([col, stats]) =>
              `  ${col}: sum=${stats.sum}, avg=${stats.avg.toFixed(2)}, min=${stats.min}, max=${stats.max}, count=${stats.count}`
          )
          .join('\n');
        aggSection = `\nAggregate statistics:\n${aggLines}`;
      }

      return `### Dataset: ${ds.datasetName}
Columns: ${colList}
Row count: ~${ds.rowCount}
Sample data (first 5 rows):
${sampleJson}${aggSection}`;
    })
    .join('\n\n');

  const regionContext = persona.region !== 'all'
    ? `\n- Region: ${persona.region}`
    : '';
  const storeContext = persona.storeIds.length > 0
    ? `\n- Responsible for stores: ${persona.storeIds.join(', ')}`
    : '';
  const categoryContext = persona.focusCategories.length > 0
    ? `\n- Focus categories: ${persona.focusCategories.join(', ')}`
    : '';

  // Build card render section if available
  let cardRenderSection = '';
  if (cardRenders && cardRenders.length > 0) {
    const cardDescriptions = cardRenders
      .filter((cr) => cr.success && cr.tableSummary)
      .map((cr) => {
        const ts = cr.tableSummary!;
        const colList = ts.columns.join(', ');
        const sampleRows = ts.rows.slice(0, 10);
        const rowsJson = JSON.stringify(sampleRows);

        let desc = `### Card: ${ts.cardTitle || cr.title}`;
        if (ts.datasetName) desc += ` (Dataset: ${ts.datasetName})`;
        desc += `\nCard type: ${cr.type}`;
        desc += `\nDisplayed columns: ${colList}`;
        desc += `\nRow count: ${ts.rowCount}`;
        desc += `\nData quality: ${ts.dataQuality}`;
        desc += `\nDisplayed data (up to 10 rows):\n${rowsJson}`;
        return desc;
      })
      .join('\n\n');

    cardRenderSection = `\n## Card Render Data (What Each Card Actually Displays)
The following shows the actual aggregated/filtered data each card is rendering, including any beast mode calculations and card-level filters:

${cardDescriptions}\n`;
  }

  return `You are a retail business intelligence analyst creating a personalized dashboard summary.

## User Context
- Name: ${persona.displayName}
- Role: ${persona.role}
- Title: ${persona.title || 'Team Member'}
- Persona: ${persona.persona}${regionContext}${storeContext}${categoryContext}

## Persona Guidance
${getPersonaGuidance(persona.persona)}

## Dashboard Context
This dashboard contains the following cards: ${cardTitles.length > 0 ? cardTitles.join(', ') : 'Multiple data visualizations'}
${cardRenderSection}
## Available Data
${datasetDescriptions}
${filesetContext ? `\n## Reference Documents\nUse the following documents to guide the structure, style, and content of your summary:\n\n${filesetContext}\n` : ''}
## Instructions
Create a personalized, action-oriented summary tailored to this user's persona. You MUST respond with valid JSON in this exact structure:

{
  "narrative": "The summary text using markdown formatting.",
  "kpis": [
    {
      "label": "Short KPI label",
      "value": 12345,
      "format": "number|currency|percent",
      "trend": "up|down|flat",
      "trendValue": "+5.2%"
    }
  ],
  "charts": [
    {
      "title": "Chart title",
      "chartType": "BAR|LINE|DONUT|PIE|STACKED_AREA|HORIZ_BAR|FUNNEL",
      "data": {
        "columns": [
          { "type": "STRING", "mapping": "ITEM", "label": "Category" },
          { "type": "DOUBLE", "mapping": "VALUE", "label": "Amount" }
        ],
        "rows": [["Category A", 100], ["Category B", 200]]
      }
    }
  ]
}

## Narrative formatting rules:
- Start with a 1-2 sentence overview of the dashboard's story
- Then use bullet points for the key findings. Each bullet should be a specific, actionable insight
- **Bold** all specific numbers, dollar amounts, percentages, and metric values (e.g., **$1.2M**, **+12.4%**, **3,450 visits**)
- Every bullet must contain at least one specific data point from the actual data -- no vague statements
- End with 1-2 bullets under a "Recommended Actions:" line that tell this persona what to do next
- Use \\n for line breaks between sections

Example narrative format:
"Revenue is trending positively across most regions, but cost pressures in the West need attention.\\n\\n**Key Findings:**\\n- Total revenue reached **$4.8M**, up **+8.2%** from last period\\n- The West region is underperforming at **$890K**, trailing the East by **$340K**\\n- Store revenue accounts for **62%** of total, with web growing fastest at **+15.3%**\\n\\n**Recommended Actions:**\\n- Investigate West region cost drivers -- total costs there are **$1.1M** vs **$780K** East\\n- Double down on web channel marketing given the **+15.3%** growth trend"

## Other rules:
- Include 3-5 KPIs most relevant to this persona
- Include 1-3 charts, choosing the most insightful visualizations
- For chartType use ONLY: BAR, LINE, DONUT, PIE, STACKED_AREA, HORIZ_BAR, FUNNEL, STACKEDBAR, CURVED_LINE
- For column types use: STRING, DOUBLE, LONG, DATETIME
- For column mappings use: ITEM (dimension), VALUE (measure), SERIES (grouping)
- Use actual numbers from the data, not placeholders
- KPI values should be raw numbers (not formatted strings) when possible
- Be direct and specific -- no filler phrases like "it's worth noting" or "interestingly"

RESPOND WITH ONLY THE JSON OBJECT. No markdown code fences, no explanation outside the JSON.`;
}

export function buildFollowUpPrompt(
  question: string,
  summaryResult: DashboardSummaryResult,
  dataContext: DatasetSample[],
  history: FollowUpMessage[],
  filesetContext?: string,
  cardRenders?: CardRenderResult[]
): string {
  const kpiSummary = summaryResult.kpis
    .map((k) => `- ${k.label}: ${k.value}${k.trendValue ? ` (${k.trendValue})` : ''}`)
    .join('\n');

  const datasetSummary = dataContext
    .map(
      (ds) =>
        `Dataset "${ds.datasetName}": columns=[${ds.columns.map((c) => c.name).join(', ')}], ~${ds.rowCount} rows`
    )
    .join('\n');

  const historyText =
    history.length > 0
      ? history
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n')
      : 'None';

  let cardRenderContext = '';
  if (cardRenders && cardRenders.length > 0) {
    const cardLines = cardRenders
      .filter((cr) => cr.success && cr.tableSummary)
      .map((cr) => {
        const ts = cr.tableSummary!;
        return `Card "${ts.cardTitle || cr.title}": columns=[${ts.columns.join(', ')}], ${ts.rowCount} rows displayed`;
      })
      .join('\n');
    cardRenderContext = `\n## Card Render Data\n${cardLines}\n`;
  }

  return `You are a retail analytics assistant. The user is viewing a dashboard summary and has a follow-up question.

## Current Dashboard Summary
${summaryResult.narrative}

## KPIs Shown
${kpiSummary}

## Available Data
${datasetSummary}
${cardRenderContext}${filesetContext ? `\n## Reference Documents\n${filesetContext}\n` : ''}
## Conversation History
${historyText}

## User's Question
${question}

Answer based on the dashboard data and summary context. Be specific with numbers. Keep it concise and conversational. If you cannot answer from the available data, say so clearly.`;
}
