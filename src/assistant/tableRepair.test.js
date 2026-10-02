import { describe, it, expect } from 'vitest';
import { repairMarkdownTables } from './tableRepair';

describe('repairMarkdownTables', () => {
  it('repairs sample malformed GFM table with mismatched separator cells and double pipes', () => {
    const input = [
      'Here is the interview table:',
      '| Header 1 | Header 2 | Header 3 | Header 4 |',
      '|------|--------------------||-----|',
      '| Row 1 | Row 2 | Row 3 | Row 4 |'
    ].join('\n');

    const output = repairMarkdownTables(input);

    expect(output).toContain('\n\n| Header 1 | Header 2 | Header 3 | Header 4 |');
    // Separator row should have 4 cells and no double pipes
    expect(output).not.toContain('||');
    expect(output).toContain('| ------ | -------------------- | ----- | --- |');
  });

  it('inserts blank line before table if missing', () => {
    const input = 'Preceding text\n| H1 | H2 |\n| --- | --- |\n| D1 | D2 |';
    const output = repairMarkdownTables(input);
    expect(output).toBe('Preceding text\n\n| H1 | H2 |\n| --- | --- |\n| D1 | D2 |');
  });
});
