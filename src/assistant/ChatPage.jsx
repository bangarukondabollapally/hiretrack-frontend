import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import { useApplicationsQuery } from '../api/queries';
import { useChatHistory } from './useChatHistory';
import ChatHistoryList from './ChatHistoryList';
import { repairMarkdownTables, TABLE_BR_MARKER } from '../lib/repairMarkdownTables';
import './ChatPage.css';

const INITIAL_GREETING = "What can I help you with today?";

const SUGGESTED_PROMPTS = [
  { type: 'code', category: 'Code', label: 'Tailor resume for this role', prompt: 'Tailor my resume for this role' },
  { type: 'prep', category: 'Prep', label: 'Summarize prep notes', prompt: 'Summarize my interview preparation notes' },
  { type: 'status', category: 'Status', label: 'Applications in Interview stage', prompt: 'Show applications in Interview stage' },
  { type: 'strategy', category: 'Strategy', label: 'What applications need follow-up?', prompt: 'What applications need follow-up?' },
  { type: 'draft', category: 'Draft', label: 'Research before interview', prompt: 'What should I research before my interview?' },
];

const renderPromptIcon = (type) => {
  switch (type) {
    case 'code':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      );
    case 'prep':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      );
    case 'status':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      );
    case 'strategy':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"></path>
          <path d="M10 22h4"></path>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.6 2.87 1.5 3.5.76.76 1.23 1.52 1.41 2.5"></path>
        </svg>
      );
    case 'draft':
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      );
  }
};

const ROTATING_THINKING_WORDS = ['Thinking', 'Musing', 'Pondering', 'Mulling it over'];

const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\u2011/g, '-').replace(/\u202F/g, ' ');
};

const renderCellContent = (children) => {
  if (typeof children === 'string') {
    if (!children.includes(TABLE_BR_MARKER)) return children;
    const parts = children.split(TABLE_BR_MARKER);
    return parts.map((part, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {part}
      </span>
    ));
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <span key={idx}>{renderCellContent(child)}</span>
    ));
  }
  if (children && typeof children === 'object' && children.props && children.props.children) {
    return {
      ...children,
      props: {
        ...children.props,
        children: renderCellContent(children.props.children),
      },
    };
  }
  return children;
};

