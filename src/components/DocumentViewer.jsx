import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import DocViewer, { DocViewerRenderers } from "react-doc-viewer"; // Import react-doc-viewer

/**
 * A component that renders various document types using react-doc-viewer
 * with a blurred preview effect on a portion of the first page only.
 */
const DocumentViewer = ({ documentUrl, documentTitle, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Assume PDF for now - a better solution would pass the type or filename
  const assumedFileType = 'pdf'; 
  const formatName = 'PDF'; // Hardcode format name based on assumption

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
    } else {
      // Reset state when URL changes
      setLoading(false); // Set loading false since we aren't detecting type anymore
      setError(null);
    }
  }, [documentUrl]);

  // Prepare docs array for DocViewer
  const documents = documentUrl ? [{ uri: documentUrl, fileType: assumedFileType }] : [];

  const CustomErrorComponent = ({ messageOverride }) => {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[600px]">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{documentTitle || formatName} Preview Unavailable</h3>
        <p className="text-muted-foreground">{messageOverride || "There was a problem displaying this document or the format is unsupported."}</p>
        <p className="text-sm text-muted-foreground mt-4">Please contact us for the full document.</p>
      </div>
    );
  };

  // Handle loading state explicitly before rendering DocViewer
  if (!documentUrl) {
     return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center h-[600px]", className)}>
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading Preview</h3>
        <p className="text-muted-foreground">No document URL was provided.</p>
      </div>
    );
  }
  
  // Error state is handled by the noRenderer override or if initial URL check fails

  return (
    <div className={cn("rounded-md overflow-hidden border", className)}>
      <div className="relative h-[600px] overflow-hidden">
        <DocViewer
          documents={documents}
          pluginRenderers={DocViewerRenderers} // Use default renderers
          config={{
            header: {
              disableHeader: true, // Hide the default header
              disableFileName: true,
            },
             pdfZoom: { // Optional: set initial zoom level
               defaultZoom: 0.8, // Try a slightly smaller zoom
               zoomJump: 0.2,
             },
            pdfVerticalScrollByDefault: true, // Ensure vertical scroll behavior if needed internally
            noRenderer: { // Custom component when no renderer is available
              overrideComponent: () => <CustomErrorComponent messageOverride={`Preview for ${formatName} files is not currently supported.`}/>
            },
            loadingRenderer: { // Hide default loading message
              overrideComponent: () => (
                 <div className="flex flex-col items-center justify-center p-8 h-full">
                   <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-muted-foreground">Loading document preview...</p>
                 </div>
              )
            }
          }}
          style={{ height: '100%' }}
          prefetchMethod="GET" // Needed for some hosting setups
        />
        {/* Blur overlay covering exactly bottom half */}
        <div className="absolute inset-x-0 bottom-0 h-[300px] z-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-[3px]"></div>
          <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
            <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
              <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-base font-medium">Contact us for the full document</p>
              <p className="text-sm text-muted-foreground mt-1">
                Only the top portion is available for preview
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3 bg-muted/20 border-t flex justify-between items-center">
        <span className="text-sm text-muted-foreground truncate pr-2" title={documentTitle}>
          {documentTitle || 'Document'} {/* Display document title */}
        </span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
          {formatName} Document
        </span>
      </div>
    </div>
  );
};

export default DocumentViewer;