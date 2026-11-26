import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

globalThis.React = React;

const outlet = { current: {} };
const profile = { current: {} };

vi.mock('react-router-dom', () => ({
  useOutletContext: () => outlet.current,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams('tab=job-search'), vi.fn()],
  Navigate: () => null,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('../api/queries', () => ({
  useApplicationsQuery: () => ({ data: [] }),
  useProfileQuery: () => ({ data: profile.current, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() }),
  useConversationsQuery: () => ({ data: [] }),
  useConversationMessagesQuery: () => ({ data: [] }),
  useRenameConversationMutation: () => ({ mutate: vi.fn() }),
  useDeleteConversationMutation: () => ({ mutate: vi.fn() }),
  invalidateProfileQueries: vi.fn(),
  clearAllQueryCache: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const passthrough = (Tag) => ({ children, variants: _v, initial: _i, animate: _a, exit: _e, transition: _t, whileTap: _w, ...props }) => <Tag {...props}>{children}</Tag>;
  return {
    AnimatePresence: ({ children }) => children,
    m: { div: passthrough('div'), button: passthrough('button'), span: passthrough('span') },
    motion: { div: passthrough('div') },
  };
});

import { AuthContext } from '../auth/AuthContext';
import ChatPage from './ChatPage';

const auth = { user: { userId: 1, email: 'student@example.com', role: 'USER' }, token: 't', logout: vi.fn(), login: vi.fn() };

const guidance = {
  version: 1,
  intent: 'DISCOVER',
  openings: [
    {
      opening: { id: 7, companyName: 'PixelForge', jobRole: 'Frontend Intern', jobType: 'Internship', location: null, workMode: null, packageDetails: null, deadline: null, availability: 'OPEN', tracked: true, applicationId: null, applicationLink: 'https://x', description: null },
      eligibility: { verdict: 'ELIGIBLE', criteria: [] },
      skills: [{ skill: 'React', importance: 'REQUIRED', status: 'MET', evidence: 'Listed in your skills' }],
      skillSource: 'STRUCTURED',
      readiness: { level: 'READY', reasons: ['1 of 1 key skills shown in your profile.'] },
      counts: { required: 1, met: 1, partial: 0, gaps: 0, unknown: 0 },
    },
  ],
  focusIds: [],
  referencedOpeningIds: [7],
  learningPlan: [],
  suggestedQuestions: ['Am I ready for PixelForge?'],
  profile: { missing: [] },
  notices: [],
  complete: true,
};

const baseHistory = {
  conversations: [],
  activeId: 1,
  newConversation: vi.fn(),
  appendMessage: vi.fn(),
  updateMessageText: vi.fn(),
  updateReasoningText: vi.fn(),
  updateMessageGuidance: vi.fn(),
  removeMessage: vi.fn(),
  switchConversation: vi.fn(),
};

const render = (ui) =>
  renderToString(<AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>).replace(/<!-- -->/g, '');

describe('ChatPage with career guidance', () => {
  it('renders saved guidance cards under the assistant reply', () => {
    outlet.current = {
      ...baseHistory,
      messages: [
        { id: '1', sender: 'user', text: 'Which openings suit me?' },
        { id: '2', sender: 'assistant', text: 'PixelForge fits well.', guidance },
      ],
    };
    profile.current = { skills: ['React'], degreeType: 'BCA', yearOfStudy: '3rd Year', cgpa: 8 };
    const html = render(<ChatPage />);
    expect(html).toContain('PixelForge fits well.');
    expect(html).toContain('Ready to apply');
    expect(html).toContain('Check readiness');
    expect(html).toContain('Am I ready for PixelForge?');
  });

  it('shows career prompts and a non-blocking profile hint in the empty state', () => {
    outlet.current = { ...baseHistory, activeId: null, messages: [] };
    profile.current = { skills: [], degreeType: null, yearOfStudy: null, cgpa: null };
    const html = render(<ChatPage />);
    expect(html).toContain('Which openings suit my profile?');
    expect(html).toContain('Add your skills, degree, year of study and CGPA');
    expect(html).toContain('The assistant works without them.');
  });
});

describe('ProfilePage career section', () => {
  it('renders skills, education and projects fields on the Job search tab', async () => {
    // Imported here: ProfilePage builds JSX at module load, which needs globalThis.React (set above).
    const { default: ProfilePage } = await import('../profile/ProfilePage');
    profile.current = { name: 'Riya', skills: ['React'], projects: [{ title: 'Portfolio', techStack: ['CSS'], description: '' }], degreeType: 'BCA', cgpa: 8.1 };
    const html = render(<ProfilePage />);
    expect(html).toContain('Skills, education &amp; projects');
    expect(html).toContain('React');
    expect(html).toContain('Portfolio');
    expect(html).toContain('Active backlogs');
  });
});
