import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  buildActionRequest,
  formatDeadline,
  formatMissing,
  groupSkills,
  pickAssessments,
  skillSummary,
} from './guidanceLabels';
import GuidancePanel from './GuidancePanel';
import { addSkill } from '../../components/SkillTagInput';
import { buildCareerPayload, validateCareerForm } from '../../profile/CareerProfileSection';

globalThis.React = React;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const assessment = (id, overrides = {}) => ({
  opening: {
    id,
    companyName: `Company ${id}`,
    jobRole: 'Frontend Intern',
    jobType: 'Internship',
    location: 'Pune',
    workMode: 'Hybrid',
    packageDetails: null,
    deadline: null,
    availability: 'OPEN',
    tracked: false,
    applicationId: null,
    applicationLink: 'https://example.com',
    description: 'Build UI',
  },
  eligibility: {
    verdict: 'UNCONFIRMED',
    criteria: [{ key: 'cgpa', label: 'CGPA', requirement: 'at least 7', studentValue: null, status: 'UNKNOWN' }],
  },
  skills: [
    { skill: 'React', importance: 'REQUIRED', status: 'MET', evidence: 'Listed in your skills' },
    { skill: 'TypeScript', importance: 'REQUIRED', status: 'GAP', evidence: 'Not shown in your skills, projects or resume' },
    { skill: 'Jest', importance: 'PREFERRED', status: 'PARTIAL', evidence: 'Mentioned in your resume' },
  ],
  skillSource: 'STRUCTURED',
  readiness: { level: 'NEARLY_READY', reasons: ['1 of 2 key skills shown in your profile, 1 not shown.'] },
  counts: { required: 2, met: 1, partial: 0, gaps: 1, unknown: 0 },
  ...overrides,
});

const payload = (overrides = {}) => ({
  version: 1,
  intent: 'DISCOVER',
  openings: [assessment(1), assessment(2)],
  focusIds: [],
  referencedOpeningIds: [1, 2],
  learningPlan: [],
  suggestedQuestions: ['Am I ready for Company 1?'],
  profile: { missing: [] },
  notices: [],
  complete: true,
  ...overrides,
});

// renderToString separates adjacent text nodes with <!-- --> markers; strip them for text assertions.
const render = (props) =>
  renderToString(<GuidancePanel onAction={() => {}} onAsk={() => {}} onToggleCompare={() => {}} {...props} />).replace(/<!-- -->/g, '');

describe('guidance helpers', () => {
  it('builds chat requests for card actions', () => {
    const o = { id: 4, companyName: 'Acme', jobRole: 'Intern' };
    expect(buildActionRequest('readiness', o)).toEqual({ text: 'Am I ready to apply for Acme — Intern?', intent: 'READINESS', openingIds: [4] });
    expect(buildActionRequest('upskill', o).intent).toBe('UPSKILL');
    expect(buildActionRequest('compare', [o, { id: 5, companyName: 'Globex', jobRole: 'Dev' }, { id: 6, companyName: 'X', jobRole: 'Y' }, { id: 7, companyName: 'Z', jobRole: 'W' }]).openingIds).toEqual([4, 5, 6]);
    expect(buildActionRequest('unknown', o)).toBeNull();
  });

  it('summarises skills without percentages', () => {
    expect(skillSummary({ required: 4, met: 2, partial: 1, gaps: 1, unknown: 0 })).toBe('2 of 4 key skills shown · 1 mentioned · 1 not shown');
    expect(skillSummary({ required: 0 })).toBe('No required skills listed');
  });

  it('formats deadlines from date-only strings', () => {
    const today = new Date(2026, 10, 26);
    expect(formatDeadline('2026-11-26', today)).toBe('Deadline today');
    expect(formatDeadline('2026-11-27', today)).toBe('Deadline tomorrow');
    expect(formatDeadline('2026-12-01', today)).toBe('Deadline in 5 days');
    expect(formatDeadline('2026-11-20', today)).toBe('Deadline passed');
    expect(formatDeadline('2027-01-15', today)).toBe('Deadline 15 Jan');
    expect(formatDeadline(null, today)).toBeNull();
  });

  it('groups skills, picks assessments and formats missing fields', () => {
    expect(groupSkills(assessment(1).skills).map((g) => [g.label, g.items.length])).toEqual([['Required', 2], ['Preferred', 1]]);
    expect(pickAssessments(payload(), [2, 99, 1]).map((a) => a.opening.id)).toEqual([2, 1]);
    expect(formatMissing(['skills', 'CGPA', 'projects'])).toBe('skills, CGPA and projects');
    expect(formatMissing(['skills'])).toBe('skills');
  });
});

