import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import type { FollowUpMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: FollowUpMessage[];
  loading: boolean;
  onSend: (question: string) => void;
}

export default function FollowUpModal({ isOpen, onClose, history, loading, onSend }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ask a Follow-Up Question</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-messages">
          {history.length === 0 && (
            <p className="modal-empty">
              Ask any question about this dashboard summary and the underlying data.
            </p>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`modal-msg modal-msg-${msg.role}`}>
              <div className="modal-msg-label">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="modal-msg-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="modal-msg modal-msg-assistant">
              <div className="modal-msg-label">Assistant</div>
              <div className="modal-msg-content modal-msg-loading">
                <Loader2 size={16} className="spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="modal-input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="modal-input"
            placeholder="Ask a question about this dashboard..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="modal-send-btn"
            disabled={!input.trim() || loading}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
