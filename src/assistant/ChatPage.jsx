import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useLocation } from 'react-router-dom';
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

// Text normalization helper per item 3.2
const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\u2011/g, '-').replace(/\u202F/g, ' ');
};

export default function ChatPage() {
  const { user, token } = useAuth();
  const userId = user?.userId;
  const location = useLocation();

  // Read layout sidebar context if provided
  const outletContext = useOutletContext() || {};
  const isSidebarCollapsed = outletContext.isSidebarCollapsed ?? false;

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
  const [pickerHighlightedIdx, setPickerHighlightedIdx] = useState(0);

  // Streaming & status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null); // 'retrieving' | 'thinking' | 'generating' | null
  const [thinkingWordIdx, setThinkingWordIdx] = useState(0);
  const [reasoningTimeSeconds, setReasoningTimeSeconds] = useState(0);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Slide-over history panel state (for collapsed sidebar or mobile)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Portal mount check
  const [portalTarget, setPortalTarget] = useState(null);

  // UI state for auto-scroll & copy feedback
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const reasoningTimerRef = useRef(null);
  const remarkGfmRef = useRef(null);
  const contextPickerRef = useRef(null);

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

  // Set portal target for expanded sidebar history slot
  useEffect(() => {
    const target = document.getElementById('sidebar-recent-conversations-slot');
    setPortalTarget(target);
  }, [isSidebarCollapsed, location.pathname]);

  // Close slide-over history panel on route change
  useEffect(() => {
    setIsSlideOverOpen(false);
  }, [location.pathname]);

  // Close slide-over on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSlideOverOpen(false);
        setIsAppPickerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
  }, [inputText]);

  // Auto-scroll transcript
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const isUp = c.scrollHeight - c.scrollTop - c.clientHeight > 120;
    setShowScrollBottomBtn(isUp);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // SSE Stream Handler (item 3.2: TextDecoder stream:true, \n\n buffering)
  const handleSendMessage = useCallback(async (overrideText) => {
    const messageText = (overrideText || inputText).trim();
    if (!messageText || isGenerating) return;

    if (!overrideText) {
      setInputText('');
    }

    // Auto-create new conversation if needed
    if (!activeId) {
      newConversation();
    }

    // Append User Message
    const userMsg = { id: `msg_${Date.now()}`, sender: 'user', text: messageText };
    appendMessage(userMsg);

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
        if (done) {
          if (buffer.trim()) {
            parseAndProcessBlock(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || ''; // Keep partial block in buffer until full \n\n boundary

        for (const block of blocks) {
          parseAndProcessBlock(block);
        }
      }

      function parseAndProcessBlock(block) {
        let eventType = 'message';
        let dataLines = [];

        for (const line of block.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event:')) {
            eventType = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            dataLines.push(trimmed.substring(5).trim());
          }
        }

        if (dataLines.length === 0) return;
        const rawData = dataLines.join('\n');

        try {
          const data = JSON.parse(rawData);
          if (eventType === 'status') {
            setStreamPhase(data.phase);
          } else if (eventType === 'token') {
            setStreamPhase('generating');
            updateMessageText(assistantMsgId, prev => (prev || '') + (data.text || ''));
          } else if (eventType === 'reasoning') {
            updateReasoningText(assistantMsgId, data.text || '');
          } else if (eventType === 'error') {
            updateMessageText(assistantMsgId, `\n\n[Error: ${data.message || 'Stream connection failed'}]`);
          }
        } catch (e) {
          console.warn('Unparseable SSE JSON chunk:', rawData, e);
          if (eventType === 'token') {
            updateMessageText(assistantMsgId, prev => (prev || '') + rawData);
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
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

  // Application picker options array (0 is "All applications", 1..N are apps)
  const pickerOptions = [{ id: null, companyName: 'All applications', jobRole: 'General context' }, ...filteredApps];

  const handlePickerKeyDown = (e) => {
    if (!isAppPickerOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPickerHighlightedIdx(prev => Math.min(prev + 1, pickerOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPickerHighlightedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedOption = pickerOptions[pickerHighlightedIdx];
      if (selectedOption) {
        setSelectedAppId(selectedOption.id);
        setIsAppPickerOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsAppPickerOpen(false);
    }
  };

  const nonGreetingMessages = messages.filter(m => m.text !== INITIAL_GREETING);
  const isTranscriptEmpty = nonGreetingMessages.length === 0;

  // Render recent conversations list helper
  const renderConversationsList = () => (
    <div className="recent-conversations-container">
      <div className="recent-conversations-header">
        <span className="recent-conversations-title">Recent Chats</span>
        <button
          type="button"
          className="btn-new-chat"
          onClick={() => {
            newConversation();
            setIsSlideOverOpen(false);
          }}
          title="New Chat"
        >
          + New chat
        </button>
      </div>

      <div className="recent-conversations-list">
        {conversations.length === 0 ? (
          <div className="no-conversations-text">No recent chats</div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeId ? 'conv-item--active' : ''}`}
              onClick={() => {
                switchConversation(conv.id);
                setIsSlideOverOpen(false);
              }}
            >
              {editingConvId === conv.id ? (
                <input
                  type="text"
                  className="conv-rename-input"
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
                  onBlur={() => {
                    renameConversation(conv.id, editingTitle);
                    setEditingConvId(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="conv-item-title">{conv.title}</span>
              )}

              <div className="conv-item-actions" onClick={(e) => e.stopPropagation()}>
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
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="assistant-layout">
      {/* Portal recent conversations into expanded sidebar if available */}
      {!isSidebarCollapsed && portalTarget && createPortal(renderConversationsList(), portalTarget)}

      {/* Slide-over panel backdrop for collapsed sidebar or mobile */}
      {isSlideOverOpen && (
        <div
          className="history-slideover-backdrop"
          onClick={() => setIsSlideOverOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-over panel (closed by default) */}
      <div className={`history-slideover-panel ${isSlideOverOpen ? 'history-slideover-panel--open' : ''}`}>
        <div className="history-slideover-close-header">
          <span>Recent Conversations</span>
          <button
            type="button"
            className="icon-btn-subtle"
            onClick={() => setIsSlideOverOpen(false)}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        {renderConversationsList()}
      </div>

      {/* Main Container */}
      <main className="assistant-main">
        {/* Top Header bar with slide-over toggle button */}
        <header className="assistant-top-bar">
          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setIsSlideOverOpen(!isSlideOverOpen)}
            title="Recent Conversations"
            aria-label="Recent Conversations"
          >
            💬 Recent chats
          </button>
          <span className="top-bar-title">HireTrack AI Assistant</span>
          <button
            type="button"
            className="btn-new-chat-top"
            onClick={newConversation}
            title="Start New Chat"
          >
            + New chat
          </button>
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
                        <div className="user-bubble">{normalizeText(msg.text)}</div>
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

                          {/* Minimal Claude-style "Thought for Ns" disclosure (item 3.2) */}
                          {(msg.reasoning || (isGenerating && idx === messages.length - 1 && reasoningTimeSeconds > 0)) && (
                            <div className="thought-container">
                              {msg.reasoning ? (
                                <button
                                  type="button"
                                  className="thought-toggle-btn"
                                  onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
                                >
                                  <span className="thought-chevron">{isReasoningExpanded ? '▼' : '►'}</span>
                                  <span>Thought for {reasoningTimeSeconds || 1}s</span>
                                </button>
                              ) : (
                                <div className="thought-static-label">
                                  Thought for {reasoningTimeSeconds || 1}s
                                </div>
                              )}

                              {isReasoningExpanded && msg.reasoning && (
                                <div className="thought-reasoning-panel">
                                  {normalizeText(msg.reasoning)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Assistant Message Body in proportional serif font per item 3.2 */}
                          <div className="assistant-prose">
                            <Suspense fallback={<div>{normalizeText(msg.text)}</div>}>
                              <ReactMarkdown
                                remarkPlugins={remarkGfmRef.current ? [remarkGfmRef.current] : []}
                                components={{
                                  code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    if (inline) {
                                      return <code className="inline-code-pill" {...props}>{children}</code>;
                                    }
                                    const lang = match ? match[1] : 'text';
                                    const isTextLike = lang === 'text' || lang === 'email' || lang === 'plain' || !match;
                                    return (
                                      <div className={`code-block-wrapper ${isTextLike ? 'code-block-wrapper--text' : ''}`}>
                                        <div className="code-block-header">
                                          <span className="code-block-lang">{lang}</span>
                                          <button
                                            type="button"
                                            className="code-block-copy-btn"
                                            onClick={() => copyToClipboard(codeText, `code_${idx}`)}
                                          >
                                            {copiedId === `code_${idx}` ? 'Copied!' : 'Copy'}
                                          </button>
                                        </div>
                                        <pre className="code-block-content">
                                          <code>{codeText}</code>
                                        </pre>
                                      </div>
                                    );
                                  }
                                }}
                              >
                                {normalizeText(msg.text) || (isGenerating && idx === messages.length - 1 ? '...' : '')}
                              </ReactMarkdown>
                            </Suspense>
                          </div>

                          {/* Action Row */}
                          {msg.text && (
                            <div className="assistant-action-row">
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => copyToClipboard(msg.text, `msg_${idx}`)}
                                title="Copy response"
                              >
                                {copiedId === `msg_${idx}` ? '✓ Copied' : '📋 Copy'}
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

  // Helper render method for Composer (item 3.2 spec)
  function renderComposer() {
    return (
      <div className="composer-card">
        {/* Context Pill Toolbar */}
        <div className="composer-toolbar">
          <div className="context-picker-wrapper" ref={contextPickerRef}>
            <button
              type="button"
              className="context-pill"
              onClick={() => {
                setIsAppPickerOpen(!isAppPickerOpen);
                setPickerHighlightedIdx(0);
              }}
              aria-expanded={isAppPickerOpen}
              aria-label="Select application context"
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

            {/* Mobile Backdrop for Context Picker Sheet */}
            {isAppPickerOpen && (
              <div
                className="context-picker-mobile-backdrop"
                onClick={() => setIsAppPickerOpen(false)}
              />
            )}

            {/* Searchable Context Dropdown Popover / Mobile Bottom Sheet */}
            {isAppPickerOpen && (
              <div
                className="context-dropdown"
                onKeyDown={handlePickerKeyDown}
              >
                <div className="context-search-header">
                  <input
                    type="text"
                    className="context-search-input"
                    placeholder="Search applications..."
                    value={appSearchQuery}
                    onChange={(e) => {
                      setAppSearchQuery(e.target.value);
                      setPickerHighlightedIdx(0);
                    }}
                    autoFocus
                  />
                </div>
                <div className="context-dropdown-list">
                  <div
                    className={`context-dropdown-item ${!selectedAppId ? 'selected' : ''} ${pickerHighlightedIdx === 0 ? 'highlighted' : ''}`}
                    onClick={() => {
                      setSelectedAppId(null);
                      setIsAppPickerOpen(false);
                    }}
                    onMouseEnter={() => setPickerHighlightedIdx(0)}
                  >
                    <strong>All applications</strong> (General context)
                  </div>
                  {filteredApps.map((app, idx) => {
                    const itemIdx = idx + 1;
                    return (
                      <div
                        key={app.id}
                        className={`context-dropdown-item ${selectedAppId === app.id ? 'selected' : ''} ${pickerHighlightedIdx === itemIdx ? 'highlighted' : ''}`}
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setIsAppPickerOpen(false);
                        }}
                        onMouseEnter={() => setPickerHighlightedIdx(itemIdx)}
                      >
                        <strong>{app.companyName}</strong> — {app.jobRole}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Textarea: borderless container with inner textarea outline removed */}
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
                className={`btn-submit ${inputText.trim() ? 'btn-submit--active' : ''}`}
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
