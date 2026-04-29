import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import domo from 'ryuu.js';
import type { CardRenderResult } from '../types';

interface Props {
  narrative: string;
  stream?: boolean;
  cardRenders?: CardRenderResult[];
}

const SOURCE_TAG_REGEX = /\s*\[source:(\d+)\]\s*$/;

function copyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/** Convert **bold** markdown and bullet points to HTML */
function renderLine(text: string): JSX.Element {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i}>{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function BulletItem({
  rawText,
  children,
  sourceCardId,
  sourceCardTitle,
}: {
  rawText: string;
  children: React.ReactNode;
  sourceCardId?: number;
  sourceCardTitle?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const success = copyToClipboard(rawText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function handleExplain() {
    if (sourceCardId === undefined) return;
    try {
      (domo as any).navigate(`/kpis/details/${sourceCardId}`, true);
    } catch {
      window.open(`/kpis/details/${sourceCardId}`, '_blank');
    }
  }

  const explainTitle = sourceCardTitle
    ? `Open source card: ${sourceCardTitle}`
    : 'Open source card';

  return (
    <li className="bullet-item">
      <button
        className={`copy-btn${copied ? ' copy-btn-success' : ''}`}
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label="Copy bullet point"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <span className="bullet-text">{children}</span>
      {sourceCardId !== undefined && (
        <span className="explain-wrap">
          <button
            className="explain-btn"
            onClick={handleExplain}
            aria-label={explainTitle}
          >
            <Info size={14} />
          </button>
          {sourceCardTitle && (
            <span className="explain-tooltip" role="tooltip">
              {sourceCardTitle}
            </span>
          )}
        </span>
      )}
    </li>
  );
}

// Reveal ~4 chars per 16ms tick ≈ 250 chars/sec. Feels like ChatGPT streaming.
const CHARS_PER_TICK = 4;
const TICK_MS = 16;

function useStreamedText(full: string, enabled: boolean): { text: string; done: boolean } {
  const [count, setCount] = useState(enabled ? 0 : full.length);
  const fullRef = useRef(full);

  useEffect(() => {
    fullRef.current = full;
    if (!enabled) {
      setCount(full.length);
      return;
    }
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + CHARS_PER_TICK;
        if (next >= fullRef.current.length) {
          clearInterval(id);
          return fullRef.current.length;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [full, enabled]);

  return { text: full.slice(0, count), done: count >= full.length };
}

export default function SummaryCard({ narrative, stream = false, cardRenders }: Props) {
  const { text: visible, done } = useStreamedText(narrative, stream);
  const lines = visible.split('\n').filter((l) => l.trim().length > 0);

  const cardTitleById = useMemo(() => {
    const map = new Map<number, string>();
    if (cardRenders) {
      for (const cr of cardRenders) {
        const title = cr.tableSummary?.cardTitle || cr.title;
        if (title) map.set(cr.cardId, title);
      }
    }
    return map;
  }, [cardRenders]);

  const elements: JSX.Element[] = [];
  let currentList: JSX.Element[] = [];

  function flushList() {
    if (currentList.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`}>{currentList}</ul>);
      currentList = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('- ') || line.startsWith('• ')) {
      const bulletBody = line.slice(2);
      const sourceMatch = bulletBody.match(SOURCE_TAG_REGEX);
      const sourceCardId = sourceMatch ? Number(sourceMatch[1]) : undefined;
      const bulletText = sourceMatch ? bulletBody.replace(SOURCE_TAG_REGEX, '') : bulletBody;
      const cleanText = bulletText.replace(/\*\*(.+?)\*\*/g, '$1');
      const sourceCardTitle =
        sourceCardId !== undefined ? cardTitleById.get(sourceCardId) : undefined;
      currentList.push(
        <BulletItem
          key={i}
          rawText={cleanText}
          sourceCardId={sourceCardId}
          sourceCardTitle={sourceCardTitle}
        >
          {renderLine(bulletText)}
        </BulletItem>
      );
    } else {
      flushList();
      elements.push(<p key={i}>{renderLine(line)}</p>);
    }
  }
  flushList();

  return (
    <div className="summary-card">
      <h3 className="summary-heading">Summary</h3>
      <div className={`summary-body${done ? '' : ' summary-body-streaming'}`}>
        {elements}
        {!done && <span className="stream-caret" aria-hidden />}
      </div>
    </div>
  );
}
