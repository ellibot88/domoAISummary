import { useState, useEffect, useCallback, useRef } from 'react';
import domo from 'ryuu.js';
import type {
  UserPersona,
  DashboardSummaryResult,
  DatasetSample,
  FollowUpMessage,
  CardRenderResult,
} from '../types';
import { getCurrentUser, buildPersona, buildPersonaKey } from '../services/users';
import { getPageId, getPageDatasets, getPageCards } from '../services/dashboard';
import { sampleAllDatasets } from '../services/datasampler';
import { getPageCardRenders } from '../services/cardrender';
import { generateDashboardSummary, askFollowUp } from '../services/ai';
import { getCachedSummary, saveSummary } from '../services/cache';

export interface DashboardSummaryState {
  loading: boolean;
  generating: boolean;
  summary: DashboardSummaryResult | null;
  persona: UserPersona | null;
  dataContext: DatasetSample[];
  cardRenders: CardRenderResult[];
  error: string | null;
  fromCache: boolean;
  cacheDate: number | null;
  followUpHistory: FollowUpMessage[];
  followUpLoading: boolean;
}

export function useDashboardSummary() {
  const [state, setState] = useState<DashboardSummaryState>({
    loading: true,
    generating: false,
    summary: null,
    persona: null,
    dataContext: [],
    cardRenders: [],
    error: null,
    fromCache: false,
    cacheDate: null,
    followUpHistory: [],
    followUpLoading: false,
  });

  const pageIdRef = useRef<string>('');
  const personaKeyRef = useRef<string>('');

  const loadSummary = useCallback(async (forceRegenerate = false) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // 1. Get page context and user
      const pageId = getPageId();
      pageIdRef.current = pageId;

      if (!pageId) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Unable to detect dashboard context. Please place this app on a Domo page.',
        }));
        return;
      }

      const user = await getCurrentUser();
      const persona = buildPersona(user);
      const personaKey = buildPersonaKey(persona, pageId);
      personaKeyRef.current = personaKey;

      setState((prev) => ({ ...prev, persona }));

      // 2. Check cache (unless forced)
      if (!forceRegenerate) {
        const cached = await getCachedSummary(personaKey, pageId);
        if (cached) {
          setState((prev) => ({
            ...prev,
            loading: false,
            summary: cached.summary,
            dataContext: cached.dataContext,
            fromCache: true,
            cacheDate: cached.createdAt,
          }));
          return;
        }
      }

      // 3. Discover dashboard content
      setState((prev) => ({ ...prev, generating: true }));

      const [datasets, cards] = await Promise.all([
        getPageDatasets(pageId),
        getPageCards(pageId),
      ]);

      if (datasets.length === 0) {
        setState((prev) => ({
          ...prev,
          loading: false,
          generating: false,
          error: 'No datasets found on this dashboard. Add data cards to the page to generate a summary.',
        }));
        return;
      }

      // 4. Sample data and fetch card renders in parallel
      const [samples, cardRenders] = await Promise.all([
        sampleAllDatasets(datasets),
        getPageCardRenders(pageId),
      ]);
      const cardTitles = cards.map((c) => c.title);

      // 5. Generate AI summary
      const summary = await generateDashboardSummary(persona, samples, cardTitles, cardRenders);

      // 6. Cache result
      await saveSummary(personaKey, pageId, summary, samples, persona);

      setState((prev) => ({
        ...prev,
        loading: false,
        generating: false,
        summary,
        dataContext: samples,
        cardRenders,
        fromCache: false,
        cacheDate: Date.now(),
      }));
    } catch (err: any) {
      console.error('Dashboard summary failed:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        generating: false,
        error: `Failed to generate summary: ${err?.message || 'Unknown error'}`,
      }));
    }
  }, []);

  const regenerate = useCallback(() => {
    setState((prev) => ({ ...prev, followUpHistory: [] }));
    loadSummary(true);
  }, [loadSummary]);

  const sendFollowUp = useCallback(
    async (question: string) => {
      if (!state.summary || !question.trim()) return;

      const userMsg: FollowUpMessage = { role: 'user', content: question.trim() };
      setState((prev) => ({
        ...prev,
        followUpHistory: [...prev.followUpHistory, userMsg],
        followUpLoading: true,
      }));

      try {
        const answer = await askFollowUp(
          question.trim(),
          state.summary,
          state.dataContext,
          [...state.followUpHistory, userMsg],
          state.cardRenders
        );

        const assistantMsg: FollowUpMessage = { role: 'assistant', content: answer };
        setState((prev) => ({
          ...prev,
          followUpHistory: [...prev.followUpHistory, assistantMsg],
          followUpLoading: false,
        }));
      } catch (err: any) {
        const errorMsg: FollowUpMessage = {
          role: 'assistant',
          content: 'Sorry, I was unable to process that question. Please try again.',
        };
        setState((prev) => ({
          ...prev,
          followUpHistory: [...prev.followUpHistory, errorMsg],
          followUpLoading: false,
        }));
      }
    },
    [state.summary, state.dataContext, state.cardRenders, state.followUpHistory]
  );

  // Initial load
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Filter listener -- re-check cache, don't force regenerate
  useEffect(() => {
    try {
      (domo as any).onFiltersUpdated?.(() => {
        loadSummary(false);
      });
    } catch {
      // ryuu.js may not be initialized
    }
  }, [loadSummary]);

  return {
    ...state,
    regenerate,
    sendFollowUp,
  };
}
