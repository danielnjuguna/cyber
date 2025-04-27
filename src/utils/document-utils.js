/**
 * Utility functions for document processing
 */

/**
 * Estimate PDF page count based on file size
 * Average PDF page is about 100KB
 * @param {string} url - URL of the PDF document
 * @returns {Promise<number>} - Estimated number of pages
 */
export const estimatePdfPageCount = async (url) => {
  try {
    console.log('Estimating pages in PDF:', url);
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get content-length header if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      // Convert to KB and estimate (average PDF page is roughly 100KB)
      const fileSizeKB = parseInt(contentLength) / 1024;
      const estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 100));
      console.log('Estimated PDF page count:', estimatedPages);
      return estimatedPages;
    }
    
    // If content-length is not available, fetch the full response to get size
    const fullResponse = await fetch(url);
    const blob = await fullResponse.blob();
    const fileSizeKB = blob.size / 1024;
    const estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 100));
    console.log('Estimated PDF page count (from blob):', estimatedPages);
    return estimatedPages;
  } catch (error) {
    console.error('Error estimating PDF pages:', error);
    return 1; // Default to 1 page on error
  }
};

/**
 * Estimate DOCX page count based on file size
 * Average DOCX page is about 30KB
 * @param {string} url - URL of the DOCX document
 * @returns {Promise<number>} - Estimated number of pages
 */
export const estimateDocxPageCount = async (url) => {
  try {
    console.log('Estimating pages in DOCX:', url);
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get content-length header if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      // Convert to KB and estimate (average DOCX page is roughly 30KB)
      const fileSizeKB = parseInt(contentLength) / 1024;
      const estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 30));
      console.log('Estimated DOCX page count:', estimatedPages);
      return estimatedPages;
    }
    
    // If content-length is not available, fetch the full response to get size
    const fullResponse = await fetch(url);
    const blob = await fullResponse.blob();
    const fileSizeKB = blob.size / 1024;
    const estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 30));
    console.log('Estimated DOCX page count (from blob):', estimatedPages);
    return estimatedPages;
  } catch (error) {
    console.error('Error estimating DOCX pages:', error);
    return 1; // Default to 1 page on error
  }
};

/**
 * Estimate page count for a text document based on line count
 * @param {string} text - Content of the text file
 * @returns {number} - Estimated number of pages
 */
export const estimateTextPageCount = (text) => {
  const linesPerPage = 50; // Approximate lines per printed page
  const lines = text.split('\n').length;
  const estimatedPages = Math.max(1, Math.ceil(lines / linesPerPage));
  console.log('Estimated text pages:', estimatedPages);
  return estimatedPages;
};

/**
 * Calculate blur height based on page count
 * @param {number} pageCount - Number of pages in the document
 * @param {number} totalHeight - Total height of the container in pixels
 * @returns {number} - Height of the blur overlay in pixels
 */
export const calculateBlurHeight = (pageCount, totalHeight = 600) => {
  if (pageCount <= 1) {
    // For 1 page docs, blur the bottom half
    return totalHeight / 2;
  } else if (pageCount <= 3) {
    // For 2-3 page docs, blur the bottom 2/3
    return (totalHeight * 2) / 3;
  } else if (pageCount <= 5) {
    // For 4-5 page docs, blur the bottom 3/4
    return (totalHeight * 3) / 4;
  } else {
    // For 6+ page docs, blur almost everything (90%)
    return totalHeight * 0.9;
  }
};

/**
 * Get blur intensity based on page count
 * @param {number} pageCount - Number of pages in the document
 * @returns {number} - Blur intensity (px)
 */
export const getBlurIntensity = (pageCount) => {
  if (pageCount <= 1) {
    return 3; // Light blur for single page
  } else if (pageCount <= 3) {
    return 4; // Medium blur
  } else if (pageCount <= 5) {
    return 5; // Heavier blur
  } else {
    return 6; // Most intense blur for longer documents
  }
};

/**
 * Get styles for blur overlay based on page count
 * @param {number} pageCount - Number of pages in the document
 * @returns {Object} - CSS styles object
 */
export const getBlurStyles = (pageCount) => {
  const blurHeight = calculateBlurHeight(pageCount);
  const blurIntensity = getBlurIntensity(pageCount);
  
  return {
    height: `${blurHeight}px`,
    backdropFilter: `blur(${blurIntensity}px)`,
  };
};

/**
 * Default page counts for different document types
 */
export const DEFAULT_PAGE_COUNTS = {
  pdf: 1,
  docx: 1,
  doc: 1,
  xlsx: 5,
  xls: 5,
  pptx: 10,
  ppt: 10,
  txt: 1,
  image: 1,
  unknown: 3
};

/**
 * Get an estimated page count for a document based on its type
 * @param {string} fileType - Type of document
 * @returns {number} - Estimated page count
 */
export const getEstimatedPageCount = (fileType) => {
  const lowerType = fileType?.toLowerCase() || 'unknown';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(lowerType)) {
    return DEFAULT_PAGE_COUNTS.image;
  }
  
  return DEFAULT_PAGE_COUNTS[lowerType] || DEFAULT_PAGE_COUNTS.unknown;
}; 