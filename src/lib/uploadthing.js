// Import only the components that don't rely on Next.js
import { generateReactHelpers } from "@uploadthing/react";
import { useState, useEffect } from 'react';

// Get base URL for API endpoints from environment variables
const API_URL = import.meta.env.VITE_API_BASE_URL || '';

// Add configuration options with API URL
const uploadthingConfig = {
  // Use our Express API endpoint for the upload with environment variable
  url: `${API_URL}/uploadthing`,
  // Enable debug mode in development
  dev: import.meta.env.DEV,
  // Add uploader configuration options
  uploadthingId: import.meta.env.VITE_UPLOADTHING_APP_ID || "4x2howc64k",
  // We'll fetch the token from the server instead of hardcoding it
  // token will be fetched dynamically
  // Add v9 URL configuration
  fileUrlProcessor: {
    // Always use ufsUrl (unified file storage URL) in v9
    processFileUrl: (url) => url,
    // Tell UploadThing not to use the deprecated URL formats
    useTheNewFileUrl: true,
  }
};

// Define our file router types for TypeScript
/* type OurFileRouter = {
  documentUploader: {
    file: {
      maxFileSize: string;
      maxFileCount: number;
    };
  };
  imageUploader: {
    image: {
      maxFileSize: string;
      maxFileCount: number;
    };
  };
}; */

// Export UploadThing components and hooks
export const { 
  UploadButton,
  UploadDropzone,
  Uploader,
  useUploadThing,
  uploadFiles
} = generateReactHelpers(uploadthingConfig);

// Custom hook to fetch the token from the server
export const useFetchUploadToken = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${API_URL}/upload-token`);
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.token) {
          setToken(data.token);
          console.log('Successfully fetched UploadThing token', data.tokenInfo);
        } else {
          throw new Error('Token response malformed');
        }
      } catch (err) {
        console.error('Error fetching upload token:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  return { token, loading, error };
};

// Utility function for URL handling
export function getFullUploadThingUrl(url) {
  if (!url) return '';
  // If URL is already absolute, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise, assume it's an UploadThing URL and return as is (they are usually absolute)
  return url; // UploadThing URLs are typically absolute
} 