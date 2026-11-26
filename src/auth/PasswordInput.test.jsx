import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import PasswordInput from './PasswordInput';

globalThis.React = React;

describe('PasswordInput', () => {
  it('starts hidden with an accessible show toggle and passes props to the input', () => {
    const html = renderToString(<PasswordInput id="pw" name="password" className="field-input" value="secret" onChange={() => {}} />);
    expect(html).toContain('type="password"');
    expect(html).toContain('id="pw"');
    expect(html).toContain('class="field-input"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('type="button"'); // the toggle never submits the form
  });

  it('disables the toggle together with the input', () => {
    const html = renderToString(<PasswordInput id="pw" value="" onChange={() => {}} disabled />);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
