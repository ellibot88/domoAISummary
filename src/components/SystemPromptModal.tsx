import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { getSystemPrompt, saveSystemPrompt, clearSystemPromptCache } from '../services/systemPrompt';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SystemPromptModal({ isOpen, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSaved(false);
    clearSystemPromptCache();
    getSystemPrompt().then((p) => {
      setPrompt(p);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveSystemPrompt(prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>AI System Prompt</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-messages" style={{ padding: '16px' }}>
          <p className="system-prompt-desc">
            This system prompt guides the AI when generating dashboard summaries.
            Changes apply to all new summaries across all users.
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Loader2 size={20} className="spin" />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="system-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
            />
          )}
        </div>

        <div className="modal-input-row" style={{ justifyContent: 'flex-end' }}>
          {saved && <span className="system-prompt-saved">Saved</span>}
          <button
            className="modal-send-btn"
            style={{ width: 'auto', padding: '8px 16px', gap: '6px', display: 'flex', alignItems: 'center' }}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
