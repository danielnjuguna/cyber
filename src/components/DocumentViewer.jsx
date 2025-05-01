import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertCircle, Lock, ChevronLeft, ChevronRight, FileSpreadsheet, FileImage, Presentation } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
// Removed mammoth and xlsx imports as we will rely on DocViewerRenderers
// import * as mammoth from 'mammoth'; // For DOCX rendering
// import * as XLSX from 'xlsx'; // For Excel files
import { cn } from '@/lib/utils'; // Import cn utility

/**
 * Enhanced DocumentViewer that renders various document types using react-doc-viewer.
 * - Configurable page limit for preview (primarily affects paginated formats like PDF)
 * - Blur effect on pages/content beyond the limit
 * - Page navigation controls
 */
const DocumentViewer = ({ 
  documentUrl, 
  documentTitle, 
  fileType, 
  className = "",
  previewPages = 1, // Number of pages to show before blur
}) => {
  // Supported file types configuration (for icon/name lookup)
  const SUPPORTED_TYPES = {
    pdf: { icon: <FileText />, name: 'PDF' },
    docx: { icon: <FileText />, name: 'Word' },
    doc: { icon: <FileText />, name: 'Word' },
    xlsx: { icon: <FileSpreadsheet />, name: 'Excel' },
    xls: { icon: <FileSpreadsheet />, name: 'Excel' },
    csv: { icon: <FileSpreadsheet />, name: 'CSV' },
    pptx: { icon: <Presentation />, name: 'PowerPoint' },
    ppt: { icon: <Presentation />, name: 'PowerPoint' },
    jpg: { icon: <FileImage />, name: 'Image' },
    jpeg: { icon: <FileImage />, name: 'Image' },
    png: { icon: <FileImage />, name: 'Image' },
    gif: { icon: <FileImage />, name: 'Image' },
    txt: { icon: <FileText />, name: 'Text' },
    html: { icon: <FileText />, name: 'HTML' },
  };
  const [loading, setLoading] = useState(true); // Still track overall loading state
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // Removed customRenderedContent and isCustomRenderer state
  // const [customRenderedContent, setCustomRenderedContent] = useState(null);
  // const [isCustomRenderer, setIsCustomRenderer] = useState(false);
  const viewerRef = useRef(null); // Ref potentially useful for DocViewer API access
  
  // Log props on initial render
  console.log('📄 DocumentViewer Props:', { documentUrl, documentTitle, fileType, previewPages });

  // Determine format name and icon based on passed fileType
  const normalizedFileType = fileType ? fileType.toLowerCase() : '';
  const fileTypeInfo = SUPPORTED_TYPES[normalizedFileType] || { icon: <FileText />, name: 'File' };
  const formatName = fileTypeInfo.name;
  const formatIcon = fileTypeInfo.icon;

  // Simplified Effect: Check for basic props and set loading to false once props are available
  // The actual document loading is handled internally by DocViewer
  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
    } else if (!fileType) {
      setError('File type not provided');
      setLoading(false);
    } else {
      setError(null); // Clear previous errors
      setLoading(false); // Assume DocViewer will show its own loading state
      // Reset pagination state when document changes
      setCurrentPage(1);
      setTotalPages(0);
    }
  }, [documentUrl, fileType]);

  // Removed custom useEffect for handling Word/Excel separately
  // useEffect(() => { ... handleDocument logic removed ... }, [documentUrl, fileType]);
  
  // Removed handleWordDocument and handleExcelDocument functions
  // const handleWordDocument = async (url) => { ... };
  // const handleExcelDocument = async (url) => { ... };

  // Documents array for DocViewer - unchanged
  const documents = (documentUrl && fileType) ? [{ uri: documentUrl, fileType }] : [];

  // Page navigation handlers - mostly unchanged, rely on DocViewer's internal state
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // Optional: If DocViewer exposes API via ref, could call it
      // if (viewerRef.current && viewerRef.current.prevPage) viewerRef.current.prevPage();
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      // Optional: If DocViewer exposes API via ref, could call it
      // if (viewerRef.current && viewerRef.current.nextPage) viewerRef.current.nextPage();
    }
  };

  // Custom error component for DocViewer's noRenderer prop - unchanged
  const CustomErrorComponent = ({ messageOverride }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <FileText className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{documentTitle || formatName} Preview Unavailable</h3>
      <p className="text-muted-foreground">{messageOverride || "There was a problem displaying this document or the format is unsupported."}</p>
      <p className="text-sm text-muted-foreground mt-4">Please contact us for the full document.</p>
    </div>
  );

  // Handle initial loading state (before DocViewer takes over)
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 h-[600px] ${className}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Preparing document preview...</p>
      </div>
    );
  }
  
  // Handle error state - unchanged
  if (error || !fileType || !documentUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center h-[600px] ${className}`}>
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading Preview</h3>
        <p className="text-muted-foreground">{error || 'Document URL or File Type missing.'}</p>
      </div>
    );
  }

  // Render the document viewer
  return (
    <div className={`rounded-md overflow-hidden border ${className}`}>
      <div className="relative h-[600px] overflow-hidden">
        {/* Use DocViewer directly for all types, relying on its renderers */}
        <DocViewer
          ref={viewerRef}
          documents={documents}
          pluginRenderers={DocViewerRenderers} // Use the built-in renderers
          config={{
            header: {
              disableHeader: true, // Keep header disabled for cleaner look
              disableFileName: true,
            },
            pdfZoom: {
              defaultZoom: 0.8,
              zoomJump: 0.2,
            },
            pdfVerticalScrollByDefault: true, // Good default for PDFs
            // Let DocViewer handle its loading and errors internally
            loadingRenderer: {
              overrideComponent: () => (
                <div className="flex flex-col items-center justify-center p-8 h-full">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-muted-foreground">Loading document preview...</p>
                </div>
              )
            },
            noRenderer: {
              overrideComponent: () => 
                <CustomErrorComponent messageOverride={`Preview for ${formatName} files is not currently supported or failed to load.`} />
            },
            // Callback to get total pages, primarily for PDFs
            onDocumentLoad: (doc) => {
              if (doc && doc.numPages) {
                setTotalPages(doc.numPages);
                console.log(`Document loaded via onDocumentLoad: ${doc.numPages} pages`);
              } else {
                // If no numPages, assume it's not paginated like PDF
                setTotalPages(0); 
                setCurrentPage(1); // Reset to 1
                console.log(`Document loaded via onDocumentLoad: Not paginated or page count unavailable.`);
              }
            }
          }}
          style={{ height: '100%' }}
          prefetchMethod="GET" // Keep prefetch method
          // Let DocViewer manage its internal page state if possible
          // onPageChange might still be useful if needed for external logic
          onPageChange={(page) => setCurrentPage(page)} 
        />

        {/* Blur overlay for pages beyond the limit (mostly for PDFs) */}
        {/* Only apply if totalPages > 0 (paginated) and currentPage exceeds limit */}
        {totalPages > 0 && currentPage > previewPages && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
              <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
                <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-base font-medium">Contact us for the full document</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the first {previewPages} {previewPages === 1 ? 'page is' : 'pages are'} available for preview
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Removed the separate overlay logic for custom renderers */}
        {/* {isCustomRenderer && (...)} */}
      </div>

      {/* Controls and information footer - largely unchanged */}
      <div className="p-3 bg-muted/20 border-t">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground truncate pr-2" title={documentTitle}>
            {documentTitle || 'Document'}
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap flex items-center">
            {React.cloneElement(formatIcon, { className: "h-3 w-3 mr-1" })}
            {formatName} Document
          </span>
        </div>
        
        {/* Page navigation controls - shown only if totalPages > 0 */}
        {totalPages > 0 ? (
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
              {currentPage > previewPages && (
                <span className="ml-2 text-primary-foreground bg-primary px-1 py-0.5 rounded-sm text-xs">
                  Preview limit reached
                </span>
              )}
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={goToPrevPage} 
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={goToNextPage} 
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          // Show a simpler message for non-paginated or unknown pagination formats
          <div className="text-xs text-muted-foreground mt-1">
            Preview available. Contact us for the full document.
          </div>
        )}
        
        {/* Removed the specific message for custom renderers */}
        {/* {isCustomRenderer && !totalPages && (...)} */}
      </div>
    </div>
  );
};

export default DocumentViewer;