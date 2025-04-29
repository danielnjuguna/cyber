import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Lock, FileSpreadsheet, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import DocViewer, { DocViewerRenderers } from "react-doc-viewer"; // Import react-doc-viewer

/**
 * A component that renders various document types using react-doc-viewer
 * with a blurred preview effect on a portion of the first page only.
 */
const DocumentViewer = ({ documentUrl, documentTitle, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [formatIcon, setFormatIcon] = useState(() => FileText);
  const [formatName, setFormatName] = useState('document');

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    // Determine file type from URL
    const determineFileType = () => {
      try {
        setLoading(true);
        setError(null); // Reset error on new load

        // Extract filename and extension from URL
        const urlParts = documentUrl.split('/');
        const fullFileName = urlParts[urlParts.length - 1];
        const fileNameWithoutQuery = fullFileName.split('?')[0];
        const extension = fileNameWithoutQuery.split('.').pop()?.toLowerCase(); // Use optional chaining

        if (!extension) {
          throw new Error('Could not determine file extension from URL.');
        }
        
        setFileType(extension);
        setFormatName(extension.toUpperCase());

        // Set icon based on extension
        switch (extension) {
          case 'pdf': setFormatIcon(() => FileText); break;
          case 'docx':
          case 'doc': setFormatIcon(() => FileText); break;
          case 'xlsx':
          case 'xls': setFormatIcon(() => FileSpreadsheet); break;
          case 'pptx':
          case 'ppt': setFormatIcon(() => FileText); break;
          case 'txt':
          case 'rtf': setFormatIcon(() => FileText); break;
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif': setFormatIcon(() => Image); break;
          case 'csv': setFormatIcon(() => FileSpreadsheet); break;
          default: setFormatIcon(() => File); setFormatName('File'); break;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error determining file type:', err);
        setError('Failed to determine document type from URL.');
        setLoading(false);
      }
    };

    determineFileType();
  }, [documentUrl]);

  const documents = [{ uri: documentUrl, fileType: fileType }];

  const CustomErrorComponent = ({ messageOverride }) => {
    const IconComponent = formatIcon;
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[600px]">
        <IconComponent className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{documentTitle || formatName} Preview Unavailable</h3>
        <p className="text-muted-foreground">{messageOverride || "There was a problem displaying this document or the format is unsupported."}</p>
        <p className="text-sm text-muted-foreground mt-4">Please contact us for the full document.</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 h-[600px]", className)}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading document preview...</p>
      </div>
    );
  }

  if (error || !fileType) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center h-[600px]", className)}>
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading {documentTitle || 'Document'}</h3>
        <p className="text-muted-foreground">{error || 'Could not determine file type.'}</p>
        <p className="text-sm text-muted-foreground mt-4">Please contact support to access this document.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md overflow-hidden border", className)}>
      <div className="relative h-[600px] overflow-hidden">
        <DocViewer
          documents={documents}
          pluginRenderers={DocViewerRenderers}
          config={{
            header: {
              disableHeader: true, // Hide the default header
              disableFileName: true,
            },
            pdfZoom: { // Optional: set initial zoom level
              defaultZoom: 1.0, // Adjust as needed
              zoomJump: 0.2,
            },
            noRenderer: { // Custom component when no renderer is available
              overrideComponent: () => <CustomErrorComponent messageOverride="This file type cannot be previewed."/>
            },
            loadingRenderer: { // Hide default loading message
              overrideComponent: () => null // We handle loading outside
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