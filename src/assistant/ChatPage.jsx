import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import { useChatHistory } from './useChatHistory';
import './ChatPage.css';

// Lazy load ReactMarkdown for performance (Phase 2 code splitting)
const ReactMarkdown = lazy(() => import('react-markdown'));

const INITIAL_GREETING = "What can I help you with today?";

const SUGGESTED_PROMPTS = [
  'What applications need follow-up?',
  'Summarize my interview preparation notes',
  'Show applications in Interview stage',
  'Tailor my resume for this role',
  'What should I research before my interview?',
];

const ROTATING_THINKING_WORDS = ['Thinking', 'Musing', 'Pondering', 'Mulling it over'];

export default function ChatPage() {
  const { user, token } = useAuth();
  const userId = user?.userId;

  const {
    conversations,
    activeId,
    activeConversation,
    messages,
    newConversation,
    switchConversation,
    appendMessage,
    updateMessageText,
    updateReasoningText,
    deleteConversation,
    renameConversation,
  } = useChatHistory(userId, INITIAL_GREETING);

  // Input & context states
  const [inputText, setInputText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);

  // Streaming & status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null); // 'retrieving' | 'thinking' | 'generating' | null
  const [thinkingWordIdx, setThinkingWordIdx] = useState(0);
  const [reasoningTimeSeconds, setReasoningTimeSeconds] = useState(0);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // History sidebar / mobile drawer
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // UI state for auto-scroll
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Refs
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const reasoningTimerRef = useRef(null);
  const remarkGfmRef = useRef(null);

  // Load applications for context pill picker
  useEffect(() => {
    axiosInstance.get('/api/applications')
      .then(r => setApplications(r.data || []))
      .catch(() => {});
  }, []);

  // Dynamically import remarkGfm
  useEffect(() => {
    import('remark-gfm').then(mod => {
      remarkGfmRef.current = mod.default;
    });
  }, []);

  // Rotate thinking words while in 'thinking' phase
  useEffect(() => {
    if (streamPhase === 'thinking') {
      const interval = setInterval(() => {
        setThinkingWordIdx(prev => (prev + 1) % ROTATING_THINKING_WORDS.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [streamPhase]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxH = window.innerHeight * 0.4;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [inputText]);

  // Smart auto-scroll handling
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBottomBtn(!isAtBottom);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isAtBottom || isGenerating) {
      scrollToBottom('smooth');
    }
  }, [messages, isGenerating, streamPhase]);

  // Stop / Abort generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamPhase(null);
  };

  // ── Stream / Send handler via fetch + ReadableStream ────────────────
  const handleSendMessage = useCallback(async (textToSend = inputText) => {
    const messageText = textToSend.trim();
    if (!messageText || isGenerating) return;

    if (!activeId) {
      newConversation();
    }

    const userMsgId = `msg_${Date.now()}`;
    const userMsg = { id: userMsgId, sender: 'user', text: messageText };
    appendMessage(userMsg);

    setInputText('');
    setIsGenerating(true);
    setStreamPhase('retrieving');
    setReasoningTimeSeconds(0);
    setIsReasoningExpanded(false);

    const assistantMsgId = `msg_${Date.now() + 1}`;
    const assistantMsg = { id: assistantMsgId, sender: 'assistant', text: '', reasoning: '' };
    appendMessage(assistantMsg);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = Date.now();
    reasoningTimerRef.current = setInterval(() => {
      setReasoningTimeSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const payload = {
        message: messageText,
        applicationId: selectedAppId ? Number(selectedAppId) : null,
      };

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE_URL}/api/assistant/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep partial line in buffer

        let currentEvent = 'message';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const rawData = trimmed.substring(5).trim();
            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData);

              if (currentEvent === 'status') {
                setStreamPhase(data.phase);
              } else if (currentEvent === 'token') {
                setStreamPhase('generating');
                updateMessageText(assistantMsgId, prev => (prev || '') + (data.text || ''));
              } else if (currentEvent === 'reasoning') {
                updateReasoningText(assistantMsgId, data.text || '');
              } else if (currentEvent === 'error') {
                updateMessageText(assistantMsgId, `\n\n[Error: ${data.message || 'Stream connection failed'}]`);
              }
            } catch (e) {
              // Plain text data fallback
              if (currentEvent === 'token') {
                updateMessageText(assistantMsgId, prev => (prev || '') + rawData);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        updateMessageText(assistantMsgId, prev => prev + ' [Stopped]');
      } else {
        // Fallback to synchronous /chat endpoint if streaming fails
        try {
          const fallbackRes = await axiosInstance.post('/api/assistant/chat', {
            message: messageText,
            applicationId: selectedAppId ? Number(selectedAppId) : null,
          });
          updateMessageText(assistantMsgId, fallbackRes.data.reply);
        } catch (fallbackErr) {
          const errMsg = fallbackErr.response?.data?.message || "Couldn't reach AI assistant. Please try again.";
          updateMessageText(assistantMsgId, errMsg);
        }
      }
    } finally {
      clearInterval(reasoningTimerRef.current);
      setIsGenerating(false);
      setStreamPhase(null);
      abortControllerRef.current = null;
    }
  }, [inputText, isGenerating, activeId, selectedAppId, token, appendMessage, newConversation, updateMessageText, updateReasoningText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick file attach (.txt / .md)
  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setInputText(prev => prev ? `${prev}\n\n[Attached ${file.name}]:\n${text}` : text);
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegenerate = (msgIndex) => {
    if (msgIndex <= 0) return;
    const prevUserMsg = messages[msgIndex - 1];
    if (prevUserMsg && prevUserMsg.sender === 'user') {
      handleSendMessage(prevUserMsg.text);
    }
  };

  const selectedApp = applications.find(a => String(a.id) === String(selectedAppId));
  const filteredApps = applications.filter(a =>
    a.companyName.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
    a.jobRole.toLowerCase().includes(appSearchQuery.toLowerCase())
  );

  const nonGreetingMessages = messages.filter(m => m.text !== INITIAL_GREETING);
  const isTranscriptEmpty = nonGreetingMessages.length === 0;

  return (
    <div className="assistant-layout">
      {/* Sidebar: Recent Conversations */}
      <aside className={`assistant-sidebar ${isHistorySidebarOpen ? 'assistant-sidebar--open' : 'assistant-sidebar--closed'}`}>
        <div className="assistant-sidebar__header">
          <span className="sidebar-title">Recent conversations</span>
          <button
            type="button"
            className="btn-new-chat"
            onClick={newConversation}
            title="New Chat"
          >
            + New chat
          </button>
        </div>

        <div className="assistant-sidebar__list">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`sidebar-conv-item ${conv.id === activeId ? 'sidebar-conv-item--active' : ''}`}
              onClick={() => switchConversation(conv.id)}
            >
              {editingConvId === conv.id ? (
                <input
                  type="text"
                  className="sidebar-rename-input"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameConversation(conv.id, editingTitle);
                      setEditingConvId(null);
                    } else if (e.key === 'Escape') {
                      setEditingConvId(null);
                    }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="sidebar-conv-title">{conv.title}</span>
              )}

              <div className="sidebar-conv-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="icon-btn-subtle"
                  title="Rename"
                  onClick={() => {
                    setEditingConvId(conv.id);
                    setEditingTitle(conv.title);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn-subtle icon-btn-danger"
                  title="Delete"
                  onClick={() => deleteConversation(conv.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Container */}
      <main className="assistant-main">
        {/* Top Header bar with sidebar toggle */}
        <header className="assistant-top-bar">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
            title={isHistorySidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            ☰
          </button>
          <span className="top-bar-title">HireTrack AI Assistant</span>
        </header>

        {/* Content View: Empty Centered vs Docked Transcript */}
        <div className="assistant-content">
          {isTranscriptEmpty ? (
            /* EMPTY STATE: Centered greeting & composer, chips BELOW composer */
            <div className="assistant-empty-state">
              <div className="empty-hero">
                <div className="ht-logo-mark ht-logo-mark--lg" aria-hidden="true">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 19 21 12 17 5 21 12 2" />
                  </svg>
                </div>
                <h1 className="empty-greeting">{INITIAL_GREETING}</h1>
              </div>

              {/* Centered Composer */}
              <div className="composer-container composer-container--centered">
                {renderComposer()}
              </div>

              {/* Suggestion chips BELOW composer */}
              <div className="suggestion-chips">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* DOCKED STATE: Transcript column + Docked Composer at bottom */
            <div className="assistant-docked-layout">
              <div
                ref={messagesContainerRef}
                className="transcript-scroll-area"
                onScroll={handleScroll}
              >
                <div className="transcript-column">
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`transcript-turn transcript-turn--${msg.sender}`}>
                      {msg.sender === 'user' ? (
                        <div className="user-bubble">{msg.text}</div>
                      ) : (
                        <div className="assistant-response">
                          <div className="assistant-response-header">
                            <div className={`ht-logo-mark ${isGenerating && idx === messages.length - 1 ? 'ht-logo-mark--animating' : ''}`}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 19 21 12 17 5 21 12 2" />
                              </svg>
                            </div>
                            <span className="assistant-name">HireTrack</span>

                            {/* Stream Phase Status Line */}
                            {isGenerating && idx === messages.length - 1 && (
                              <span className="stream-status-line">
                                {streamPhase === 'retrieving' && 'Reviewing your applications…'}
                                {streamPhase === 'thinking' && `${ROTATING_THINKING_WORDS[thinkingWordIdx]}…`}
                                {streamPhase === 'generating' && 'Generating response…'}
                              </span>
                            )}
                          </div>

                          {/* Collapsible Reasoning Block */}
                          {msg.reasoning && (
                            <div className="reasoning-disclosure">
                              <button
                                type="button"
                                className="reasoning-toggle-btn"
                                onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                              >
                                {isReasoningExpanded ? '▼' : '►'} Thought for {reasoningTimeSeconds}s
                              </button>
                              {isReasoningExpanded && (
                                <div className="reasoning-content">{msg.reasoning}</div>
                              )}
                            </div>
                          )}

                          {/* Assistant Message Body in proportional serif font */}
                          <div className="assistant-prose">
                            <Suspense fallback={<div>{msg.text}</div>}>
                              <ReactMarkdown remarkPlugins={remarkGfmRef.current ? [remarkGfmRef.current] : []}>
                                {msg.text || (isGenerating && idx === messages.length - 1 ? '...' : '')}
                              </ReactMarkdown>
                            </Suspense>
                          </div>

                          {/* Action Row */}
                          {msg.text && (
                            <div className="assistant-action-row">
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => copyToClipboard(msg.text)}
                                title="Copy response"
                              >
                                📋 Copy
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => handleRegenerate(idx)}
                                title="Regenerate response"
                              >
                                ↺ Regenerate
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating scroll to bottom button */}
                {showScrollBottomBtn && (
                  <button
                    type="button"
                    className="scroll-bottom-btn"
                    onClick={() => scrollToBottom('smooth')}
                  >
                    ↓ Scroll to bottom
                  </button>
                )}
              </div>

              {/* Docked composer near bottom */}
              <div className="composer-container composer-container--docked">
                {renderComposer()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  // Helper render method for Composer
  function renderComposer() {
    return (
      <div className="composer-card">
        {/* Context Pill Toolbar */}
        <div className="composer-toolbar">
          <div className="context-picker-wrapper">
            <button
              type="button"
              className="context-pill"
              onClick={() => setIsAppPickerOpen(!isAppPickerOpen)}
            >
              <span className="context-pill-icon">🎯</span>
              <span className="context-pill-text">
                {selectedApp ? `${selectedApp.companyName} — ${selectedApp.jobRole}` : 'All applications'}
              </span>
              {selectedApp ? (
                <span
                  className="context-pill-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAppId(null);
                  }}
                  title="Clear application context"
                >
                  ×
                </span>
              ) : (
                <span className="context-pill-caret">▾</span>
              )}
            </button>

            {/* Searchable Context Dropdown */}
            {isAppPickerOpen && (
              <div className="context-dropdown">
                <input
                  type="text"
                  className="context-search-input"
                  placeholder="Search applications..."
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="context-dropdown-list">
                  <div
                    className={`context-dropdown-item ${!selectedAppId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedAppId(null);
                      setIsAppPickerOpen(false);
                    }}
                  >
                    All applications (General context)
                  </div>
                  {filteredApps.map(app => (
                    <div
                      key={app.id}
                      className={`context-dropdown-item ${selectedAppId === app.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedAppId(app.id);
                        setIsAppPickerOpen(false);
                      }}
                    >
                      <strong>{app.companyName}</strong> — {app.jobRole}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="composer-input"
          placeholder="Ask anything about your job search, interviews, or resume..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {/* Composer Footer Actions */}
        <div className="composer-footer">
          <div className="composer-footer-left">
            <button
              type="button"
              className="btn-attach"
              onClick={() => fileInputRef.current?.click()}
              title="Attach text or markdown file"
            >
              + Attach file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              style={{ display: 'none' }}
              onChange={handleFileAttach}
            />
          </div>

          <div className="composer-footer-right">
            {isGenerating ? (
              <button
                type="button"
                className="btn-submit btn-stop"
                onClick={handleStopGeneration}
                title="Stop generating"
              >
                ■ Stop
              </button>
            ) : (
              <button
                type="button"
                className="btn-submit"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
              >
                Send ➔
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
