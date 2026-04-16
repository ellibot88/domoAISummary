import { useState } from 'react';
import { RefreshCw, MessageSquare, Clock, User } from 'lucide-react';

import { useDashboardSummary } from './hooks/useDashboardSummary';
import LoadingState from './components/LoadingState';
import ErrorBanner from './components/ErrorBanner';
import SummaryCard from './components/SummaryCard';
import KpiStrip from './components/KpiStrip';
import ChartGrid from './components/ChartGrid';
import FollowUpModal from './components/FollowUpModal';

function formatCacheDate(timestamp: number | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPersonaLabel(persona: string): string {
  return persona
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function App() {
  const {
    loading,
    generating,
    summary,
    persona,
    error,
    fromCache,
    cacheDate,
    followUpHistory,
    followUpLoading,
    regenerate,
    sendFollowUp,
  } = useDashboardSummary();

  const [modalOpen, setModalOpen] = useState(false);

  if (loading || generating) {
    return <LoadingState generating={generating} />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={regenerate} />;
  }

  if (!summary) {
    return <ErrorBanner message="No summary available." onRetry={regenerate} />;
  }

  return (
    <div className="app-container">
      {/* Header bar */}
      <div className="app-header">
        <div className="header-left">
          <h2 className="app-title">Dashboard Summary</h2>
          {persona && (
            <span className="persona-badge">
              <User size={12} />
              {formatPersonaLabel(persona.persona)}
            </span>
          )}
        </div>
        <div className="header-right">
          <button className="followup-btn" onClick={() => setModalOpen(true)}>
            <MessageSquare size={16} />
            Ask a Question
          </button>
          <button className="followup-btn" onClick={regenerate}>
            <RefreshCw size={16} />
            New Summary
          </button>
        </div>
      </div>

      {/* Narrative summary */}
      <SummaryCard narrative={summary.narrative} />

      {/* Charts */}
      <ChartGrid charts={summary.charts} />

      {/* KPI strip */}
      <KpiStrip kpis={summary.kpis} />

      {/* Cache timestamp footer */}
      {cacheDate && (
        <div className="cache-footer">
          <Clock size={12} />
          Summary generated {formatCacheDate(cacheDate)}
        </div>
      )}

      {/* Follow-up modal */}
      <FollowUpModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        history={followUpHistory}
        loading={followUpLoading}
        onSend={sendFollowUp}
      />

    </div>
  );
}
