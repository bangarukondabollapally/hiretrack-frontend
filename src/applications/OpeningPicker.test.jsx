import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OpeningPicker, { fieldsFromOpening, filterOpenings } from './OpeningPicker';

globalThis.React = React;

vi.mock('react-router-dom', () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }));

const openings = [
  { id: 1, companyName: 'PixelForge', jobRole: 'Frontend Intern', jobType: 'Internship', location: 'Pune', requiredSkills: ['React'], applicationLink: 'https://p.example', description: 'UI work', deadline: '2027-01-31', isTracked: true },
  { id: 2, companyName: 'LedgerWorks', jobRole: 'Backend Intern', jobType: 'Internship', location: 'Bengaluru', requiredSkills: ['SQL'] },
];
const render = (props) =>
  renderToString(<OpeningPicker openings={openings} appliedByOpening={new Map()} onSelect={() => {}} onClear={() => {}} {...props} />).replace(/<!-- -->/g, '');

describe('OpeningPicker helpers', () => {
  it('filters by company, role, location and skills', () => {
    expect(filterOpenings(openings, 'ledger').map((o) => o.id)).toEqual([2]);
    expect(filterOpenings(openings, 'react').map((o) => o.id)).toEqual([1]);
    expect(filterOpenings(openings, 'intern')).toHaveLength(2);
    expect(filterOpenings(openings, '')).toHaveLength(2);
  });

  it('auto-fills application fields and keeps the opening link', () => {
    expect(fieldsFromOpening(openings[0])).toEqual({
      companyName: 'PixelForge',
      jobRole: 'Frontend Intern',
      jobType: 'Internship',
      jobUrl: 'https://p.example',
      jobDescription: 'UI work',
      placementOpeningId: 1,
    });
    expect(fieldsFromOpening({ id: 3, companyName: 'X', jobRole: 'Y' })).not.toHaveProperty('jobType');
  });
});

describe('OpeningPicker rendering', () => {
  it('lists openings with tracked tags and blocks ones already applied to', () => {
    const html = render({ appliedByOpening: new Map([[2, 42]]) });
    expect(html).toContain('PixelForge — Frontend Intern');
    expect(html).toContain('Tracked');
    expect(html).toContain('Already applied');
    expect(html).toContain('href="/applications/42"');
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it('shows the linked opening with a Change action once selected', () => {
    const html = render({ selected: openings[0] });
    expect(html).toContain('Linked HireTrack opening');
    expect(html).toContain('PixelForge — Frontend Intern');
    expect(html).toContain('Change');
  });

  it('handles loading, error and empty states', () => {
    expect(render({ isLoading: true })).toContain('Loading openings…');
    expect(render({ isError: true })).toContain('add an external application');
    expect(render({ openings: [] })).toContain('There are no open HireTrack openings right now.');
  });
});
