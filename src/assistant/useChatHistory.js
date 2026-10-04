/**
 * useChatHistory — localStorage-backed chat persistence per DESIGN.md §23.
 *
 * Key: `hiretrack_chat_${userId}` — scoped strictly to the logged-in user.
 * Chat data is cleared from localStorage when logout() is called in AuthContext.
 *
 * Shape stored:
 *   {
 *     conversations: [
 *       { id: string, title: string, createdAt: string, messages: Message[] }
 *     ],
 *     activeConversationId: string | null
 *   }
 */

import { useState, useCallback, useEffect, useRef } from 'react';

import { sanitizeConversation } from './chatHistoryUtils';

const STORAGE_VERSION = 1;

function makeConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function storageKey(userId) {
  return `hiretrack_chat_${userId}`;
}

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) return null;
    if (Array.isArray(parsed.conversations)) {
      parsed.conversations = parsed.conversations.map(sanitizeConversation);
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(userId, data) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ version: STORAGE_VERSION, ...data }));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

/** Clear all chat history for a given user (called on logout). */
export function clearChatHistory(userId) {
  if (userId) {
    localStorage.removeItem(storageKey(userId));
  }
}

/** React hook — returns state + actions for chat history management. */
export function useChatHistory(userId, initialGreeting) {
  const effectiveUserId = userId ? String(userId) : 'guest';

  const [conversations, setConversations] = useState(() => {
    const stored = loadFromStorage(effectiveUserId);
    return stored?.conversations || [];
  });

  const [activeId, setActiveId] = useState(() => {
    const stored = loadFromStorage(effectiveUserId);
    return stored?.activeConversationId || null;
  });

  // When effectiveUserId changes (e.g. login completes), load chat history for the user
  const lastUserIdRef = useRef(effectiveUserId);
  useEffect(() => {
    if (lastUserIdRef.current !== effectiveUserId) {
      lastUserIdRef.current = effectiveUserId;
      const stored = loadFromStorage(effectiveUserId);
      if (stored && stored.conversations) {
        setConversations(stored.conversations);
        setActiveId(stored.activeConversationId || (stored.conversations.length > 0 ? stored.conversations[0].id : null));
      } else {
        setConversations([]);
        setActiveId(null);
      }
    }
  }, [effectiveUserId]);

  // Persist whenever conversations or activeId change
  useEffect(() => {
    saveToStorage(effectiveUserId, { conversations, activeConversationId: activeId });
  }, [conversations, activeId, effectiveUserId]);

  /** Active conversation object, or null if none selected. */
  const activeConversation = conversations.find(c => c.id === activeId) || null;

  /** Messages for the current conversation. */
  const messages = activeConversation?.messages || [];

  /** Start a brand-new empty conversation and make it active. */
  const newConversation = useCallback(() => {
    const id = makeConversationId();
    const greeting = {
      id: `msg_${Date.now()}`,
      sender: 'assistant',
      text: initialGreeting,
    };
    const conv = {
      id,
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      messages: [greeting],
    };
    setConversations(prev => [conv, ...prev]);
    setActiveId(id);
    return id;
  }, [initialGreeting]);

  /** Ensure there is always an active conversation. */
  useEffect(() => {
    if (!activeId || !conversations.find(c => c.id === activeId)) {
      if (conversations.length > 0) {
        setActiveId(conversations[0].id);
      } else {
        newConversation();
      }
    }
  }, [conversations, activeId, newConversation]);

  /** Switch to an existing conversation by id. */
  const switchConversation = useCallback((id) => {
    setActiveId(id);
  }, []);

  /** Append a message to the active conversation; auto-generate title from first user message. */
  const appendMessage = useCallback((msg) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeId) return conv;
      const updated = { ...conv, messages: [...conv.messages, msg] };
      // Set the conversation title to the first user message (truncated)
      if (msg.sender === 'user' && conv.title === 'New conversation') {
        updated.title = msg.text.slice(0, 48) + (msg.text.length > 48 ? '…' : '');
      }
      return updated;
    }));
  }, [activeId]);

  /** Delete a conversation by id. */
  const deleteConversation = useCallback((id) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeId]);

  /** Rename a conversation by id. */
  const renameConversation = useCallback((id, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    setConversations(prev => prev.map(conv => {
      if (conv.id !== id) return conv;
      return { ...conv, title: newTitle.trim() };
    }));
  }, []);

  /** Toggle pin status for a conversation. */
  const togglePinConversation = useCallback((id) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== id) return conv;
      return { ...conv, pinned: !conv.pinned };
    }));
  }, []);

  /** Update the text of a specific message by ID in the active conversation. */
  const updateMessageText = useCallback((msgId, textUpdater) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeId) return conv;
      return {
        ...conv,
        messages: conv.messages.map(m => {
          if (m.id !== msgId) return m;
          const newText = typeof textUpdater === 'function' ? textUpdater(m.text) : textUpdater;
          return { ...m, text: newText };
        })
      };
    }));
  }, [activeId]);

  /** Append reasoning text to a specific message by ID. */
  const updateReasoningText = useCallback((msgId, reasoningChunk) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeId) return conv;
      return {
        ...conv,
        messages: conv.messages.map(m => {
          if (m.id !== msgId) return m;
          return { ...m, reasoning: (m.reasoning || '') + reasoningChunk };
        })
      };
    }));
  }, [activeId]);

  return {
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
  };
}
