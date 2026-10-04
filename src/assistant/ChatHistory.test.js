import { describe, it, expect } from 'vitest';
import { groupConversationsByDate, sanitizeConversation } from './chatHistoryUtils';

describe('chatHistoryUtils', () => {
  it('groups conversations correctly into Today, Yesterday, Previous 7 days, and Older', () => {
    const now = new Date();
    const todayISO = now.toISOString();

    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayISO = yesterday.toISOString();

    const fourDaysAgo = new Date(now.getTime() - 4 * 86400000);
    const fourDaysAgoISO = fourDaysAgo.toISOString();

    const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);
    const twentyDaysAgoISO = twentyDaysAgo.toISOString();

    const conversations = [
      { id: '1', title: 'Today Chat', createdAt: todayISO },
      { id: '2', title: 'Yesterday Chat', createdAt: yesterdayISO },
      { id: '3', title: 'Week Chat', createdAt: fourDaysAgoISO },
      { id: '4', title: 'Older Chat', createdAt: twentyDaysAgoISO },
      { id: '5', title: 'Legacy Chat without timestamp' },
    ];

    const grouped = groupConversationsByDate(conversations);

    expect(grouped.Today).toHaveLength(1);
    expect(grouped.Today[0].title).toBe('Today Chat');

    expect(grouped.Yesterday).toHaveLength(1);
    expect(grouped.Yesterday[0].title).toBe('Yesterday Chat');

    expect(grouped['Previous 7 days']).toHaveLength(1);
    expect(grouped['Previous 7 days'][0].title).toBe('Week Chat');

    expect(grouped.Older).toHaveLength(2);
    expect(grouped.Older.map(c => c.title)).toContain('Older Chat');
    expect(grouped.Older.map(c => c.title)).toContain('Legacy Chat without timestamp');
  });

  it('filters conversations by search query case-insensitively', () => {
    const now = new Date().toISOString();
    const conversations = [
      { id: '1', title: 'Resume Review', createdAt: now },
      { id: '2', title: 'Mock Interview Prep', createdAt: now },
    ];

    const filtered = groupConversationsByDate(conversations, 'interview');
    expect(filtered.Today).toHaveLength(1);
    expect(filtered.Today[0].title).toBe('Mock Interview Prep');
  });

  it('sanitizes legacy conversations missing createdAt with backward-compatible timestamp', () => {
    const legacy = { id: 'legacy_1', title: 'Old chat' };
    const sanitized = sanitizeConversation(legacy);

    expect(sanitized.createdAt).toBeDefined();
    expect(new Date(sanitized.createdAt).getTime()).toBe(0);

    const valid = { id: 'valid_1', title: 'Valid', createdAt: '2026-05-10T10:00:00.000Z' };
    expect(sanitizeConversation(valid).createdAt).toBe('2026-05-10T10:00:00.000Z');
  });
});
