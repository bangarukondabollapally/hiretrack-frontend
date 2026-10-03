import { extractTextFromFile } from '../lib/fileParser';

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function downscaleImage(file, maxDimension = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64Data = dataUrl.split(',')[1] || '';

      resolve({
        dataUrl,
        base64Data,
        mimeType,
        width,
        height,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for processing.'));
    };
    img.src = url;
  });
}

export function createTinyThumbnail(file, maxDimension = 48) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export async function processSingleFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension);

  if (isImage) {
    if (file.type === 'image/svg+xml' || extension === 'svg') {
      throw new Error('SVG and vector graphics are not supported.');
    }
    const [scaled, thumbnail] = await Promise.all([
      downscaleImage(file),
      createTinyThumbnail(file),
    ]);

    // Check size limit ~4MB (approx 5.5MB base64 string length)
    if (scaled.base64Data.length > 5_500_000) {
      throw new Error('Image exceeds maximum allowed size limit (~4 MB).');
    }

    return {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'image',
      name: file.name,
      size: file.size,
      mimeType: scaled.mimeType,
      data: scaled.base64Data,
      previewUrl: scaled.dataUrl,
      thumbnail: thumbnail || scaled.dataUrl,
      loading: false,
    };
  } else {
    // Document / Text file
    let text = await extractTextFromFile(file);
    let notice = null;

    if (!text || !text.trim()) {
      if (extension === 'pdf') {
        notice = 'No text could be extracted from this document (scanned PDF).';
      } else {
        notice = 'No readable text content found in file.';
      }
      text = notice;
    } else if (text.length > 20000) {
      text = text.slice(0, 20000) + '\n\n[Notice: Attachment content truncated at 20,000 characters]';
    }

    return {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'text',
      name: file.name,
      size: file.size,
      content: text,
      notice,
      loading: false,
    };
  }
}
