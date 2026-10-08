import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../auth/AuthContext';
import { useApplicationsQuery } from '../api/queries';
import { useChatHistory } from './useChatHistory';
import ChatHistoryList from './ChatHistoryList';
import { AnimatePresence, m } from 'framer-motion';
import { popoverVariants, staggerContainerVariants, listItemVariants, toastVariants } from '../lib/motion';
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

const getFileIconAndType = (filename = '') => {
  const ext = (filename.split('.').pop() || '').toUpperCase();
  let typeLabel = ext || 'FILE';
  let icon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  );

  if (ext === 'PDF') {
    typeLabel = 'PDF';
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    );
  } else if (ext === 'CSV') {
    typeLabel = 'CSV';
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
    );
  } else if (ext === 'JSON') {
    typeLabel = 'JSON';
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
    );
  } else if (ext === 'MD' || ext === 'TXT') {
    typeLabel = ext;
    icon = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    );
  }

  return { icon, typeLabel };
};

const normalizeText = (text) => {
  if (!text) return '';
  return text.replace(/\u2011/g, '-').replace(/\u202F/g, ' ');
};

const extractUserDisplayContent = (rawText) => {
  if (!rawText) return { text: '', attachments: [] };
  if (!rawText.includes('[Attached File:')) return { text: rawText, attachments: [] };

  const attRegex = /\[Attached File:\s*([^\]]+)\][\s\S]*?\[\/Attached File\]/g;
  const foundAtts = [];
  let match;
  while ((match = attRegex.exec(rawText)) !== null) {
    foundAtts.push({ name: match[1].trim() });
  }

  const cleanText = rawText.replace(/\[Attached File:\s*[^\]]+\][\s\S]*?\[\/Attached File\]/g, '').trim();
  return { text: cleanText, attachments: foundAtts };
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

  const _isDesktopExpanded = windowWidth >= 1024 && !isSidebarCollapsed;
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
  const [fileError, setFileError] = useState('');
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

  const handleEditPrompt = (msg) => {
    const parsed = extractUserDisplayContent(msg.text);
    setInputText(parsed.text || '');
    if (msg.attachments && msg.attachments.length > 0) {
      setAttachments(msg.attachments);
    } else if (parsed.attachments && parsed.attachments.length > 0) {
      setAttachments(parsed.attachments);
    }
  };

  // SSE Stream Handler
  const handleSendMessage = useCallback(async (overrideText) => {
    const promptText = (overrideText || inputText).trim();
    if ((!promptText && attachments.length === 0) || isGenerating) return;

    const currentAttachments = [...attachments];
    let fullPayloadMessage = promptText;

    if (currentAttachments.length > 0) {
      const formattedAttachments = currentAttachments.map(att =>
        `[Attached File: ${att.name}]\n${att.content}\n[/Attached File]`
      ).join('\n\n');

      if (fullPayloadMessage) {
        fullPayloadMessage = `${fullPayloadMessage}\n\n${formattedAttachments}`;
      } else {
        fullPayloadMessage = formattedAttachments;
      }
    }

    if (!overrideText) {
      setInputText('');
      setAttachments([]);
    }

    if (!activeId) {
      newConversation();
    }

    const userMsg = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: promptText,
      attachments: currentAttachments.map(a => ({ name: a.name, size: a.size, content: a.content })),
    };
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
        message: fullPayloadMessage,
        applicationId: selectedAppId ? Number(selectedAppId) : null,
        conversationId: activeId ? Number(activeId) : null,
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
          } else if (eventType === 'done') {
            if (data.conversationId) {
              history.setActiveId?.(data.conversationId);
              window.history.replaceState(null, '', `/assistant/${data.conversationId}`);
            }
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
            message: fullPayloadMessage,
            applicationId: selectedAppId ? Number(selectedAppId) : null,
            conversationId: activeId ? Number(activeId) : null,
          });
          updateMessageText(assistantMsgId, fallbackRes.data.reply);
          if (fallbackRes.data.conversationId) {
            history.setActiveId?.(fallbackRes.data.conversationId);
            window.history.replaceState(null, '', `/assistant/${fallbackRes.data.conversationId}`);
          }
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
      if (userId) {
        history.refetchConversations?.();
      }
    }
  }, [inputText, attachments, isGenerating, activeId, selectedAppId, token, appendMessage, newConversation, updateMessageText, updateReasoningText]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const processFiles = async (files) => {
    setFileError('');
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB limit per prompt specification
    const MAX_TEXT_CHARS = 20000;

    const allowedExtensions = ['txt', 'md', 'csv', 'json', 'pdf'];

    for (const file of files) {
      if (attachments.length >= 3) {
        setFileError('Maximum 3 reference files can be attached.');
        break;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        setFileError(`Unsupported file "${file.name}". Supported formats: .txt, .pdf, .md, .csv, .json`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum size limit of 1 MB.`);
        continue;
      }

      try {
        const { extractTextFromFile } = await import('../lib/fileParser');
        const extractedText = await extractTextFromFile(file);

        if (!extractedText || !extractedText.trim()) {
          setFileError(`File "${file.name}" is empty or no readable text could be extracted.`);
          continue;
        }

        if (extractedText.length > MAX_TEXT_CHARS) {
          setFileError(`Extracted text from "${file.name}" (${extractedText.length} chars) exceeds maximum limit of 20,000 characters.`);
          continue;
        }

        const sizeFormatted = file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : file.size >= 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${file.size} B`;
        setAttachments(prev => [...prev, { name: file.name, size: sizeFormatted, content: extractedText.trim() }]);
      } catch (err) {
        setFileError(`Failed to read file "${file.name}": ${err.message || 'Unknown error'}`);
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

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/openings" replace />;
  }

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

                <AnimatePresence>
                  {isHistoryPopoverOpen && (
                    <m.div
                      className="history-popover-dropdown"
                      variants={popoverVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
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
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <span className="top-bar-title">Assistant</span>

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
              <m.div
                className="suggestion-chips"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <m.button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    variants={listItemVariants}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(item.prompt)}
                  >
                    <span className="chip-icon">{renderPromptIcon(item.type)}</span>
                    <span className="chip-label">{item.label}</span>
                  </m.button>
                ))}
              </m.div>
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
                        <m.div
                          className="user-bubble-wrapper"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="user-bubble">
                            {(msg.attachments?.length > 0 || extractUserDisplayContent(msg.text).attachments.length > 0) && (
                              <div className="message-attachments-list">
                                {(msg.attachments || extractUserDisplayContent(msg.text).attachments).map((att, attIdx) => {
                                  const { icon, typeLabel } = getFileIconAndType(att.name);
                                  return (
                                    <div key={attIdx} className="message-attachment-pill">
                                      <span className="attachment-pill-icon">{icon}</span>
                                      <div className="attachment-pill-info">
                                        <span className="attachment-pill-name" title={att.name}>{att.name}</span>
                                        <span className="attachment-pill-meta">{typeLabel}{att.size ? ` • ${att.size}` : ''}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {extractUserDisplayContent(msg.text).text && (
                              <div className="user-message-text">
                                {normalizeText(extractUserDisplayContent(msg.text).text)}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="user-prompt-edit-btn"
                            onClick={() => handleEditPrompt(msg)}
                            title="Edit prompt"
                            aria-label="Edit prompt"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                        </m.div>
                      ) : (
                        <div className="assistant-response">
                          <div className="assistant-response-header">
                            <div className={`ht-logo-mark ${isGenerating && idx === messages.length - 1 ? 'ht-logo-mark--animating' : ''}`}>
                              H
                            </div>
                            <span className="assistant-name">HireTrack</span>

                            {/* Stream Phase Status Line */}
                            {isGenerating && idx === messages.length - 1 && (
                              <AnimatePresence mode="wait">
                                <m.span
                                  key={thinkingWordIdx + (streamPhase || '')}
                                  className="stream-status-line"
                                  initial={{ opacity: 0, y: 2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -2 }}
                                  transition={{ duration: 0.18 }}
                                >
                                  {streamPhase === 'retrieving' && 'Reviewing your applications…'}
                                  {streamPhase === 'thinking' && `${ROTATING_THINKING_WORDS[thinkingWordIdx]}… (Thought for ${reasoningTimeSeconds}s)`}
                                  {streamPhase === 'generating' && 'Generating response…'}
                                </m.span>
                              </AnimatePresence>
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
                                  code({ node: _node, inline, className, children, ...props }) {
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
                <AnimatePresence>
                  {showScrollBottomBtn && (
                    <m.button
                      key="scroll-btn"
                      type="button"
                      className="scroll-bottom-btn"
                      variants={toastVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      onClick={() => scrollToBottom('smooth')}
                    >
                      ↓ Scroll to bottom
                    </m.button>
                  )}
                </AnimatePresence>
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
      <div className={`composer-card ${(attachments.length > 0 || selectedApp || fileError) ? 'composer-card--has-attachments' : ''}`}>
        {fileError && (
          <div style={{ color: '#991B1B', fontSize: '0.8rem', padding: '6px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}>
            {fileError}
          </div>
        )}
        {/* Selected Context Chip & File Attachments */}
        {(selectedApp || attachments.length > 0) && (
          <div className="composer-attachments">
            {selectedApp && (
              <div className="context-selected-chip">
                <span>Context: <strong>{selectedApp.companyName}</strong> — {selectedApp.jobRole}</span>
                <button
                  type="button"
                  className="context-selected-chip-remove"
                  onClick={() => setSelectedAppId(null)}
                  title="Clear application context"
                >
                  ×
                </button>
              </div>
            )}
            {attachments.map((att, idx) => {
              const { icon, typeLabel } = getFileIconAndType(att.name);
              return (
                <div key={idx} className="attachment-chip">
                  <span className="attachment-chip-icon">{icon}</span>
                  <div className="attachment-chip-info">
                    <span className="attachment-chip-name" title={att.name}>{att.name}</span>
                    <span className="attachment-chip-meta">{typeLabel}{att.size ? ` • ${att.size}` : ''}</span>
                  </div>
                  <button type="button" className="attachment-chip-remove" onClick={() => removeAttachment(idx)} aria-label="Remove attachment">×</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="composer-input-row">
          {/* Left: Attach File & Context Menu */}
          <div className="composer-attach-wrapper">
            <button
              type="button"
              className="composer-attach-btn"
              onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
              title="Attach file"
              aria-label="Attach file"
            >
              +
            </button>
            <AnimatePresence>
              {isAttachMenuOpen && (
                <>
                  <div className="attach-menu-backdrop" onClick={() => setIsAttachMenuOpen(false)} />
                  <m.div
                    className="attach-popover-menu"
                    variants={popoverVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachMenuOpen(false);
                        setIsAppPickerOpen(true);
                        setPickerHighlightedIdx(0);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      Add application context
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current.accept = ".txt,.md,.csv,.json,.pdf";
                        fileInputRef.current?.click();
                        setIsAttachMenuOpen(false);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      Attach file
                    </button>
                  </m.div>
                </>
              )}
            </AnimatePresence>

            {/* Context Dropdown Modal/Sheet */}
            <AnimatePresence>
              {isAppPickerOpen && (
                <>
                  <div className="attach-menu-backdrop" onClick={() => setIsAppPickerOpen(false)} />
                  <m.div
                    className="context-dropdown"
                    variants={popoverVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
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
                  </m.div>
                </>
              )}
            </AnimatePresence>

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
            placeholder="Ask about your applications, interviews or resume..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />

          {/* Right: Send/Stop Button */}
          <div className="composer-right-actions">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <m.button
                  key="stop"
                  type="button"
                  className="composer-send-btn composer-send-btn--stop"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onClick={handleStopGeneration}
                  title="Stop generating"
                >
                  ■
                </m.button>
              ) : (
                <m.button
                  key="send"
                  type="button"
                  className={`composer-send-btn ${(inputText.trim() || attachments.length > 0) ? 'composer-send-btn--active' : ''}`}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() && attachments.length === 0}
                  title="Send message"
                  aria-label="Send message"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </m.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }
}
