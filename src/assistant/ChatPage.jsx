/**
 * ChatPage.jsx — AI Assistant screen.
 *
 * Items implemented here:
 *  1. Markdown rendering (react-markdown + remark-gfm, verifies bold/tables/lists/headings)
 *  2. Auto-growing pill textarea composer — grows to 40vh then scrolls internally;
 *     Enter = send, Shift+Enter = newline
 *  3. Chat history persistence via useChatHistory (localStorage, userId-scoped)
 *     History is shown as a slim list above nav items in Layout (see Layout.jsx note)
 *  4. File-attach — reads .txt / .md client-side, inserts text into message input
 *  6. Target application dropdown populated from GET /api/applications, wired into chat POST
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import { useChatHistory } from './useChatHistory';
import './ChatPage.css';

const INITIAL_GREETING =
  "Hello — I'm your HireTrack assistant. Ask me anything about your applications, interview preparation, or how your resume matches a specific role.";

const SUGGESTED_PROMPTS = [
  'What applications need follow-up?',
  'Summarize my interview preparation notes',
  'Show applications in Interview stage',
  'Tailor my resume for this role',
  'What should I research before my interview?',
];

const ALLOWED_ATTACH_TYPES = ['text/plain', 'text/markdown'];
const ALLOWED_ATTACH_EXTS = ['.txt', '.md'];

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.userId;

  const {
    conversations,
    activeId,
    messages,
    newConversation,
    switchConversation,
    appendMessage,
    deleteConversation,
  } = useChatHistory(userId, INITIAL_GREETING);

  const [inputText, setInputText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachError, setAttachError] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Item 6: Load applications for dropdown ──────────────────────────
  useEffect(() => {
    axiosInstance.get('/api/applications')
      .then(r => setApplications(r.data || []))
      .catch(() => {}); // non-fatal — dropdown will just show General
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Item 2: Auto-grow textarea ──────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxH = window.innerHeight * 0.4;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [inputText]);

  // ── Send message ─────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (textToSend = inputText) => {
    const messageText = textToSend.trim();
    if (!messageText || isLoading) return;

    // Ensure there is an active conversation
    if (!activeId) {
      newConversation();
    }

    const userMsg = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: messageText,
    };

    appendMessage(userMsg);
    setInputText('');
    setAttachError('');
    setIsLoading(true);

    try {
      const payload = {
        message: messageText,
        applicationId: selectedAppId ? Number(selectedAppId) : null,
      };
      const response = await axiosInstance.post('/api/assistant/chat', payload);
      appendMessage({
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: response.data.reply,
      });
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Couldn't reach the AI assistant — check your connection and try again.";
      appendMessage({
        id: `msg_${Date.now() + 1}`,
        sender: 'assistant',
        text: errMsg,
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, activeId, selectedAppId, appendMessage, newConversation]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Item 4: File attach (.txt / .md only) ───────────────────────────
  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = ''; // reset so same file can be re-selected

    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isAllowed =
      ALLOWED_ATTACH_TYPES.includes(file.type) || ALLOWED_ATTACH_EXTS.includes(ext);

    if (!isAllowed) {
      setAttachError(
        `"${file.name}" is not supported. Only plain-text files (.txt, .md) can be attached.`
      );
      return;
    }

    setAttachError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setInputText(prev => prev ? prev + '\n\n' + text : text);
    };
    reader.onerror = () => {
      setAttachError('Failed to read the file. Please try again.');
    };
    reader.readAsText(file);
  };

  const selectedApp = applications.find(a => String(a.id) === String(selectedAppId));

  return (
    <div className="chat-container">
      {/* ── Slim conversation history sidebar (§23) ── */}
      {conversations.length > 1 && (
        <aside className="chat-history-rail">
          <div className="chat-history-header">
            <span className="chat-history-label">Recent</span>
            <button
              className="chat-new-btn"
              type="button"
              onClick={newConversation}
              title="New conversation"
            >
              + New
            </button>
          </div>
          <ul className="chat-history-list">
            {conversations.map(conv => (
              <li key={conv.id}>
                <button
                  type="button"
                  className={`chat-history-item ${conv.id === activeId ? 'chat-history-item--active' : ''}`}
                  onClick={() => switchConversation(conv.id)}
                  title={conv.title}
                >
                  <span className="chat-history-title">{conv.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* ── Main chat area ── */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div>
            <h1 className="page-title">AI Assistant</h1>
            <p className="chat-subtitle">Grounded in your resume and application records</p>
          </div>

          <div className="chat-header-controls">
            {/* Item 6: real application options */}
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

            <button
              type="button"
              className="chat-new-conv-btn"
              onClick={newConversation}
              title="Start a new conversation"
            >
              + New conversation
            </button>
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

        {/* ── Item 1: Message thread with Markdown rendering ── */}
        <div className="chat-messages" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-turn chat-turn--${msg.sender}`}>
              {msg.sender === 'assistant' && (
                <div className="chat-sender-badge" aria-label="HireTrack assistant">HT</div>
              )}
              <div className={`chat-message chat-message--${msg.sender}${msg.isError ? ' chat-message--error' : ''}`}>
                {msg.sender === 'assistant' ? (
                  /* Item 1: react-markdown + remark-gfm for tables */
                  <div className="chat-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <table className="chat-md-table" {...props} />
                        ),
                        code({ node, inline, className, children, ...props }) {
                          return inline
                            ? <code className="chat-md-code-inline" {...props}>{children}</code>
                            : <code className="chat-md-code-block" {...props}>{children}</code>;
                        },
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

          {isLoading && (
            <div className="chat-turn chat-turn--assistant">
              <div className="chat-sender-badge" aria-label="Assistant thinking">HT</div>
              <div className="chat-message chat-message--assistant chat-message--thinking">
                <span className="thinking-dots">
                  <span /><span /><span />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Composer area ── */}
        <div className="chat-composer-area">
          {/* Suggested prompts */}
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

          {/* Item 4: attach error */}
          {attachError && (
            <p className="chat-attach-error" role="alert">{attachError}</p>
          )}

          {/* Composer — pill-shaped, auto-growing */}
          <div className="chat-composer">
            {/* Item 4: file attach button — icon only, no colored bg */}
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a .txt or .md file"
              aria-label="Attach text file"
              disabled={isLoading}
            >
              {/* Paperclip icon */}
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path
                  d="M13.5 6.5L7 13a4.243 4.243 0 01-6-6l7-7a2.828 2.828 0 014 4L5.5 11A1.414 1.414 0 013.5 9L10 2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="chat-file-input"
              onChange={handleFileAttach}
              aria-hidden="true"
            />

            {/* Item 2: auto-growing textarea */}
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
    </div>
  );
}
