// --- User ---
export interface DomoUser {
  id: number;
  displayName: string;
  avatarKey: string;
  role: string;
  detail?: {
    title: string;
    email: string;
    phoneNumber: string;
    employeeNumber: number;
    department?: string;
    pending: boolean;
  };
  attributes?: Record<string, string[]>;
}

export interface UserPersona {
  persona: string;
  role: string;
  title: string;
  region: string;
  storeIds: string[];
  focusCategories: string[];
  displayName: string;
}

// --- Dashboard Discovery ---
export interface PageDataset {
  id: string;
  name: string;
  description?: string;
  rows?: number;
  columns?: DatasetColumn[];
}

export interface DatasetColumn {
  name: string;
  type: string;
}

export interface PageCard {
  id: number;
  title: string;
  type?: string;
}

// --- Data Sampling ---
export interface DatasetSample {
  datasetId: string;
  datasetName: string;
  columns: DatasetColumn[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
  aggregates?: Record<string, AggregateStats>;
}

export interface AggregateStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

// --- AI Response ---
export interface DashboardSummaryResult {
  narrative: string;
  kpis: KpiItem[];
  charts: ChartSpec[];
}

export interface KpiItem {
  label: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percent';
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}

export interface ChartSpec {
  title: string;
  chartType: string;
  data: PhoenixDataPayload;
}

export interface PhoenixDataPayload {
  columns: PhoenixColumn[];
  rows: Array<Array<string | number>>;
}

export interface PhoenixColumn {
  type: string;
  mapping: string;
  label?: string;
}

// --- Card Render ---
export interface CardColumnDescriptor {
  index: number;
  name: string;
  type: string;
}

export interface CardTableSummary {
  cardTitle: string | null;
  datasetName: string | null;
  columns: string[];
  columnCount: number;
  rowCount: number;
  columnDescriptors: CardColumnDescriptor[];
  rows: unknown[][];
  dataQuality: 'OK' | 'EMPTY_RESULT' | 'EMPTY_VALUES';
}

export interface CardRenderResult {
  cardId: number;
  title: string;
  type: string;
  success: boolean;
  endpoint?: string;
  error?: string;
  tableSummary: CardTableSummary | null;
  skipped?: boolean;
  reason?: string;
}

// --- Cache ---
export interface CachedSummary {
  personaKey: string;
  pageId: string;
  summary: string;
  dataContext: string;
  createdAt: number;
  userRole: string;
  userTitle: string;
  userPersona: string;
}

export interface AppDBDocument<T> {
  id: string;
  content: T;
  createdOn?: string;
  updatedOn?: string;
}

// --- Follow-up ---
export interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
}
