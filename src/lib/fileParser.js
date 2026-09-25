import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker using unpkg CDN matching pdfjsLib version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extract plain text from uploaded PDF, TXT, or DOC file.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'pdf') {
    return extractTextFromPdf(file);
  } else if (['txt', 'md', 'json', 'csv'].includes(extension)) {
    return extractTextFromTextFile(file);
  } else {
    // Fallback for doc/docx or raw text binary extraction
    return extractTextFromBinaryFile(file);
  }
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

function extractTextFromTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read text file.'));
    reader.readAsText(file);
  });
}

async function extractTextFromBinaryFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
  const rawText = decoder.decode(arrayBuffer);
  // Strip non-printable ASCII/Unicode control characters
  const cleanText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
                           .replace(/\s+/g, ' ');
  return cleanText.trim();
}
