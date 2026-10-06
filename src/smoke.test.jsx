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
  invalidateOpeningQueries: vi.fn(),
  invalidateInterviewQueries: vi.fn(),
  invalidateApplicationQueries: vi.fn(),
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
import OpeningsPage from './openings/OpeningsPage';
import AdminOpeningsPage from './admin/AdminOpeningsPage';
import InterviewsPage from './interviews/InterviewsPage';
import DatePickerPopover from './components/DatePickerPopover';
import DeleteConfirmModal from './applications/DeleteConfirmModal';

const mockAuthValue = {
  user: { userId: 1, id: 1, email: 'test@example.com', role: 'ADMIN' },
  token: 'mock-token',
  logout: vi.fn(),
  login: vi.fn(),
};

function renderWithProviders(ui) {
  return renderToString(
    <AuthContext.Provider value={mockAuthValue}>
      {ui}
    </AuthContext.Provider>
  );
}

describe('Component Smoke Tests - Missing Import Guard', () => {
  it('renders OpeningsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<OpeningsPage />);
    }).not.toThrow();
  });

  it('renders AdminOpeningsPage without throwing', () => {
    expect(() => {
      renderWithProviders(<AdminOpeningsPage />);
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
});
