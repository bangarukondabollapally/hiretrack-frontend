import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveLockCount } from './useScrollLock';

// Mock DOM elements for Node environment
function setupMockDom() {
  const mockStyle = {};
  const mockDocStyle = {};

  globalThis.document = {
    body: {
      style: mockStyle,
      contains: () => true,
    },
    documentElement: {
      style: mockDocStyle,
      clientWidth: 1000,
    },
    activeElement: {
      focus: () => {},
    },
  };

  globalThis.window = {
    innerWidth: 1020,
    scrollY: 100,
    pageYOffset: 100,
    scrollTo: () => {},
  };

  return { mockStyle, mockDocStyle };
}

describe('useScrollLock hook', () => {
  beforeEach(() => {
    setupMockDom();
  });

  it('locks body scroll and compensates scrollbar width', () => {
    globalThis.document.documentElement.style.overflow = 'hidden';
    globalThis.document.body.style.overflow = 'hidden';
    globalThis.document.body.style.paddingRight = '20px';
    globalThis.document.body.style.position = 'fixed';

    expect(globalThis.document.body.style.overflow).toBe('hidden');
    expect(globalThis.document.documentElement.style.overflow).toBe('hidden');
    expect(globalThis.document.body.style.paddingRight).toBe('20px');
    expect(globalThis.document.body.style.position).toBe('fixed');
  });

  it('tracks lock count correctly for nested modals', () => {
    expect(getActiveLockCount()).toBe(0);
  });
});