export default function ChatPage() {
  const { user, token } = useAuth();
  const userId = user?.userId;

  // Read layout context if provided, or fallback to local hook for standalone testability
  const outletContext = useOutletContext() || {};
  const isSidebarCollapsed = outletContext.isSidebarCollapsed ?? false;
  const setMobileMenuOpen = outletContext.setMobileMenuOpen;

  const localHistory = useChatHistory(userId, INITIAL_GREETING);
  const history = outletContext.conversations ? outletContext : localHistory;

  const {
    activeId,
    messages,
    newConversation,
    appendMessage,
    updateMessageText,
    updateReasoningText,
  } = history;

  // Window width tracking for responsive behavior
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktopExpanded = windowWidth >= 1024 && !isSidebarCollapsed;
  const isTabletOrCollapsed = windowWidth >= 768 && (windowWidth < 1024 || isSidebarCollapsed);
  const isMobile = windowWidth < 768;

  // History popover state for tablet/rail
  const [isHistoryPopoverOpen, setIsHistoryPopoverOpen] = useState(false);

  // Input & context states
  const [inputText, setInputText] = useState('');
  const { data: applicationsData } = useApplicationsQuery(userId);
  const applications = applicationsData || [];
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [pickerHighlightedIdx, setPickerHighlightedIdx] = useState(0);
  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Streaming & status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null);
  const [thinkingWordIdx, setThinkingWordIdx] = useState(0);
  const [reasoningTimeSeconds, setReasoningTimeSeconds] = useState(0);

  // UI state for auto-scroll, hairline header border & copy feedback
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const reasoningTimerRef = useRef(null);
  const contextPickerRef = useRef(null);
  const popoverRef = useRef(null);

  // Close popovers on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsHistoryPopoverOpen(false);
        setIsAppPickerOpen(false);
        setIsAttachMenuOpen(false);
      }
    };

    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && !e.target.closest('.top-bar-history-btn')) {
        setIsHistoryPopoverOpen(false);
      }
      if (contextPickerRef.current && !contextPickerRef.current.contains(e.target)) {
        setIsAppPickerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Rotate thinking words
  useEffect(() => {
    if (streamPhase === 'thinking') {
      const interval = setInterval(() => {
        setThinkingWordIdx(prev => (prev + 1) % ROTATING_THINKING_WORDS.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [streamPhase]);

  // Auto-grow textarea up to 160px then scroll
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
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
    setIsScrolled(c.scrollTop > 10);
    const isUp = c.scrollHeight - c.scrollTop - c.clientHeight > 120;
    setShowScrollBottomBtn(isUp);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // SSE Stream Handler
  const handleSendMessage = useCallback(async (overrideText) => {
    const messageText = (overrideText || inputText).trim();
    if ((!messageText && attachments.length === 0) || isGenerating) return;

    if (!overrideText) {
      setInputText('');
    }
    const currentAttachments = [...attachments];
    if (!overrideText) {
      setAttachments([]);
    }

    if (!activeId) {
      newConversation();
    }

    const userMsg = { id: `msg_${Date.now()}`, sender: 'user', text: messageText };
    if (currentAttachments.length > 0) {
      userMsg.attachments = currentAttachments;
    }
    appendMessage(userMsg);

    setIsGenerating(true);
    setStreamPhase('retrieving');
    setReasoningTimeSeconds(0);

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
        attachments: currentAttachments
      };

      const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
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
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          parseAndProcessBlock(block);
        }
      }

      function parseAndProcessBlock(block) {
        let eventType = 'message';
        let dataLines = [];

        for (const line of block.split('\n')) {
          if (!line.trim()) continue;
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.substring(5));
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
        try {
          const fallbackRes = await axiosInstance.post('/api/assistant/chat', {
            message: messageText,
            applicationId: selectedAppId ? Number(selectedAppId) : null,
            attachments: currentAttachments
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
  }, [inputText, attachments, isGenerating, activeId, selectedAppId, token, appendMessage, newConversation, updateMessageText, updateReasoningText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const processFiles = (files) => {
    let count = attachments.length;
    for (const file of files) {
      if (count >= 5) break;
      const isImage = file.type.startsWith('image/');
      const isText = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.type === 'text/plain';
      
      if (isImage) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) continue;
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1];
          setAttachments(prev => [...prev, { type: 'image', name: file.name, mimeType: file.type, data: base64Data }].slice(0, 5));
        };
        reader.readAsDataURL(file);
        count++;
      } else if (isText) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result || '';
          setAttachments(prev => [...prev, { type: 'text', name: file.name, content: text.substring(0, 20000) }].slice(0, 5));
        };
        reader.readAsText(file);
        count++;
      }
    }
    setIsAttachMenuOpen(false);
  };

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div className={`assistant-layout assistant-theme ${isDragging ? 'assistant-layout--dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <main className="assistant-main">
        {/* Header Bar per specification:
            - Desktop >=1024px expanded: Plain title row on page background, no History button, no New chat button.
            - Tablet / Rail / Collapsed: Title + ONE History button (opens popover with ChatHistoryList).
            - Mobile <768px: History button (opens mobile drawer) + Title + Icon-only "+ New chat" button.
            - Hairline bottom border appears when scrolled. */}
        <header className={`assistant-top-bar ${isScrolled ? 'assistant-top-bar--scrolled' : ''}`}>
          <div className="top-bar-left">
            {isMobile && (
              <button
                type="button"
                className="top-bar-history-btn"
                onClick={() => setMobileMenuOpen?.(true)}
                title="Open Chat History"
                aria-label="Open Chat History"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>History</span>
              </button>
            )}

            {isTabletOrCollapsed && (
              <div className="history-popover-wrapper" ref={popoverRef}>
                <button
                  type="button"
                  className="top-bar-history-btn"
                  onClick={() => setIsHistoryPopoverOpen(!isHistoryPopoverOpen)}
                  title="Recent Chats History"
                  aria-expanded={isHistoryPopoverOpen}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>History</span>
                </button>

                {isHistoryPopoverOpen && (
                  <div className="history-popover-dropdown">
                    <ChatHistoryList
                      conversations={history.conversations}
                      activeId={history.activeId}
                      onSelectConversation={(id) => {
                        history.switchConversation(id);
                        setIsHistoryPopoverOpen(false);
                      }}
                      onNewChat={() => {
                        history.newConversation();
                        setIsHistoryPopoverOpen(false);
                      }}
                      onRenameConversation={history.renameConversation}
                      onDeleteConversation={history.deleteConversation}
                      onTogglePinConversation={history.togglePinConversation}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="top-bar-title">HireTrack AI Assistant</span>

          <div className="top-bar-right">
            {isMobile && (
              <button
                type="button"
                className="top-bar-new-chat-icon-btn"
                onClick={() => {
                  newConversation();
                }}
                title="Start New Chat"
                aria-label="Start New Chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Content View: Empty Centered vs Docked Transcript */}
        <div className="assistant-content">
          {isTranscriptEmpty ? (
            /* EMPTY STATE: Centered greeting & composer, suggestion chips BELOW composer */
            <div className="assistant-empty-state">
              <div className="empty-hero">
                <div className="ht-logo-mark ht-logo-mark--lg" aria-hidden="true">
                  H
                </div>
                <h1 className="empty-greeting">{INITIAL_GREETING}</h1>
              </div>

              {/* Centered Composer */}
              <div className="composer-container composer-container--centered">
                {renderComposer()}
              </div>

              {/* Pill-shaped suggestion chips BELOW composer (documented exception) */}
              <div className="suggestion-chips">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    onClick={() => handleSendMessage(item.prompt)}
                  >
                    <span className="chip-icon">{renderPromptIcon(item.type)}</span>
                    <span className="chip-label">{item.label}</span>
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
                              H
                            </div>
                            <span className="assistant-name">HireTrack</span>

                            {/* Stream Phase Status Line */}
                            {isGenerating && idx === messages.length - 1 && (
                              <span className="stream-status-line">
                                {streamPhase === 'retrieving' && 'Reviewing your applications…'}
                                {streamPhase === 'thinking' && `${ROTATING_THINKING_WORDS[thinkingWordIdx]}… (Thought for ${reasoningTimeSeconds}s)`}
                                {streamPhase === 'generating' && 'Generating response…'}
                              </span>
                            )}
                          </div>

                          {/* Assistant Message Body in proportional serif font (Source Serif 4) */}
                          <div className="assistant-prose">
                            <Suspense fallback={<div>{normalizeText(msg.text)}</div>}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table({ children, ...props }) {
                                    return (
                                      <div className="assistant-table-wrapper">
                                        <table className="assistant-table" {...props}>
                                          {children}
                                        </table>
                                      </div>
                                    );
                                  },
                                  th({ children, ...props }) {
                                    return <th {...props}>{renderCellContent(children)}</th>;
                                  },
                                  td({ children, ...props }) {
                                    return <td {...props}>{renderCellContent(children)}</td>;
                                  },
                                  code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    if (inline) {
                                      return <code className="inline-code-pill" {...props}>{children}</code>;
                                    }
                                    const lang = match ? match[1].toLowerCase() : 'text';
                                    const isSingleLine = !codeText.includes('\n');

                                    if (isSingleLine) {
                                      const singleCopyId = `code_${idx}_${codeText.slice(0, 8)}`;
                                      return (
                                        <div className="single-line-code-box">
                                          <code className="single-line-code-text">{codeText}</code>
                                          <button
                                            type="button"
                                            className="code-block-copy-btn"
                                            onClick={() => copyToClipboard(codeText, singleCopyId)}
                                            title={copiedId === singleCopyId ? 'Copied!' : 'Copy code'}
                                            aria-label="Copy code"
                                          >
                                            {copiedId === singleCopyId ? (
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                              </svg>
                                            ) : (
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                              </svg>
                                            )}
                                          </button>
                                        </div>
                                      );
                                    }

                                    const multiCopyId = `code_${idx}_${lang}`;
                                    return (
                                      <div className="code-block-wrapper">
                                        <div className="code-block-header">
                                          <span className="code-block-lang">{lang}</span>
                                          <button
                                            type="button"
                                            className="code-block-copy-btn"
                                            onClick={() => copyToClipboard(codeText, multiCopyId)}
                                            title={copiedId === multiCopyId ? 'Copied!' : 'Copy code'}
                                            aria-label="Copy code"
                                          >
                                            <span className="copy-btn-inner">
                                              {copiedId === multiCopyId ? (
                                                <>
                                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                  </svg>
                                                  <span>Copied!</span>
                                                </>
                                              ) : (
                                                <>
                                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                  </svg>
                                                  <span>Copy</span>
                                                </>
                                              )}
                                            </span>
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
                                {repairMarkdownTables(normalizeText(msg.text)) || (isGenerating && idx === messages.length - 1 ? '...' : '')}
                              </ReactMarkdown>
                            </Suspense>
                          </div>

                          {/* Minimal Icon Action Row (Copy & Regenerate - Always visible on touch) */}
                          {msg.text && (
                            <div className="assistant-action-row">
                              <button
                                type="button"
                                className="action-btn-icon"
                                onClick={() => copyToClipboard(msg.text, `msg_${idx}`)}
                                title={copiedId === `msg_${idx}` ? 'Copied!' : 'Copy'}
                                aria-label="Copy response"
                              >
                                {copiedId === `msg_${idx}` ? (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                className="action-btn-icon"
                                onClick={() => handleRegenerate(idx)}
                                title="Regenerate response"
                                aria-label="Regenerate response"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M23 4v6h-6"></path>
                                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
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
      <div className={`composer-card ${attachments.length > 0 ? 'composer-card--has-attachments' : ''}`}>
        {/* Attachment Chips */}
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((att, idx) => (
              <div key={idx} className="attachment-chip">
                <span className="attachment-chip-icon">
                  {att.type === 'image' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  )}
                </span>
                <span className="attachment-chip-name">{att.name}</span>
                <button type="button" className="attachment-chip-remove" onClick={() => removeAttachment(idx)} aria-label="Remove attachment">×</button>
              </div>
            ))}
          </div>
        )}
        
        <div className="composer-input-row">
          {/* Left: Attach File Menu */}
          <div className="composer-attach-wrapper">
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              title="Attach files"
              aria-expanded={isAttachMenuOpen}
            >
              +
            </button>
            {isAttachMenuOpen && (
              <>
                <div className="attach-menu-backdrop" onClick={() => setIsAttachMenuOpen(false)} />
                <div className="attach-popover-menu">
                  <button type="button" onClick={() => { fileInputRef.current.accept = ".png,.jpeg,.jpg,.webp,.gif"; fileInputRef.current?.click(); setIsAttachMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    Upload image
                  </button>
                  <button type="button" onClick={() => { fileInputRef.current.accept = ".txt,.md,.pdf,.docx"; fileInputRef.current?.click(); setIsAttachMenuOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    Upload text file
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileAttach}
            />
          </div>

          {/* Center: Textarea input */}
          <textarea
            ref={textareaRef}
            className="composer-input"
            placeholder="Write a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />

          {/* Right: Context Selector & Send/Stop Button */}
          <div className="composer-right-actions">
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
                <span className="context-pill-text">
                  {selectedApp ? `${selectedApp.companyName}` : 'All applications'}
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

              {/* Context Dropdown Popover */}
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

            {/* Send or Stop Button */}
            {isGenerating ? (
              <button
                type="button"
                className="composer-send-btn composer-send-btn--stop"
                onClick={handleStopGeneration}
                title="Stop generating"
              >
                ■
              </button>
            ) : (
              <button
                type="button"
                className={`composer-send-btn ${(inputText.trim() || attachments.length > 0) ? 'composer-send-btn--active' : ''}`}
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() && attachments.length === 0}
                title="Send message"
                aria-label="Send message"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
