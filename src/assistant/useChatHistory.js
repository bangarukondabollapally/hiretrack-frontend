/**
 * useChatHistory — Server-persisted chat hook backed by React Query.
 *
 * Implements server sync via /api/assistant/conversations endpoints.
 * Performs one-time, idempotent migration of legacy localStorage chats.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useRenameConversationMutation,
  useDeleteConversationMutation,
  queryClient,
} from '../api/queries';
import axiosInstance from '../api/axiosInstance';

export function clearChatHistory(userId) {
  if (userId) {
    localStorage.removeItem(`hiretrack_chat_${userId}`);
  }
}

export function useChatHistory(userId, initialGreeting) {
  const navigate = useNavigate();
  const params = useParams();
  const urlConvId = params?.conversationId ? Number(params.conversationId) : null;

  const effectiveUserId = userId ? String(userId) : null;

  // React Query for server conversations
  const { data: serverConversationsData, refetch: refetchConversations } = useConversationsQuery(effectiveUserId);
  const conversations = serverConversationsData || [];

  // Active conversation state
  const [activeId, setActiveId] = useState(urlConvId);

  // Sync activeId when URL parameter changes
  useEffect(() => {
    if (urlConvId) {
      setActiveId(urlConvId);
    }
  }, [urlConvId]);

  // One-time legacy localStorage chat migration
  useEffect(() => {
    if (!effectiveUserId) return;
    const localKey = `hiretrack_chat_${effectiveUserId}`;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
          const localConvs = parsed.conversations.slice(0, 5);
          Promise.all(
            localConvs.map(async (lc) => {
              try {
                const res = await axiosInstance.post('/api/assistant/conversations', { title: lc.title || 'Imported chat' });
                const convId = res.data.id;
                if (Array.isArray(lc.messages)) {
                  for (const m of lc.messages) {
                    if (m.text && m.text !== initialGreeting) {
                      await axiosInstance.post('/api/assistant/chat', {
                        conversationId: convId,
                        message: m.text,
                      }).catch(() => {});
                    }
                  }
                }
              } catch (e) {
                console.warn('Failed to import local chat:', e);
              }
            })
          ).finally(() => {
            localStorage.removeItem(localKey);
            queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations', effectiveUserId] });
          });
        } else {
          localStorage.removeItem(localKey);
        }
      }
    } catch {
      localStorage.removeItem(localKey);
    }
  }, [effectiveUserId, initialGreeting]);

  // React Query for active conversation messages
  const { data: serverMessagesData } = useConversationMessagesQuery(effectiveUserId, activeId);

  // Local optimistic message buffer during streaming
  const [localStreamMessages, setLocalStreamMessages] = useState(null);

  // Map server messages to UI format
  const serverMessages = (serverMessagesData || []).map((m) => ({
    id: String(m.id),
    sender: m.role ? m.role.toLowerCase() : 'user',
    text: m.content || '',
    createdAt: m.createdAt,
  }));

  const messages = localStreamMessages !== null ? localStreamMessages : serverMessages;

  const renameMutation = useRenameConversationMutation(effectiveUserId);
  const deleteMutation = useDeleteConversationMutation(effectiveUserId);

  const switchConversation = useCallback(
    (id) => {
      setActiveId(id);
      setLocalStreamMessages(null);
      if (id) {
        navigate(`/assistant/${id}`);
      } else {
        navigate('/assistant');
      }
    },
    [navigate]
  );

  const newConversation = useCallback(() => {
    setActiveId(null);
    setLocalStreamMessages(null);
    navigate('/assistant');
  }, [navigate]);

  const appendMessage = useCallback(
    (msg) => {
      setLocalStreamMessages((prev) => {
        const base = prev !== null ? prev : serverMessages;
        return [...base, msg];
      });
    },
    [serverMessages]
  );

  const updateMessageText = useCallback((msgId, textUpdater) => {
    setLocalStreamMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) => {
        if (m.id !== msgId) return m;
        const newText = typeof textUpdater === 'function' ? textUpdater(m.text) : textUpdater;
        return { ...m, text: newText };
      });
    });
  }, []);

  const updateReasoningText = useCallback((msgId, reasoningChunk) => {
    setLocalStreamMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) => {
        if (m.id !== msgId) return m;
        return { ...m, reasoning: (m.reasoning || '') + reasoningChunk };
      });
    });
  }, []);

  const renameConversation = useCallback(
    (id, newTitle) => {
      if (!newTitle || !newTitle.trim()) return;
      renameMutation.mutate({ id, title: newTitle.trim() });
    },
    [renameMutation]
  );

  const deleteConversation = useCallback(
    (id) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (activeId === id) {
            setActiveId(null);
            setLocalStreamMessages(null);
            navigate('/assistant');
          }
        },
      });
    },
    [deleteMutation, activeId, navigate]
  );

  const togglePinConversation = useCallback((_id) => {
    // Pin toggle placeholder if needed
  }, []);

  const clearLocalStream = useCallback(() => {
    setLocalStreamMessages(null);
  }, []);

  return {
    conversations,
    activeId,
    setActiveId,
    messages,
    newConversation,
    switchConversation,
    appendMessage,
    updateMessageText,
    updateReasoningText,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    clearLocalStream,
    refetchConversations,
  };
}
