import { useState } from 'react';
import { createPortal } from 'react-dom';
import { groupConversationsByDate } from './chatHistoryUtils';
import './ChatHistoryList.css';

export default function ChatHistoryList({
  conversations = [],
  activeId = null,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onTogglePinConversation,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenConvId, setMenuOpenConvId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const grouped = groupConversationsByDate(conversations, searchQuery);
  const groupKeys = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
  const hasAnyConversations = conversations.length > 0;

  const handleOpenMenu = (e, convId) => {
    e.stopPropagation();
    if (menuOpenConvId === convId) {
      setMenuOpenConvId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: Math.min(window.innerHeight - 120, rect.bottom + 4),
      left: Math.max(10, Math.min(window.innerWidth - 150, rect.left - 100)),
    });
    setMenuOpenConvId(convId);
  };

  const handleStartRename = (conv) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || '');
    setMenuOpenConvId(null);
  };

  const handleSaveRename = (convId) => {
    if (editingTitle.trim()) {
      onRenameConversation?.(convId, editingTitle.trim());
    }
    setEditingConvId(null);
  };

  return (
    <div className="chat-history-component">
      {/* Top Header Controls: Search + New Chat */}
      <div className="chat-history-top">
        <div className="chat-history-search-row">
          <svg className="chat-history-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            className="chat-history-search-input"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search conversation history"
          />
        </div>
        <button
          type="button"
          className="chat-history-new-btn"
          onClick={() => {
            onNewChat?.();
          }}
          title="Start new chat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New chat</span>
        </button>
      </div>

      {/* Date Grouped Conversations List */}
      <div className="chat-history-list">
        {!hasAnyConversations ? (
          <div className="chat-history-empty">No recent chats</div>
        ) : (
          groupKeys.map(key => {
            const items = grouped[key] || [];
            if (items.length === 0) return null;
            return (
              <div key={key} className="chat-history-group">
                <div className="chat-history-group-header">{key}</div>
                <div className="chat-history-group-items">
                  {items.map(conv => {
                    const isActive = conv.id === activeId;
                    const isEditing = conv.id === editingConvId;

                    return (
                      <div
                        key={conv.id}
                        className={`conv-item ${isActive ? 'conv-item--active' : ''}`}
                        onClick={() => {
                          if (!isEditing) {
                            onSelectConversation?.(conv.id);
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            className="conv-rename-input"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveRename(conv.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingConvId(null);
                              }
                            }}
                            onBlur={() => handleSaveRename(conv.id)}
                            onFocus={(e) => e.target.select()}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <div className="conv-item-left">
                              {conv.pinned && (
                                <span className="conv-pin-badge" title="Pinned">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--asst-accent, #2A5C4B)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="17" x2="12" y2="22"></line>
                                    <path d="M5 17h14l-1.5-6h-11L5 17z"></path>
                                    <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"></path>
                                  </svg>
                                </span>
                              )}
                              <span className="conv-item-title" title={conv.title}>{conv.title}</span>
                            </div>

                            <div className="conv-item-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="icon-btn-subtle conv-menu-trigger"
                                title="More options"
                                onClick={(e) => handleOpenMenu(e, conv.id)}
                                aria-label="More options"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2.2" />
                                  <circle cx="12" cy="12" r="2.2" />
                                  <circle cx="12" cy="19" r="2.2" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating 3-dots Menu Portal */}
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
              onTogglePinConversation?.(menuOpenConvId);
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
            <span>{conversations.find(c => c.id === menuOpenConvId)?.pinned ? 'Unpin' : 'Pin'}</span>
          </button>
          <button
            type="button"
            className="conv-popover-item"
            onClick={() => {
              const conv = conversations.find(c => c.id === menuOpenConvId);
              if (conv) {
                handleStartRename(conv);
              }
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
              onDeleteConversation?.(menuOpenConvId);
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
}
