interface Props {
  narrative: string;
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
      // Bullet point
      currentList.push(<li key={i}>{renderLine(line.slice(2))}</li>);
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