describe('GuidancePanel rendering', () => {
  it('renders opening cards for discovery with readiness and actions', () => {
    const html = render({ guidance: payload() });
    expect(html).toContain('Company 1');
    expect(html).toContain('Nearly ready');
    expect(html).toContain('1 of 2 key skills shown · 1 not shown');
    expect(html).toContain('Check readiness');
    expect(html).toContain('Compare');
    expect(html).toContain('Am I ready for Company 1?'); // follow-up chip
  });

  it('renders a readiness checklist that labels missing data as Unknown, not as failure', () => {
    const html = render({ guidance: payload({ intent: 'READINESS', focusIds: [1] }) });
    expect(html).toContain('Readiness for Company 1');
    expect(html).toContain('Eligibility unconfirmed');
    expect(html).toContain('You: not in profile');
    expect(html).toContain('Unknown');
    expect(html).toContain('is not counted against you');
    expect(html).toContain('Not shown'); // TypeScript gap
    expect(html).toContain('Also discussed'); // the other card
  });

  it('renders a comparison table for two openings', () => {
    const html = render({ guidance: payload({ intent: 'COMPARE', focusIds: [1, 2] }) });
    expect(html).toContain('Opening comparison');
    expect(html).toContain('To develop');
    expect(html.match(/<th scope="col">/g)).toHaveLength(3);
  });

  it('renders a validated learning plan', () => {
    const html = render({
      guidance: payload({
        intent: 'UPSKILL',
        focusIds: [1],
        learningPlan: [{ skill: 'TypeScript', openingIds: [1], why: 'Required by Company 1', steps: ['Read the handbook'], projectIdea: 'Typed todo app' }],
      }),
    });
    expect(html).toContain('Learning plan');
    expect(html).toContain('for Company 1');
    expect(html).toContain('Typed todo app');
  });

  it('shows notices and profile hints, and hides follow-ups while the answer is incomplete', () => {
    const html = render({
      guidance: payload({ complete: false, notices: ['Opening #9 is not available to you.'], profile: { missing: ['skills', 'CGPA', 'resume'] } }),
    });
    expect(html).toContain('Opening #9 is not available to you.');
    expect(html).toContain('Matching is more precise with your skills and CGPA');
    expect(html).not.toContain('Am I ready for Company 1?');
  });

  it('renders nothing without guidance', () => {
    expect(render({ guidance: null })).toBe('');
  });

  it('shows a one-line summary while the answer streams, instead of shifting cards', () => {
    const html = render({ guidance: payload({ complete: false }), isStreaming: true });
    expect(html).toContain('Checking 2 openings (Company 1, Company 2) against your profile…');
    expect(html).not.toContain('Check readiness');
  });

  it('shows the profile hint and follow-ups only on the latest reply', () => {
    const g = payload({ profile: { missing: ['skills'] } });
    const older = render({ guidance: g, isLatest: false });
    expect(older).not.toContain('Matching is more precise');
    expect(older).not.toContain('Am I ready for Company 1?');
    expect(render({ guidance: g, isLatest: true })).toContain('Matching is more precise with your skills');
  });

  it('hides the comparison "Unknown" row when nothing is unknown and offers a stacked mobile layout', () => {
    const html = render({ guidance: payload({ intent: 'COMPARE', focusIds: [1, 2] }) });
    expect(html).not.toContain('>Unknown<');
    expect(html).toContain('gd-compare__stack');
    const withUnknown = payload({
      intent: 'COMPARE',
      focusIds: [1, 2],
      openings: [assessment(1, { skills: [{ skill: 'Docker', importance: 'REQUIRED', status: 'UNKNOWN', evidence: '' }] }), assessment(2)],
    });
    expect(render({ guidance: withUnknown })).toContain('>Unknown<');
  });

  it('collapses an all-unknown skill list into one line per group', () => {
    const unknown = assessment(1, {
      readiness: { level: 'NEEDS_INFO', reasons: ['Add your skills.'] },
      skills: ['React', 'TypeScript', 'Jest'].map((skill, i) => ({ skill, importance: i < 2 ? 'REQUIRED' : 'PREFERRED', status: 'UNKNOWN', evidence: 'Your profile has no skills, projects or resume yet' })),
    });
    const html = render({ guidance: payload({ intent: 'READINESS', focusIds: [1], openings: [unknown] }) });
    expect(html).toContain('Needs profile details');
    expect(html).toContain('React, TypeScript');
    expect(html).toContain('so these can’t be compared');
    expect(html).not.toContain('Your profile has no skills, projects or resume yet<');
  });

  it('keeps card actions on one row with compare/details in the footer', () => {
    const html = render({ guidance: payload() });
    expect(html).toContain('gd-card__footer');
    expect(html).toContain('Details ▾');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe('profile career form helpers', () => {
  it('adds skills without duplicates or blanks', () => {
    expect(addSkill(['React'], ' react ')).toEqual(['React']);
    expect(addSkill(['React'], '  ')).toEqual(['React']);
    expect(addSkill(['React'], 'SQL')).toEqual(['React', 'SQL']);
    expect(addSkill(['a'], 'b', 1)).toEqual(['a']);
  });

  it('sends only changed fields and converts numbers', () => {
    const initial = { skills: [], degreeType: '', branch: '', yearOfStudy: '', graduationYear: '', cgpa: '', activeBacklogs: '', projects: [] };
    const form = { ...initial, skills: ['React'], cgpa: '8.5', projects: [{ title: ' App ', techStack: ['React'], description: '' }, { title: '', techStack: [], description: '' }] };
    expect(buildCareerPayload(form, initial)).toEqual({ skills: ['React'], cgpa: 8.5, projects: [{ title: 'App', techStack: ['React'], description: '' }] });
    expect(buildCareerPayload({ ...initial, cgpa: '' }, { ...initial, cgpa: '7' })).toEqual({ cgpa: null });
    expect(buildCareerPayload(initial, initial)).toEqual({});
  });

  it('validates numeric ranges and project titles', () => {
    const base = { cgpa: '', activeBacklogs: '', graduationYear: '', projects: [] };
    expect(validateCareerForm({ ...base, cgpa: '11' })).toMatch(/CGPA/);
    expect(validateCareerForm({ ...base, activeBacklogs: '1.5' })).toMatch(/backlogs/);
    expect(validateCareerForm({ ...base, graduationYear: '1999' })).toMatch(/Graduation/);
    expect(validateCareerForm({ ...base, projects: [{ title: '', description: 'x', techStack: [] }] })).toMatch(/title/);
    expect(validateCareerForm(base)).toBe('');
  });
});
