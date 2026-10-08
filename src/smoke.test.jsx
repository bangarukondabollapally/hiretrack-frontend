import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

globalThis.React = React;

// Mock router hooks
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children }) => children,
  NavLink: ({ children }) => children,
  Navigate: () => null,
  Outlet: () => null,
}));

// Mock API queries module
vi.mock('./api/queries', () => ({
  useOpeningsQuery: () => ({
    data: [
      {
        id: 1,
        companyName: 'Acme Corp',
        jobRole: 'Software Engineer',
        status: 'OPEN',
        deadline: '2026-12-31',
        packageDetails: '12 LPA',
        location: 'Remote',
      },
    ],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAdminOpeningsQuery: () => ({
    data: [
      {
        id: 1,
        companyName: 'Acme Corp',
        jobRole: 'Software Engineer',
        status: 'OPEN',
        deadline: '2026-12-31',
        packageDetails: '12 LPA',
        location: 'Remote',
      },
    ],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInterviewsQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useApplicationsQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProfileQuery: () => ({
    data: { avatarPreset: 'preset-1', avatarDataUrl: null },
    isLoading: false,
  }),
  prefetchUserData: vi.fn(),
  prefetchRouteData: vi.fn(),
  invalidateOpeningQueries: vi.fn(),
  invalidateInterviewQueries: vi.fn(),
  invalidateApplicationQueries: vi.fn(),
}));

vi.mock('./assistant/useChatHistory', () => ({
  useChatHistory: () => ({
    conversations: [{ id: 1, title: 'Chat 1' }],
    activeId: 1,
    messages: [],
    switchConversation: vi.fn(),
    newConversation: vi.fn(),
    renameConversation: vi.fn(),
    deleteConversation: vi.fn(),
    togglePinConversation: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => children,
  m: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  modalBackdropVariants: {},
  modalCardVariants: {},
  listItemVariants: {},
}));

// Import AuthContext & components to test
import { AuthContext } from './auth/AuthContext';
import Layout from './components/Layout';
import OpeningsPage from './openings/OpeningsPage';
import AdminOpeningsPage from './admin/AdminOpeningsPage';
import AdminManageOpeningsPage from './admin/AdminManageOpeningsPage';
import InterviewsPage from './interviews/InterviewsPage';
import DatePickerPopover from './components/DatePickerPopover';
import DeleteConfirmModal from './applications/DeleteConfirmModal';
import StudentOpeningCard from './openings/StudentOpeningCard';

const mockAuthValue = {
  user: { userId: 1, id: 1, email: 'student@example.com', role: 'STUDENT' },
  token: 'mock-token',
  logout: vi.fn(),
  login: vi.fn(),
};

const mockAdminAuthValue = {
  user: { userId: 2, id: 2, email: 'admin@example.com', role: 'ADMIN' },
  token: 'mock-admin-token',
  logout: vi.fn(),
  login: vi.fn(),
};

function renderWithProviders(ui, authVal = mockAuthValue) {
  return renderToString(
    <AuthContext.Provider value={authVal}>
      {ui}
    </AuthContext.Provider>
  );
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

describe('Component Smoke Tests - Missing Import Guard', () => {
  it('renders Layout for STUDENT user (expanded) without throwing', () => {
    localStorage.setItem('ht_sidebar_collapsed', 'false');
    expect(() => {
      renderWithProviders(<Layout />);
    }).not.toThrow();
  });

  it('renders Layout for STUDENT user (collapsed) without throwing', () => {
    localStorage.setItem('ht_sidebar_collapsed', 'true');
    expect(() => {
      renderWithProviders(<Layout />);
    }).not.toThrow();
  });

  it('renders Layout for ADMIN user without throwing', () => {
    expect(() => {
      renderWithProviders(<Layout />, mockAdminAuthValue);
    }).not.toThrow();
  });

  it('renders OpeningsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<OpeningsPage />);
    }).not.toThrow();
  });

  it('renders AdminOpeningsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<AdminOpeningsPage />, mockAdminAuthValue);
    }).not.toThrow();
  });

  it('renders AdminManageOpeningsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<AdminManageOpeningsPage />, mockAdminAuthValue);
    }).not.toThrow();
  });

  it('renders InterviewsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<InterviewsPage />);
    }).not.toThrow();
  });

  it('renders DatePickerPopover without throwing', () => {
    expect(() => {
      renderWithProviders(<DatePickerPopover value="2026-10-06" onChange={() => {}} />);
    }).not.toThrow();
  });

  it('renders DeleteConfirmModal when open without throwing', () => {
    expect(() => {
      renderWithProviders(
        <DeleteConfirmModal
          isOpen={true}
          title="Confirm Delete"
          message="Are you sure?"
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    }).not.toThrow();
  });

  it('renders StudentOpeningCard with bookmark toggle aria attributes', () => {
    const opening = {
      id: 101,
      companyName: 'Test Tech Corp',
      jobRole: 'Frontend Developer',
      jobType: 'Full-time',
      workMode: 'Remote',
      location: 'Hyderabad',
      status: 'OPEN',
      deadline: '2026-12-31',
      isTracked: true,
      minCgpa: 0,
    };
    const html = renderToString(
      <StudentOpeningCard
        op={opening}
        onViewDetails={() => {}}
        onToggleTrack={() => {}}
      />
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Remove from saved');
    expect(html).not.toContain('Min CGPA: 0');

  });
});

