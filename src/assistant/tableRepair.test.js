import { describe, it, expect } from 'vitest';
import { repairMarkdownTables } from '../lib/repairMarkdownTables';

describe('tableRepair re-export', () => {
  it('re-exports repairMarkdownTables correctly', () => {
    const input = `| Header 1 | Header 2 |\n|---|---|---|\n| Cell 1 | Cell 2 |`;
    const output = repairMarkdownTables(input);
    expect(output).toContain('| --- | --- |');
  });
});
