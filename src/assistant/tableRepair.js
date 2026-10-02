/**
 * repairMarkdownTables — Pre-render sanitizer for malformed LLM Markdown tables.
 *
 * Fixes common GFM table formatting issues:
 * 1. Collapses double pipes (|| -> |).
 * 2. Pads/trims separator rows to match header cell count.
 * 3. Ensures a blank line precedes table blocks.
 * 4. Preserves pipe lines with soft line breaks if parsing fails.
 */
export function repairMarkdownTables(text) {
  if (!text || typeof text !== 'string') return text || '';

  const lines = text.split('\n');
  const result = [];
  let inTable = false;
  let tableHeaderCellCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    const isPipeLine = trimmed.startsWith('|') || (trimmed.endsWith('|') && trimmed.includes('|'));

    if (isPipeLine) {
      // 1. Collapse double pipes
      line = line.replace(/\|\|+/g, '|');

      if (!inTable) {
        inTable = true;
        // 2. Ensure blank line before table if previous line isn't blank
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
        // Count header cells
        const parts = line.split('|');
        // Filter out empty ends from leading/trailing pipes
        const cells = parts.slice(1, parts.endsWith && parts.endsWith('|') ? -1 : parts.length);
        tableHeaderCellCount = Math.max(cells.length, 1);
      } else if (result.length > 0 && line.includes('-')) {
        // Check if this is a separator row
        const parts = line.split('|').filter(p => p.trim() !== '');
        const isSeparator = parts.every(p => /^:?-+:?$/.test(p.trim()));

        if (isSeparator) {
          let sepCells = line.split('|').slice(1, -1);
          if (sepCells.length === 0) {
            sepCells = line.split('|').filter(p => p.trim() !== '');
          }

          while (sepCells.length < tableHeaderCellCount) {
            sepCells.push('---');
          }
          if (sepCells.length > tableHeaderCellCount) {
            sepCells = sepCells.slice(0, tableHeaderCellCount);
          }
          line = '| ' + sepCells.map(c => (c.trim() || '---')).join(' | ') + ' |';
        }
      }
      result.push(line);
    } else {
      inTable = false;
      result.push(line);
    }
  }

  return result.join('\n');
}
