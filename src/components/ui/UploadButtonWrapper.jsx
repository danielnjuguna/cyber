import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Upload } from 'lucide-react';
import { useUploadThing } from '@/lib/uploadthing';
import { getFileUrl } from '@/utils/config';

/**
 * A wrapper that uses UploadThing's useUploadThing hook with the app's UI styling
 */
const UploadButtonWrapper = ({
  endpoint,
  onClientUploadComplete,
  onUploadError,
  onUploadBegin,
  buttonText = 'Upload File',
  buttonVariant = 'outline',
  className,
  disabled,
  ...props // Pass any other props to the button
}) => {
  const fileInputRef = useRef(null);
  const [isUploadingInternal, setIsUploadingInternal] = useState(false);
  const [error, setError] = useState(null);

  const handleUploadComplete = useCallback((result) => {
    setIsUploadingInternal(false);
    setError(null);
    
    // Process the result to ensure URLs are properly formatted
    if (Array.isArray(result) && result.length > 0) {
      // Handle UploadThing API v9 changes: always use ufsUrl as primary URL
      const processedResult = result.map(file => {
        // In v9, we should always use ufsUrl
        const fileUrl = file.ufsUrl || '';
        
        // Create a clean object with only the properties we need
        return {
          key: file.key,
          name: file.name,
          size: file.size,
          url: fileUrl, // Store ufsUrl as the main url
          ufsUrl: fileUrl,
          displayUrl: getFileUrl(fileUrl),
          // Include serverData for compatibility
          serverData: file.serverData || {
            uploadedBy: file.uploadedBy || 'anonymous',
            url: fileUrl,
            key: file.key,
            name: file.name,
            size: file.size
          }
        };
      });
      
      if (onClientUploadComplete) {
        onClientUploadComplete(processedResult);
      }
    } else if (onClientUploadComplete) {
      onClientUploadComplete(result);
    }
  }, [onClientUploadComplete]);

  const handleUploadError = useCallback((error) => {
    console.error("Upload error in UploadButtonWrapper:", error);
    setIsUploadingInternal(false);
    setError(error.message || "Upload failed");
    
    if (onUploadError) {
      onUploadError(error);
    }
  }, [onUploadError]);

  const handleUploadBegin = useCallback((fileName) => {
    setIsUploadingInternal(true);
    setError(null);
    
    if (onUploadBegin) {
      onUploadBegin(fileName);
    }
  }, [onUploadBegin]);

  // Use the hook
  const { startUpload, isUploading: isUploadingHook } = useUploadThing(
    endpoint,
    {
      onClientUploadComplete: handleUploadComplete,
      onUploadError: handleUploadError,
      onUploadBegin: handleUploadBegin,
    }
  );

  // Determine accept attribute based on endpoint
  const getAcceptTypes = () => {
    switch (endpoint) {
      case 'imageUploader':
        return "image/*";
      case 'documentUploader':
        return "application/pdf"; // Only accept PDF files
      default:
        return "*/*"; // Accept all file types by default
    }
  };

  const triggerFileInput = () => {
    // Clear any previous errors
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      
      // Optional: validate file size 
      const maxSizeMB = endpoint === 'imageUploader' ? 10 : 30;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (selectedFile.size > maxSizeBytes) {
        setError(`File size exceeds maximum allowed (${maxSizeMB}MB)`);
        if (onUploadError) {
          onUploadError(new Error(`File size exceeds maximum allowed (${maxSizeMB}MB)`));
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Start the upload process
      try {
        startUpload(Array.from(files));
      } catch (error) {
        console.error("Failed to start upload:", error);
        setError(error.message || "Failed to start upload");
        if (onUploadError) {
          onUploadError(error);
        }
      }
      
      // Reset file input to allow uploading the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isActuallyUploading = isUploadingInternal || isUploadingHook;

  return (
    <div className="flex flex-col">
      <div className={cn("flex items-center", className)}>
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept={getAcceptTypes()}
          multiple={false} // Assuming single file upload based on core.js
        />
        
        {/* Visible button with app styling */}
        <Button 
          type="button" 
          variant={buttonVariant}
          onClick={triggerFileInput}
          disabled={disabled || isActuallyUploading} // Disable button while uploading
          className="flex items-center"
          {...props}
        >
          {isActuallyUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isActuallyUploading ? 'Uploading...' : buttonText}
        </Button>
      </div>
      
      {/* Display error message if any */}
      {error && (
        <div className="text-red-500 text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadButtonWrapper; 