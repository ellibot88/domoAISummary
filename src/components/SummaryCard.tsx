import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  narrative: string;
}

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
  // Split on **bold** markers and alternate between plain and bold spans
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

function BulletItem({ rawText, children }: { rawText: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const success = copyToClipboard(rawText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <li className="bullet-item">
      <span className="bullet-text">{children}</span>
      <button
        className={`copy-btn${copied ? ' copy-btn-success' : ''}`}
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label="Copy bullet point"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </li>
  );
}

export default function SummaryCard({ narrative }: Props) {
  const lines = narrative.split('\n').filter((l) => l.trim().length > 0);

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
      const bulletText = line.slice(2);
      const cleanText = bulletText.replace(/\*\*(.+?)\*\*/g, '$1');
      currentList.push(
        <BulletItem key={i} rawText={cleanText}>
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
      <div className="summary-body">{elements}</div>
    </div>
  );
}
