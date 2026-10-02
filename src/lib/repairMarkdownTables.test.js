import { describe, it, expect } from 'vitest';
import { repairMarkdownTables, TABLE_BR_MARKER } from './repairMarkdownTables';

describe('repairMarkdownTables', () => {
  it('repairs Fixture A (header 2 cells, separator 3 cells)', () => {
    const fixtureA = `| Day | Activity |
| ----- | ---------- | --- |
| **Day 1** | Finalize 2-3 portfolio case studies; create a 5-minute slide deck for each. |
| **Day 2** | Conduct a mock portfolio walkthrough with a friend or mentor; record and review. |`;

    const repaired = repairMarkdownTables(fixtureA);
    const lines = repaired.split('\n').filter(l => l.trim().length > 0);

    // Separator line should be trimmed to 2 cells matching header cell count
    expect(lines[1]).toBe('| ----- | ---------- |');
    expect(lines[0].split('|').filter(c => c.trim().length > 0)).toHaveLength(2);
    expect(lines[1].split('|').filter(c => c.trim().length > 0)).toHaveLength(2);
  });

  it('repairs Fixture B (header 3 cells, separator 4 cells, and converts <br> to marker)', () => {
    const fixtureB = `| Stage | What to expect | Prep actions |
| ------- | ---------------- | -------------- | --- |
| **Portfolio walkthrough** (30-45 min) | You will present 2-3 case studies. | - Prepare a 5-minute narrative per case.<br>- Highlight collaboration and metrics. |`;

    const repaired = repairMarkdownTables(fixtureB);
    const lines = repaired.split('\n').filter(l => l.trim().length > 0);

    expect(lines[1]).toBe('| ------- | ---------------- | -------------- |');
    expect(lines[2]).toContain(TABLE_BR_MARKER);
    expect(lines[2]).not.toContain('<br>');
  });

  it('leaves a valid table unchanged except formatting alignment', () => {
    const validTable = `| Name | Role |
| --- | --- |
| Alice | Developer |`;

    const repaired = repairMarkdownTables(validTable);
    expect(repaired).toContain('| Name | Role |');
    expect(repaired).toContain('| --- | --- |');
  });

  it('leaves table blocks inside fenced code blocks untouched', () => {
    const codeBlock = `\`\`\`
| Day | Activity |
| ----- | ---------- | --- |
| **Day 1** | Test |
\`\`\``;

    const repaired = repairMarkdownTables(codeBlock);
    expect(repaired).toBe(codeBlock);
  });

  it('handles partial tables mid-stream gracefully', () => {
    const headerOnly = `| Day | Activity |`;
    const repairedHeader = repairMarkdownTables(headerOnly);
    expect(repairedHeader).toBe(headerOnly);

    const headerAndSep = `| Day | Activity |
| --- | --- |`;
    const repairedHeadSep = repairMarkdownTables(headerAndSep);
    expect(repairedHeadSep).toContain('| Day | Activity |');
    expect(repairedHeadSep).toContain('| --- | --- |');
  });

  it('is idempotent: repair(repair(x)) equals repair(x)', () => {
    const fixtureA = `| Day | Activity |
| ----- | ---------- | --- |
| **Day 1** | Finalize 2-3 portfolio case studies |`;

    const fixtureB = `| Stage | What to expect | Prep actions |
| ------- | ---------------- | -------------- | --- |
| Walkthrough | Present 2-3 cases | Prep 5-min narrative<br>- Highlight metrics |`;

    const repA1 = repairMarkdownTables(fixtureA);
    const repA2 = repairMarkdownTables(repA1);
    expect(repA2).toBe(repA1);

    const repB1 = repairMarkdownTables(fixtureB);
    const repB2 = repairMarkdownTables(repB1);
    expect(repB2).toBe(repB1);
  });
});
