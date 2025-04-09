import React, { useState, useEffect, useRef } from 'react';
import { FileText, AlertCircle, Lock, FileSpreadsheet, File, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FileViewer from 'react-file-viewer';
import { saveAs } from 'file-saver';


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
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!documentUrl) {
      setError('No document URL provided');
      setLoading(false);
      return;
    }

    // Determine file type from URL or passed documentType
    const determineFileType = () => {
      try {
        setLoading(true);
        
        // Extract filename from URL
        const urlParts = documentUrl.split('/');
        const fullFileName = urlParts[urlParts.length - 1];
        setFileName(fullFileName.split('?')[0]); // Remove query parameters if any
        
        // Get extension
        const extension = fullFileName.split('.').pop().toLowerCase();
        setFormatName(extension.toUpperCase());
        
        // Map extension to file type for react-file-viewer
        switch (extension) {
          // PDF documents
          case 'pdf':
            setFileType('pdf');
            setFormatIcon(() => FileText);
            break;
          
          // Word documents
          case 'docx':
            setFileType('docx');
            setFormatIcon(() => FileText);
            break;
          case 'doc':
            // react-file-viewer doesn't support .doc directly
            setFileType('unsupported');
            setFormatIcon(() => FileText);
            break;
          
          // Excel spreadsheets
          case 'xlsx':
          case 'xls':
            setFileType('xlsx');
            setFormatIcon(() => FileSpreadsheet);
            break;
          
          // PowerPoint presentations
          case 'pptx':
          case 'ppt':
            setFileType('pptx-custom'); // Custom handler for PPTX files
            setFormatIcon(() => FileText);
            
            // Instead of using react-file-viewer for PPTX, we'll show custom preview
            setLoading(false);
            break;
          
          // Text files
          case 'txt':
          case 'rtf':
            setFileType('txt-custom'); // Custom handler for TXT files
            setFormatIcon(() => FileText);
            
            // Fetch text content for custom text viewer
            fetchTextContent(documentUrl);
            break;
          
          // Images
          case 'jpg':
          case 'jpeg':
            setFileType('jpg');
            setFormatIcon(() => Image);
            break;
          case 'png':
            setFileType('png');
            setFormatIcon(() => Image);
            break;
          case 'gif':
            setFileType('gif');
            setFormatIcon(() => Image);
            break;
          
          // CSV files
          case 'csv':
            setFileType('csv');
            setFormatIcon(() => FileSpreadsheet);
            break;
          
          // OpenDocument formats
          case 'odt': // OpenDocument Text
            setFileType('unsupported'); // Try to render as text if possible
            setFormatIcon(() => FileText);
            break;
          case 'ods': // OpenDocument Spreadsheet
            setFileType('unsupported');
            setFormatIcon(() => FileSpreadsheet);
            break;
          case 'odp': // OpenDocument Presentation
            setFileType('unsupported');
            setFormatIcon(() => FileText);
            break;
          
          // Default - unknown format
          default:
            setFileType('unsupported');
            setFormatIcon(() => File);
        }
        
        if (fileType !== 'txt-custom' && fileType !== 'pptx-custom') {
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
  };

  // Custom error component for FileViewer
  const CustomErrorComponent = ({ errorComponent }) => {
    const IconComponent = formatIcon;
    
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <IconComponent className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{formatName} Preview</h3>
        <p className="text-muted-foreground">There was a problem displaying this document</p>
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
    const IconComponent = formatIcon;
    
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