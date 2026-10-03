import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useLocation } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import { useChatHistory } from './useChatHistory';
import { repairMarkdownTables, TABLE_BR_MARKER } from '../lib/repairMarkdownTables';
import { processSingleFile, formatFileSize } from './attachmentParser';
import './ChatPage.css';

// Lazy load ReactMarkdown for performance (Phase 2 code splitting)
const ReactMarkdown = lazy(() => import('react-markdown'));

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

// Text normalization helper per item 3.2
const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\u2011/g, '-').replace(/\u202F/g, ' ');
};

// Recursive helper to split TABLE_BR_MARKER into real <br /> elements
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
    togglePinConversation,
  } = useChatHistory(userId, INITIAL_GREETING);

  // Input & context states
  const [inputText, setInputText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
  const [pickerHighlightedIdx, setPickerHighlightedIdx] = useState(0);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);

  // Streaming & status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null); // 'retrieving' | 'thinking' | 'generating' | null
  const [thinkingWordIdx, setThinkingWordIdx] = useState(0);
  const [reasoningTimeSeconds, setReasoningTimeSeconds] = useState(0);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  // Slide-over history panel & popover menu states
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenConvId, setMenuOpenConvId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Handle opening floating popover menu at trigger button coordinates
  const handleOpenMenu = (e, convId) => {
    e.stopPropagation();
    if (menuOpenConvId === convId) {
      setMenuOpenConvId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: Math.max(10, rect.right - 140),
    });
    setMenuOpenConvId(convId);
  };

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
  const cameraInputRef = useRef(null);
  const menuRef = useRef(null);
  const reasoningTimerRef = useRef(null);
  const contextPickerRef = useRef(null);

  // Load applications for context pill picker
  useEffect(() => {
    axiosInstance.get('/api/applications')
      .then(r => setApplications(r.data || []))
      .catch(() => {});
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

  // Close slide-over & popovers on Escape key or outside click/scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSlideOverOpen(false);
        setIsAppPickerOpen(false);
        setIsAttachMenuOpen(false);
        setMenuOpenConvId(null);
        setEditingConvId(null);
      }
    };
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.conv-popover-menu-portal') && !e.target.closest('.conv-menu-trigger')) {
        setMenuOpenConvId(null);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsAttachMenuOpen(false);
      }
    };
    const handleScrollOrResize = () => setMenuOpenConvId(null);

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Save and close rename input when clicking outside
  useEffect(() => {
    if (!editingConvId) return;
    const handleRenameOutsideClick = (e) => {
      if (!e.target.closest('.conv-rename-input')) {
        if (editingTitle.trim()) {
          renameConversation(editingConvId, editingTitle.trim());
        }
        setEditingConvId(null);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleRenameOutsideClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleRenameOutsideClick);
    };
  }, [editingConvId, editingTitle, renameConversation]);

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

  // File & Image attachment processor
  const processSelectedFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setAttachmentError(null);

    const validAttachments = attachments.filter(a => !a.loading);
    if (validAttachments.length + files.length > 5) {
      setAttachmentError('Maximum 5 attachments allowed per message.');
      return;
    }

    const pendingItems = files.map((file, i) => ({
      id: `pending_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('image/') ? 'image' : 'text',
      loading: true,
    }));

    setAttachments(prev => [...prev, ...pendingItems].slice(0, 5));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pendingId = pendingItems[i].id;
      try {
        const processed = await processSingleFile(file);
        setAttachments(prev => prev.map(item => item.id === pendingId ? processed : item));
      } catch (err) {
        setAttachments(prev => prev.filter(item => item.id !== pendingId));
        setAttachmentError(err.message || `Failed to process ${file.name}`);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        e.preventDefault();
        processSelectedFiles(imageFiles);
      }
    }
  };

  // SSE Stream Handler (item 3.2: TextDecoder stream:true, \n\n buffering)
  const handleSendMessage = useCallback(async (overrideText) => {
    const messageText = (overrideText || inputText).trim();
    const readyAttachments = attachments.filter(a => !a.loading);
    if ((!messageText && readyAttachments.length === 0) || isGenerating) return;

    if (!overrideText) {
      setInputText('');
      setAttachments([]);
      setAttachmentError(null);
    }

    if (!activeId) {
      newConversation();
    }

    // Attachments for backend payload
    const apiAttachments = readyAttachments.map(att => {
      if (att.type === 'image') {
        return { type: 'image', name: att.name, mimeType: att.mimeType, data: att.data };
      } else {
        return { type: 'text', name: att.name, content: att.content };
      }
    });

    // Attachments metadata for local state/localStorage
    const attachmentsMetadata = readyAttachments.map(att => ({
      name: att.name,
      type: att.type,
      size: att.size,
      thumbnail: att.thumbnail || null,
      notice: att.notice || null,
    }));

    const userMsg = { id: `msg_${Date.now()}`, sender: 'user', text: messageText };
    if (attachmentsMetadata.length > 0) {
      userMsg.attachmentsMetadata = attachmentsMetadata;
    }
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
        attachments: apiAttachments
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
        let errDetail = `HTTP error ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.message) errDetail = errJson.message;
        } catch (e) {}
        throw new Error(errDetail);
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
        const errMsg = err.message || "Couldn't reach AI assistant. Please try again.";
        if (errMsg.includes('Image analysis is not enabled') || errMsg.includes('SVG') || errMsg.includes('attachment')) {
          setAttachmentError(errMsg);
          updateMessageText(assistantMsgId, `[Error: ${errMsg}]`);
        } else {
          try {
            const fallbackRes = await axiosInstance.post('/api/assistant/chat', {
              message: messageText,
              applicationId: selectedAppId ? Number(selectedAppId) : null,
              attachments: apiAttachments
            });
            updateMessageText(assistantMsgId, fallbackRes.data.reply);
          } catch (fallbackErr) {
            const fbMsg = fallbackErr.response?.data?.message || errMsg;
            if (fbMsg.includes('Image analysis is not enabled') || fbMsg.includes('SVG')) {
              setAttachmentError(fbMsg);
            }
            updateMessageText(assistantMsgId, fbMsg);
          }
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

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
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
      let promptText = prevUserMsg.text;
      if (prevUserMsg.attachmentsMetadata && prevUserMsg.attachmentsMetadata.length > 0) {
        if (!promptText.trim()) {
          promptText = "[Regenerating message - original attachments are no longer available in history]";
        }
      }
      handleSendMessage(promptText);
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

  // Sort conversations: Pinned first, then by creation
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Render recent conversations list helper with Claude-style 3-dots menu & Pinning
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
        {sortedConversations.length === 0 ? (
          <div className="no-conversations-text">No recent chats</div>
        ) : (
          sortedConversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeId ? 'conv-item--active' : ''}`}
              onClick={() => {
                if (editingConvId !== conv.id) {
                  switchConversation(conv.id);
                  setIsSlideOverOpen(false);
                }
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
                      e.preventDefault();
                      e.stopPropagation();
                      if (editingTitle.trim()) {
                        renameConversation(conv.id, editingTitle.trim());
                      }
                      setEditingConvId(null);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingConvId(null);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="conv-item-left">
                    {conv.pinned && (
                      <span className="conv-pin-badge" title="Pinned">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="17" x2="12" y2="22"></line>
                          <path d="M5 17h14l-1.5-6h-11L5 17z"></path>
                          <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"></path>
                        </svg>
                      </span>
                    )}
                    <span className="conv-item-title">{conv.title}</span>
                  </div>

                  <div className="conv-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-btn-subtle conv-menu-trigger"
                      title="More options"
                      onClick={(e) => handleOpenMenu(e, conv.id)}
                      aria-label="More options"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2.2" />
                        <circle cx="12" cy="12" r="2.2" />
                        <circle cx="12" cy="19" r="2.2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Portal Menu for 3-dots actions (rendered directly in body to avoid scrollbar clipping) */}
      {menuOpenConvId && createPortal(
        <div
          className="conv-popover-menu-portal"
          style={{
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="conv-popover-item"
            onClick={() => {
              togglePinConversation(menuOpenConvId);
              setMenuOpenConvId(null);
            }}
          >
            <span className="conv-popover-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14l-1.5-6h-11L5 17z"></path>
                <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"></path>
              </svg>
            </span>
            <span>{sortedConversations.find(c => c.id === menuOpenConvId)?.pinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button
            type="button"
            className="conv-popover-item"
            onClick={() => {
              const conv = sortedConversations.find(c => c.id === menuOpenConvId);
              if (conv) {
                setEditingConvId(conv.id);
                setEditingTitle(conv.title);
              }
              setMenuOpenConvId(null);
            }}
          >
            <span className="conv-popover-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </span>
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="conv-popover-item conv-popover-item--danger"
            onClick={() => {
              deleteConversation(menuOpenConvId);
              setMenuOpenConvId(null);
            }}
          >
            <span className="conv-popover-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </span>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <div className={`assistant-layout ${isDragging ? 'assistant-layout--dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
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
        {/* Top Header bar with slide-over toggle icon */}
        <header className="assistant-top-bar">
          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setIsSlideOverOpen(!isSlideOverOpen)}
            title="Recent chats"
            aria-label="Recent chats"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
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
                  H
                </div>
                <h1 className="empty-greeting">{INITIAL_GREETING}</h1>
              </div>

              {/* Centered Composer */}
              <div className="composer-container composer-container--centered">
                {renderComposer()}
              </div>

              {/* Claude-style suggestion chips BELOW composer */}
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
                        <div className="user-bubble">
                          {msg.attachmentsMetadata && msg.attachmentsMetadata.length > 0 && (
                            <div className="user-bubble-attachments">
                              {msg.attachmentsMetadata.map((att, aIdx) => (
                                <div key={aIdx} className="user-attachment-badge">
                                  {att.type === 'image' && att.thumbnail ? (
                                    <img src={att.thumbnail} alt={att.name} className="user-attachment-thumb" />
                                  ) : (
                                    <span className="user-attachment-icon">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    </span>
                                  )}
                                  <div className="user-attachment-info">
                                    <span className="user-attachment-name">{att.name}</span>
                                    <span className="user-attachment-size">{formatFileSize(att.size)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {normalizeText(msg.text)}
                        </div>
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
                                {streamPhase === 'thinking' && `${ROTATING_THINKING_WORDS[thinkingWordIdx]}…`}
                                {streamPhase === 'generating' && 'Generating response…'}
                              </span>
                            )}
                          </div>

                          {/* Assistant Message Body in proportional serif font per item 3.2 */}
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

                                    // Single-line code snippet (simple box with copy icon, no top text tag)
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

                                    // Multi-line code container (Claude-style dark card with lowercase language label)
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

                          {/* Minimal Icon Action Row (Claude-style Copy & Regenerate) */}
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

  // Helper render method for Composer (Claude-style single pill bar with "+" menu & chips)
  function renderComposer() {
    return (
      <div className={`composer-card ${attachments.length > 0 ? 'composer-card--has-attachments' : ''}`}>
        {/* Inline Error Banner */}
        {attachmentError && (
          <div className="composer-inline-error">
            <span className="composer-inline-error-text">{attachmentError}</span>
            <button
              type="button"
              className="composer-inline-error-dismiss"
              onClick={() => setAttachmentError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Attachment Chips Bar */}
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map((att) => (
              <div key={att.id} className={`attachment-chip ${att.loading ? 'attachment-chip--loading' : ''}`}>
                {att.loading ? (
                  <span className="attachment-chip-spinner" />
                ) : att.type === 'image' && (att.previewUrl || att.thumbnail) ? (
                  <img src={att.thumbnail || att.previewUrl} alt={att.name} className="attachment-chip-img" />
                ) : (
                  <span className="attachment-chip-doc-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </span>
                )}
                <div className="attachment-chip-meta">
                  <span className="attachment-chip-name" title={att.name}>{att.name}</span>
                  <span className="attachment-chip-size">
                    {att.loading ? 'Reading...' : formatFileSize(att.size)}
                  </span>
                </div>
                <button
                  type="button"
                  className="attachment-chip-remove"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="composer-input-row">
          {/* Left: Attach File Menu */}
          <div className="composer-attach-wrapper" ref={menuRef}>
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => {
                setIsAttachMenuOpen(!isAttachMenuOpen);
                setAttachmentError(null);
              }}
              title="Attach files or photos"
              aria-expanded={isAttachMenuOpen}
            >
              +
            </button>
            {isAttachMenuOpen && (
              <div className="attach-popover-menu">
                <button
                  type="button"
                  className="attach-menu-item"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsAttachMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                  <span>Add files or photos</span>
                </button>
                <button
                  type="button"
                  className="attach-menu-item attach-menu-item--camera"
                  onClick={() => {
                    cameraInputRef.current?.click();
                    setIsAttachMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <span>Take a photo</span>
                </button>
                <div className="attach-menu-disclaimer">
                  Images are sent to the AI provider for analysis.
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.docx,.txt,.md"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processSelectedFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processSelectedFiles(e.target.files);
                  e.target.value = '';
                }
              }}
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

          {/* Right: Context Selector & Send Button */}
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

              {/* Mobile Backdrop for Context Picker Sheet */}
              {isAppPickerOpen && (
                <div
                  className="context-picker-mobile-backdrop"
                  onClick={() => setIsAppPickerOpen(false)}
                />
              )}

              {/* Searchable Context Dropdown Popover */}
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
                className={`composer-send-btn ${(inputText.trim() || attachments.some(a => !a.loading)) ? 'composer-send-btn--active' : ''}`}
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() && !attachments.some(a => !a.loading)}
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
