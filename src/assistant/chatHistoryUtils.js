/**
 * chatHistoryUtils.js
 *
 * Utility functions for date-bucketed chat history grouping and timestamp sanitization
 * per DESIGN.md §35.
 */

export function groupConversationsByDate(conversations = [], searchQuery = '') {
  const query = searchQuery.toLowerCase().trim();
  const filtered = conversations.filter(conv => {
    if (!query) return true;
    return conv.title && conv.title.toLowerCase().includes(query);
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgoStart = todayStart - (6 * 86400000);

  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    Older: [],
  };

  filtered.forEach(conv => {
    let timestamp = null;
    if (conv.createdAt) {
      const parsed = new Date(conv.createdAt).getTime();
      if (!isNaN(parsed)) {
        timestamp = parsed;
      }
    }

    if (timestamp === null) {
      groups.Older.push(conv);
    } else if (timestamp >= todayStart) {
      groups.Today.push(conv);
    } else if (timestamp >= yesterdayStart) {
      groups.Yesterday.push(conv);
    } else if (timestamp >= sevenDaysAgoStart) {
      groups['Previous 7 days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  });

  return groups;
}

export function sanitizeConversation(conv) {
  if (!conv.createdAt || isNaN(new Date(conv.createdAt).getTime())) {
    return {
      ...conv,
      createdAt: new Date(0).toISOString(),
    };
  }
  return conv;
}
