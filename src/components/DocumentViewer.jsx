import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertCircle, Lock, FileSpreadsheet, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FileViewer from 'react-file-viewer';
import { saveAs } from 'file-saver';
import * as mammoth from 'mammoth'; // Import mammoth

/**
 * A component that renders various document types directly in the browser
 * with a blurred preview effect on a portion of the first page only
 */
const DocumentViewer = ({ documentUrl, documentType, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileName, setFileName] = useState('document');
  const [formatIcon, setFormatIcon] = useState(() => FileText);
  const [formatName, setFormatName] = useState('document');
  const [textContent, setTextContent] = useState('');
  const [docxHtml, setDocxHtml] = useState(''); // State for DOCX HTML
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    // Helper function to fetch and convert DOCX
    const fetchAndConvertDocx = async (url) => {
      console.log(`Attempting to fetch and convert DOCX: ${url}`);
      try {
        const response = await fetch(url);
        console.log(`DOCX fetch response status: ${response.status}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log('DOCX ArrayBuffer fetched, converting to HTML...');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log('DOCX conversion successful.');
        setDocxHtml(result.value); // The generated HTML
        setLoading(false);
      } catch (conversionError) {
        console.error('Error fetching or converting DOCX:', conversionError);
        setError(`Failed to preview DOCX file. ${conversionError.message}`);
        setLoading(false);
      }
    };

    // Determine file type from URL or passed documentType
    const determineFileType = () => {
      try {
        setLoading(true);
        setError(null); // Reset error on new load
        setDocxHtml(''); // Reset docx html
        setTextContent(''); // Reset text content
        
        // Extract filename from URL
        const urlParts = documentUrl.split('/');
        const fullFileName = urlParts[urlParts.length - 1];
        setFileName(fullFileName.split('?')[0]); // Remove query parameters if any
        
        // Get extension
        const extension = fullFileName.split('.').pop().toLowerCase();
        setFormatName(extension.toUpperCase());
        
        // Map extension to file type for react-file-viewer
        let determinedType = 'unsupported'; // Default type
        switch (extension) {
          // PDF documents
          case 'pdf':
            determinedType = 'pdf-custom';
            setFormatIcon(() => FileText);
            break;
          
          // Word documents
          case 'docx':
            determinedType = 'docx-custom';
            setFormatIcon(() => FileText);
            fetchAndConvertDocx(documentUrl); // Start fetching and converting
            break;
          case 'doc':
            determinedType = 'unsupported';
            setFormatIcon(() => FileText);
            break;
          
          // Excel spreadsheets
          case 'xlsx':
          case 'xls':
            determinedType = 'xlsx-custom';
            setFormatIcon(() => FileSpreadsheet);
            break;
          
          // PowerPoint presentations
          case 'pptx':
          case 'ppt':
            determinedType = 'pptx-custom';
            setFormatIcon(() => FileText);
            break;
          
          // Text files
          case 'txt':
          case 'rtf':
            determinedType = 'txt-custom';
            setFormatIcon(() => FileText);
            fetchTextContent(documentUrl); // Fetch text
            break;
          
          // Images
          case 'jpg':
          case 'jpeg':
            determinedType = 'jpg';
            setFormatIcon(() => Image);
            break;
          case 'png':
            determinedType = 'png';
            setFormatIcon(() => Image);
            break;
          case 'gif':
            determinedType = 'gif';
            setFormatIcon(() => Image);
            break;
          
          // CSV files
          case 'csv':
            determinedType = 'csv-custom';
            setFormatIcon(() => FileSpreadsheet);
            break;
          
          // OpenDocument formats
          case 'odt': determinedType = 'unsupported'; setFormatIcon(() => FileText); break;
          case 'ods': determinedType = 'unsupported'; setFormatIcon(() => FileSpreadsheet); break;
          case 'odp': determinedType = 'unsupported'; setFormatIcon(() => FileText); break;
          
          // Default - unknown format
          default:
            determinedType = 'unsupported';
            setFormatIcon(() => File);
        }

        setFileType(determinedType);
        
        // Set loading false if not handled by async fetch
        if (!['docx-custom', 'txt-custom'].includes(determinedType)) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error determining file type:', err);
        setError('Failed to determine document type');
        setLoading(false);
      }
    };

    // Custom function to fetch text content for TXT files
    const fetchTextContent = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch text: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        
        // Limit text to a reasonable preview length
        const maxPreviewLength = 5000;
        const previewText = text.length > maxPreviewLength 
          ? text.substring(0, maxPreviewLength) + '...' 
          : text;
        
        setTextContent(previewText);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching text content:', err);
        setError('Failed to load text document');
        setLoading(false);
      }
    };

    determineFileType();
  }, [documentUrl, documentType]);

  // Add event handlers to prevent scrolling in the document viewer
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Get all scrollable elements within the viewer
    const handleViewerMounted = () => {
      if (viewerRef.current) {
        // Find all scrollable elements within the viewer
        const scrollableElements = viewerRef.current.querySelectorAll('div, iframe');
        
        scrollableElements.forEach(element => {
          // Apply no-scroll styles to elements
          if (element.scrollHeight > element.clientHeight) {
            element.style.overflow = 'hidden';
            element.style.maxHeight = '600px';
            element.addEventListener('wheel', preventScroll, { passive: false });
            element.addEventListener('touchmove', preventScroll, { passive: false });
          }
        });
      }
    };

    // Apply after a short delay to ensure the viewer is mounted
    const timeoutId = setTimeout(handleViewerMounted, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      if (viewerRef.current) {
        const scrollableElements = viewerRef.current.querySelectorAll('div, iframe');
        scrollableElements.forEach(element => {
          element.removeEventListener('wheel', preventScroll);
          element.removeEventListener('touchmove', preventScroll);
        });
      }
    };
  }, [loading, fileType]);

  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  const onError = (e) => {
    console.error('Error in file viewer:', e);
    setError('Failed to preview document');
  };

  // Custom component for rendering text files
  const TextViewer = ({ text }) => (
    <div className="relative">
      <div className="h-[600px] overflow-hidden touch-none p-4 bg-white font-mono text-sm" ref={viewerRef}>
        <pre className="whitespace-pre-wrap break-words">
          {text}
        </pre>
      </div>
      
      {/* Blur overlay covering exactly bottom half of visible content */}
      <div className="absolute inset-x-0 bottom-0 h-[300px] z-20">
        {/* Sharp blur transition with clear demarcation line */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-[3px]"></div>
        
        {/* Subtle divider line to clearly indicate where preview ends */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
        
        {/* Lock icon and message */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
            <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-base font-medium">Contact us for the full document</p>
            <p className="text-sm text-muted-foreground mt-1">
              Only the top portion of the text is available for preview
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Custom component for PowerPoint presentations
  const PowerPointViewer = () => (
    <div className="relative">
      <div className="h-[600px] overflow-hidden touch-none flex flex-col items-center justify-center bg-slate-100 p-6" ref={viewerRef}>
        {/* More professional slide container with shadow */}
        <div className="w-full max-w-xl aspect-video bg-white rounded-lg shadow-lg flex flex-col border border-slate-200">
          {/* More elegant slide header with gradient */}
          <div className="h-14 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center px-6">
            <div className="h-4 w-48 bg-white/40 rounded-md"></div>
          </div>
          
          {/* Slide content with more realistic spacing and elements */}
          <div className="flex-1 p-8 flex flex-col gap-4">
            {/* Title with better dimensions */}
            <div className="h-9 w-4/5 bg-slate-300 rounded-md"></div>
            
            {/* Subtitle with better contrast */}
            <div className="h-6 w-2/3 bg-slate-200 rounded-md"></div>
            
            {/* Content lines with visual hierarchy */}
            <div className="mt-2 space-y-3">
              <div className="h-4 w-full bg-slate-100 rounded-md"></div>
              <div className="h-4 w-11/12 bg-slate-100 rounded-md"></div>
              <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
            </div>
            
            {/* Visual elements with better spacing and dimensions */}
            <div className="mt-6 flex gap-4">
              <div className="h-20 w-24 bg-blue-100 rounded-md border border-blue-200 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-blue-400"></div>
              </div>
              <div className="h-20 w-24 bg-indigo-100 rounded-md border border-indigo-200 flex items-center justify-center">
                <div className="w-12 h-8 bg-indigo-400 rounded-sm"></div>
              </div>
              <div className="h-20 w-24 bg-purple-100 rounded-md border border-purple-200 flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-400 rounded-md"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Refined status text */}
        <p className="text-center text-slate-600 mt-4 font-medium">
          Preview of first slide
        </p>
      </div>
      
      {/* Enhanced blur overlay */}
      <div className="absolute inset-x-0 bottom-0 h-[300px] z-20">
        {/* Improved gradient blur effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-white/60 via-30% to-white/95 to-100% backdrop-blur-sm"></div>
        
        {/* More visible divider line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-blue-300"></div>
        
        {/* Enhanced lock message container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="px-8 py-5 rounded-xl shadow-xl backdrop-blur-md bg-white/90 text-center border border-slate-200">
            <Lock className="h-7 w-7 mx-auto mb-3 text-blue-600" />
            <p className="text-lg font-semibold text-slate-800">Contact us for the full presentation</p>
            <p className="text-slate-600 mt-2">
              This preview shows only part of the first slide
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Custom PDF Viewer component
  const PDFViewer = () => (
    <div className="relative h-[600px] overflow-hidden touch-none" ref={viewerRef}>
      {/* Iframe container with explicit overflow hidden */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe 
          src={`${documentUrl}#toolbar=0&view=FitH`} 
          className="w-full h-full border-0" /* Ensure no border */
          title="PDF document preview"
          scrolling="no" /* Attempt to disable scrolling attribute */
          style={{ pointerEvents: 'none' }} /* Prevent direct interaction */
        />
      </div>
      
      {/* Blur overlay covering exactly bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-[300px] z-20 pointer-events-none">
        {/* Gradient and blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-[3px]"></div>
        {/* Divider line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
        {/* Lock icon and message - Allow pointer events here if needed for contact button, etc. */}
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
  );

  // Document Type Preview
  const DocumentTypePreview = ({ type }) => {
    const Icon = formatIcon;
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted/30 p-6 rounded-xl mb-4">
          <Icon className="h-16 w-16 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">{formatName} Document</h3>
        <p className="text-muted-foreground mb-4">
          {type} document preview available after contact.
        </p>
        <p className="text-sm text-muted-foreground">Contact us to access the full document.</p>
      </div>
    );
  };

  // NEW: Custom component for rendering DOCX HTML
  const DocxViewer = ({ html }) => (
    <div className="relative">
      {/* Container for HTML with overflow hidden and basic document styling */}
      <div 
        ref={viewerRef} 
        className="h-[600px] overflow-hidden touch-none p-8 bg-white docx-content prose max-w-none prose-sm md:prose-base"
        dangerouslySetInnerHTML={{ __html: html }}
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
  );

  const renderFileViewer = () => {
    const IconComponent = formatIcon;
    
    if (fileType === 'unsupported') {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <IconComponent className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{formatName} Preview</h3>
          <p className="text-muted-foreground mb-4">
            This document type ({formatName}) cannot be previewed directly in the browser.
          </p>
          <p className="text-sm text-muted-foreground">Contact us for access to the full document.</p>
        </div>
      );
    }
    
    // Use custom Text viewer for TXT files
    if (fileType === 'txt-custom') {
      return <TextViewer text={textContent} />;
    }
    
    // Use custom viewers for document types
    if (fileType === 'pdf-custom') {
      return <PDFViewer />;
    }
    
    // Render DOCX content
    if (fileType === 'docx-custom') {
      if (!docxHtml && !loading && !error) {
         return <CustomErrorComponent errorComponent={null} messageOverride="Preview generation failed for this DOCX file."/>;
      }
      return <DocxViewer html={docxHtml} />;
    }
    
    if (fileType === 'xlsx-custom') {
      return <DocumentTypePreview type="Excel" />;
    }
    
    if (fileType === 'csv-custom') {
      return <DocumentTypePreview type="CSV" />;
    }
    
    // Use custom PowerPoint viewer for PPTX files
    if (fileType === 'pptx-custom') {
      return <PowerPointViewer />;
    }

    // For image formats, use the native img tag for better display
    if (fileType === 'jpg' || fileType === 'png' || fileType === 'gif') {
      return (
        <div className="relative">
          <div className="h-[600px] overflow-hidden touch-none flex items-center justify-center bg-black/5" ref={viewerRef}>
            <img 
              src={documentUrl} 
              alt={fileName}
              className="max-h-full object-contain" 
            />
          </div>
          
          {/* Blur overlay covering exactly bottom half of visible content */}
          <div className="absolute inset-x-0 bottom-0 h-[300px] z-20">
            {/* Sharp blur transition with clear demarcation line */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-[3px]"></div>
            
            {/* Subtle divider line to clearly indicate where preview ends */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
            
            {/* Lock icon and message */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
                <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-base font-medium">Contact us for the full image</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Only a partial preview is available
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fallback to using react-file-viewer for any other supported type (though we handle most now)
    if (fileType && fileType !== 'unsupported' && !fileType.endsWith('-custom')) {
      try {
        return (
          <div className="relative">
            {/* Document viewer set to show exactly one page height with overflow hidden */}
            <div className="h-[600px] overflow-hidden touch-none" ref={viewerRef}>
              {/* Invisible overlay to catch all mouse events and prevent interaction */}
              <div className="absolute inset-0 z-10" 
                  style={{ pointerEvents: 'none' }}></div>
              
              <FileViewer
                fileType={fileType}
                filePath={documentUrl}
                onError={onError}
                errorComponent={CustomErrorComponent}
              />
            </div>
            
            {/* Blur overlay covering exactly bottom half of visible content */}
            <div className="absolute inset-x-0 bottom-0 h-[300px] z-20">
              {/* Sharp blur transition with clear demarcation line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-0% via-background/40 via-20% to-background/95 to-100% backdrop-blur-[3px]"></div>
              
              {/* Subtle divider line to clearly indicate where preview ends */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-primary/20"></div>
              
              {/* Lock icon and message */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="glass-card px-6 py-4 rounded-lg shadow-lg backdrop-blur-md bg-background/80 text-center">
                  <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-base font-medium">Contact us for the full document</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only the top half of the first page is available for preview
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        console.error("Error in FileViewer fallback:", error);
        return <CustomErrorComponent />;
      }
    }

    // If we reach here, it's likely unsupported or still loading the custom viewers
    return <CustomErrorComponent />; // Show error or a loading state if appropriate
  };

  // Custom error component for FileViewer - Allow message override
  const CustomErrorComponent = ({ errorComponent, messageOverride }) => {
    const IconComponent = formatIcon;
    
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <IconComponent className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{formatName} Preview</h3>
        <p className="text-muted-foreground">{messageOverride || "There was a problem displaying this document"}</p>
        <p className="text-sm text-muted-foreground mt-4">Please contact us for the full document.</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8", className)}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Loading document preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading {formatName}</h3>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground mt-4">Please contact support to access this document.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md overflow-hidden border", className)}>
      {renderFileViewer()}
      <div className="p-3 bg-muted/20 border-t flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {fileName}
        </span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {formatName} Document
        </span>
      </div>
    </div>
  );
};

export default DocumentViewer;