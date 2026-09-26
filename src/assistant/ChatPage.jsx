import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import axiosInstance from '../api/axiosInstance';
import './ChatPage.css';

const SUGGESTED_PROMPTS = [
  'What applications need follow-up?',
  'Summarize my interview preparation notes',
  'Show applications in Interview stage',
  'Tailor my resume for this role',
  'What should I research before my interview?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello — I\'m your HireTrack assistant. Ask me anything about your applications, interview preparation, or how your resume matches a specific role.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-grow textarea — §23 composer behaviour
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxH = window.innerHeight * 0.4;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [inputText]);

  const fetchApplications = async () => {
    try {
      const response = await axiosInstance.get('/api/applications');
      setApplications(response.data || []);
    } catch (err) {
      console.error('Failed to fetch applications for assistant:', err);
    }
  };

  const handleSendMessage = useCallback(async (textToSend = inputText) => {
    const messageText = textToSend.trim();
    if (!messageText || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: messageText,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const payload = {
        message: messageText,
        applicationId: selectedAppId ? Number(selectedAppId) : null,
      };

      const response = await axiosInstance.post('/api/assistant/chat', payload);

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'assistant', text: response.data.reply },
      ]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || 'Couldn\'t reach the AI assistant. Check your connection and try again.';
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'assistant', text: errMsg, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, selectedAppId]);

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedApp = applications.find(a => String(a.id) === String(selectedAppId));

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="chat-subtitle">Grounded in your resume and application records</p>
        </div>

        <div className="chat-app-selector">
          <label htmlFor="chat-app-select" className="selector-label">
            Target application:
          </label>
          <select
            id="chat-app-select"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="chat-app-dropdown"
          >
            <option value="">General — all applications</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.companyName} — {app.jobRole}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active context pill */}
      {selectedApp && (
        <div className="chat-context-bar">
          <span className="chat-context-pill">
            Context: <strong>{selectedApp.companyName}</strong>
            <span className="chat-context-role"> · {selectedApp.jobRole}</span>
          </span>
          <button
            className="chat-context-clear"
            onClick={() => setSelectedAppId('')}
            type="button"
          >
            Clear
          </button>
        </div>
      )}

      {/* Message thread — §23: generous breathing room, no bubble bg on assistant */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-turn chat-turn--${msg.sender}`}>
            {msg.sender === 'assistant' && (
              <div className="chat-sender-badge" aria-label="Assistant">HT</div>
            )}
            <div className={`chat-message chat-message--${msg.sender} ${msg.isError ? 'chat-message--error' : ''}`}>
              {msg.sender === 'assistant' ? (
                /* §23 — Markdown rendering for assistant messages */
                <div className="chat-markdown">
                  <ReactMarkdown
                    components={{
                      table: ({ node, ...props }) => (
                        <table className="chat-md-table" {...props} />
                      ),
                      code: ({ node, inline, ...props }) =>
                        inline
                          ? <code className="chat-md-code-inline" {...props} />
                          : <code className="chat-md-code-block" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="chat-text">{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isLoading && (
          <div className="chat-turn chat-turn--assistant">
            <div className="chat-sender-badge" aria-label="Assistant">HT</div>
            <div className="chat-message chat-message--assistant chat-message--thinking">
              <span className="thinking-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer area — §23 elevated, pill-shaped, auto-growing */}
      <div className="chat-composer-area">
        {/* Suggested prompts — §10: plain compact buttons */}
        <div className="chat-suggestions">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="chat-suggest-btn"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Composer — §23: elevated pill, auto-grow */}
        <div className="chat-composer">
          <textarea
            ref={textareaRef}
            className="chat-composer-input"
            placeholder="Ask a question about your job search or a specific application…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            aria-label="Chat input"
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="chat-send-spinner" aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
        <p className="chat-composer-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
