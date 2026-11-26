import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import OpeningSkillsSection, { OpeningSkillsLine, summarizeSkills } from './OpeningSkills';

globalThis.React = React;

const render = (ui) => renderToString(ui).replace(/<!-- -->/g, '');

describe('opening skills on student views', () => {
  it('summarises required skills first, then preferred, and hides when none', () => {
    expect(summarizeSkills({ requiredSkills: ['React', 'TypeScript', 'CSS', 'REST APIs'], preferredSkills: ['Jest'] })).toEqual({
      label: 'Skills:',
      text: 'React, TypeScript, CSS +1 more',
      all: 'React, TypeScript, CSS, REST APIs',
    });
    expect(summarizeSkills({ requiredSkills: [], preferredSkills: ['Figma'] })).toMatchObject({ label: 'Preferred:', text: 'Figma' });
    expect(summarizeSkills({ requiredSkills: [], preferredSkills: [] })).toBeNull();
    expect(summarizeSkills({})).toBeNull(); // older API responses without the fields
  });

  it('renders a compact card line and nothing for openings without skills', () => {
    expect(render(<OpeningSkillsLine opening={{ requiredSkills: ['SQL'] }} />)).toContain('Skills:');
    expect(render(<OpeningSkillsLine opening={{}} />)).toBe('');
  });

  it('renders required and preferred groups in the details modal', () => {
    const html = render(<OpeningSkillsSection opening={{ requiredSkills: ['React'], preferredSkills: ['Jest', 'Git'] }} />);
    expect(html).toContain('<h4>Skills</h4>');
    expect(html).toContain('aria-label="Required skills"');
    expect(html).toContain('aria-label="Preferred skills"');
    expect(html.match(/opening-skill-chip"/g)).toHaveLength(3);
    expect(render(<OpeningSkillsSection opening={{ requiredSkills: [], preferredSkills: [] }} />)).toBe('');
  });
});
