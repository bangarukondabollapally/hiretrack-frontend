/**
 * repairMarkdownTables — Pure, idempotent pre-render sanitizer for LLM Markdown tables.
 *
 * Fixes:
 * 1. Skips fenced code blocks.
 * 2. Normalizes separator cell counts to match header cell count.
 * 3. Preserves column alignment colons (`:---`, `:---:`, `---:`).
 * 4. Ensures blank lines before and after table blocks.
 * 5. Replaces `<br>`, `<br/>`, `<br />` inside table rows with `__TABLE_BR_MARKER__`.
 * 6. Ensures each table row starts on its own line and collapses double pipes (`||`).
 * 7. Is Idempotent: repair(repair(x)) === repair(x).
 */

export const TABLE_BR_MARKER = '__TABLE_BR_MARKER__';

function getCellCount(line) {
  if (!line || !line.includes('|')) return 0;
  const raw = line.trim();
  const stripped = raw.startsWith('|') ? raw.substring(1) : raw;
  const cleaned = stripped.endsWith('|') ? stripped.substring(0, stripped.length - 1) : stripped;
  const parts = cleaned.split('|');
  return parts.length;
}

function parseSeparatorCells(sepLine) {
  const raw = sepLine.trim();
  const stripped = raw.startsWith('|') ? raw.substring(1) : raw;
  const cleaned = stripped.endsWith('|') ? stripped.substring(0, stripped.length - 1) : stripped;
  return cleaned.split('|').map(s => s.trim());
}

function isSeparatorRow(line) {
  if (!line || !line.includes('|')) return false;
  const cells = parseSeparatorCells(line);
  if (cells.length === 0) return false;
  return cells.every(c => /^:?-+:?$/.test(c));
}

export function repairMarkdownTables(text) {
  if (!text || typeof text !== 'string') return text || '';

  // Step 0: Standardize carriage returns
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const output = [];
  let inCodeBlock = false;
  let codeFence = '';

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check code fence (``` or ~~~)
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeFence = fenceMatch[1];
      } else if (trimmed.startsWith(codeFence)) {
        inCodeBlock = false;
        codeFence = '';
      }
      output.push(line);
      i++;
      continue;
    }

    if (inCodeBlock) {
      output.push(line);
      i++;
      continue;
    }

    // Check if line looks like a potential table header line
    const isPipeLine = trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.endsWith('|') || trimmed.split('|').length >= 3);

    // Look ahead to check if next line is a separator row
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const hasSeparatorNext = isSeparatorRow(nextLine);

    if (isPipeLine && hasSeparatorNext) {
      // Found a table block starting at line i (header) and line i+1 (separator)
      const headerLine = line;
      const headerCellsCount = getCellCount(headerLine);

      // Ensure blank line before table if previous line isn't blank
      if (output.length > 0 && output[output.length - 1].trim() !== '') {
        output.push('');
      }

      // 1. Process Header row
      let processedHeader = headerLine.replace(/<br\s*\/?>/gi, TABLE_BR_MARKER);
      let headerTrimmed = processedHeader.trim();
      if (!headerTrimmed.startsWith('|')) headerTrimmed = '| ' + headerTrimmed;
      if (!headerTrimmed.endsWith('|')) headerTrimmed = headerTrimmed + ' |';

      output.push(headerTrimmed);

      // 2. Process Separator row
      const sepLine = lines[i + 1];
      let sepCells = parseSeparatorCells(sepLine);

      // Adjust cell count to match headerCellsCount
      if (sepCells.length < headerCellsCount) {
        while (sepCells.length < headerCellsCount) {
          sepCells.push('---');
        }
      } else if (sepCells.length > headerCellsCount) {
        sepCells = sepCells.slice(0, headerCellsCount);
      }

      // Rebuild separator cells, preserving alignment colons if present
      const rebuiltSepCells = sepCells.map(c => {
        const t = c.trim();
        if (/^:?-+:?$/.test(t)) {
          return t;
        }
        return '---';
      });

      const rebuiltSepLine = '| ' + rebuiltSepCells.join(' | ') + ' |';
      output.push(rebuiltSepLine);

      i += 2; // Advance past header and separator

      // 3. Process Data rows until non-table line or end
      while (i < lines.length) {
        const dataLine = lines[i];
        const dataTrimmed = dataLine.trim();

        // Stop if blank line or line without pipe
        if (!dataTrimmed || (!dataTrimmed.includes('|') && !dataTrimmed.startsWith('|'))) {
          break;
        }

        let rowLine = dataLine;
        // Convert <br> tags in table rows
        rowLine = rowLine.replace(/<br\s*\/?>/gi, TABLE_BR_MARKER);

        // Fix inline row separators if model output merged rows with `||`
        if (rowLine.includes('||')) {
          rowLine = rowLine.replace(/\|\|+/g, '|\n|');
        }

        const subRows = rowLine.split('\n');
        for (let sub of subRows) {
          let sTrim = sub.trim();
          if (!sTrim) continue;
          if (!sTrim.startsWith('|')) sTrim = '| ' + sTrim;
          if (!sTrim.endsWith('|')) sTrim = sTrim + ' |';
          output.push(sTrim);
        }

        i++;
      }

      // Ensure blank line after table block if not at end
      if (i < lines.length && lines[i].trim() !== '') {
        output.push('');
      }

      continue;
    }

    // Mid-stream partial table check: header line without separator yet at the end of text
    if (isPipeLine && i === lines.length - 1) {
      let partialLine = line.replace(/<br\s*\/?>/gi, TABLE_BR_MARKER);
      output.push(partialLine);
      i++;
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join('\n');
}
