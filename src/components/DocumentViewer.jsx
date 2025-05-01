import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertCircle, Lock, ChevronLeft, ChevronRight, FileSpreadsheet, FileImage, Presentation } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import * as mammoth from 'mammoth'; // For DOCX rendering
import * as XLSX from 'xlsx'; // For Excel files
import { cn } from '@/lib/utils'; // Import cn utility

/**
 * Enhanced DocumentViewer that renders various document types with:
 * - Configurable page limit for preview
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
  // Supported file types configuration
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [customRenderedContent, setCustomRenderedContent] = useState(null);
  const [isCustomRenderer, setIsCustomRenderer] = useState(false);
  const viewerRef = useRef(null);
  
  // Log props on initial render
  console.log('📄 DocumentViewer Props:', { documentUrl, documentTitle, fileType, previewPages });

  // Determine format name and icon based on passed fileType
  const normalizedFileType = fileType ? fileType.toLowerCase() : '';
  const fileTypeInfo = SUPPORTED_TYPES[normalizedFileType] || { icon: <FileText />, name: 'File' };
  const formatName = fileTypeInfo.name;
  const formatIcon = fileTypeInfo.icon;

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    } 
    
    if (!fileType) {
      setError('File type not provided');
      setLoading(false);
      return;
    }
    
    const handleDocument = async () => {
      try {
        const normalizedType = fileType.toLowerCase();
        
        // Handle Office documents and other formats not natively supported by DocViewer
        if (normalizedType === 'docx' || normalizedType === 'doc') {
          setIsCustomRenderer(true);
          await handleWordDocument(documentUrl);
        } else if (normalizedType === 'xlsx' || normalizedType === 'xls') {
          setIsCustomRenderer(true);
          await handleExcelDocument(documentUrl);
        } else {
          // Use default DocViewer for PDF and other supported formats
          setIsCustomRenderer(false);
        }
        
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error processing document:', err);
        setError(`Failed to process ${fileType.toUpperCase()} document: ${err.message}`);
        setLoading(false);
      }
    };
    
    handleDocument();
  }, [documentUrl, fileType]);
  
  // Handler for Word documents using Mammoth.js
  const handleWordDocument = async (url) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = result.value;
      
      // Set a default of 1 total page for Word docs
      // In a production app, you might estimate pages based on content length
      setTotalPages(1);
      setCustomRenderedContent(
        <div className="prose prose-sm sm:prose-base max-w-none p-8 bg-white overflow-y-auto h-full docx-preview">
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      );
    } catch (error) {
      throw new Error(`Error converting Word document: ${error.message}`);
    }
  };
  
  // Handler for Excel documents using SheetJS
  const handleExcelDocument = async (url) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to HTML table
      const htmlTable = XLSX.utils.sheet_to_html(worksheet);
      
      // Set total pages to number of sheets in the workbook
      setTotalPages(workbook.SheetNames.length);
      setCustomRenderedContent(
        <div className="p-4 bg-white overflow-auto h-full excel-preview">
          <div className="text-sm font-medium mb-2">Sheet: {firstSheetName}</div>
          <div className="overflow-x-auto">
            <div dangerouslySetInnerHTML={{ __html: htmlTable }} />
          </div>
        </div>
      );
    } catch (error) {
      throw new Error(`Error converting Excel document: ${error.message}`);
    }
  };

  // Documents array for DocViewer
  const documents = (documentUrl && fileType) ? [{ uri: documentUrl, fileType }] : [];

  // Page navigation handlers
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      
      // Use DocViewer's internal API if possible
      if (viewerRef.current && viewerRef.current.goToPrevPage) {
        viewerRef.current.goToPrevPage();
      }
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      
      // Use DocViewer's internal API if possible
      if (viewerRef.current && viewerRef.current.goToNextPage) {
        viewerRef.current.goToNextPage();
      }
    }
  };

  // Custom error component
  const CustomErrorComponent = ({ messageOverride }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <FileText className="h-10 w-10 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{documentTitle || formatName} Preview Unavailable</h3>
      <p className="text-muted-foreground">{messageOverride || "There was a problem displaying this document or the format is unsupported."}</p>
      <p className="text-sm text-muted-foreground mt-4">Please contact us for the full document.</p>
    </div>
  );

  // Handle loading state
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 h-[600px] ${className}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading document preview...</p>
      </div>
    );
  }
  
  // Handle error state
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
        {isCustomRenderer ? (
          // Custom renderer for Office documents
          <div className="h-full">{customRenderedContent}</div>
        ) : (
          // Default DocViewer for PDFs and other supported formats
          <DocViewer
            ref={viewerRef}
            documents={documents}
            pluginRenderers={DocViewerRenderers}
            config={{
              header: {
                disableHeader: true,
                disableFileName: true,
              },
              pdfZoom: {
                defaultZoom: 0.8,
                zoomJump: 0.2,
              },
              pdfVerticalScrollByDefault: true,
              noRenderer: {
                overrideComponent: () => 
                  <CustomErrorComponent messageOverride={`Preview for ${formatName} files is not currently supported.`} />
              },
              loadingRenderer: {
                overrideComponent: () => (
                  <div className="flex flex-col items-center justify-center p-8 h-full">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-muted-foreground">Loading document preview...</p>
                  </div>
                )
              },
              onDocumentLoad: (doc) => {
                if (doc && doc.numPages) {
                  setTotalPages(doc.numPages);
                  console.log(`PDF loaded via onDocumentLoad: ${doc.numPages} pages`);
                }
              }
            }}
            style={{ height: '100%' }}
            prefetchMethod="GET"
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}

        {/* Blur overlay for pages beyond the limit */}
        {currentPage > previewPages && (
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
        
        {/* For Office documents, create a partial blur effect for limited preview */}
        {isCustomRenderer && (
          <div className="absolute inset-x-0 bottom-0 h-1/2 z-20 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-sm"></div>
            <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
              <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
                <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-base font-medium">Contact us for the full document</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Only a portion of this {formatName} document is available for preview
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls and information footer */}
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
        
        {/* Page navigation controls - shown for PDFs and other paginated formats */}
        {totalPages > 0 && (
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
              {currentPage > previewPages && !isCustomRenderer && (
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
        )}
        
        {/* For Office document types that don't have explicit pagination */}
        {isCustomRenderer && !totalPages && (
          <div className="text-xs text-muted-foreground mt-1">
            <span className="text-primary-foreground bg-primary/10 px-1 py-0.5 rounded-sm">
              Limited preview available
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;