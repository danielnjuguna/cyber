// API Configuration

// In Vite, we need to use import.meta.env.MODE to check production environment,
// not process.env which may not be available in the client bundle
const isProd = import.meta.env.MODE === 'production' || import.meta.env.PROD;

// Get the base URL for API calls
const getBaseUrl = () => {
  // Check for environment variable first (highest priority)
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) {
    return configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`;
  }
  
  // Default for production is to use relative paths
  if (isProd) {
    return '/api';
  }
  
  // Default development URL
  return 'http://localhost:5000/api';
};

// Log the environment to debug
console.log('Build environment:', {
  mode: import.meta.env.MODE, 
  isProd,
  apiBaseUrl: getBaseUrl()
});

// Use the function to determine base URL
export const BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  // Auth endpoints - Fixed to match backend routes
  LOGIN: `${BASE_URL}/users/login`,
  REGISTER: `${BASE_URL}/users/register`,
  PROFILE: `${BASE_URL}/users/profile`,
  REQUEST_RESET: `${BASE_URL}/users/request-reset`,
  RESET_PASSWORD: `${BASE_URL}/users/reset-password`,
  
  // Services endpoints
  SERVICES: `${BASE_URL}/services`,
  SERVICE_BY_ID: (id) => `${BASE_URL}/services/${id}`,
  
  // Documents endpoints
  DOCUMENTS: `${BASE_URL}/documents`,
  DOCUMENT_BY_ID: (id) => `${BASE_URL}/documents/${id}`,
  
  // Users endpoints
  USERS: `${BASE_URL}/users`,
  USER_BY_ID: (id) => `${BASE_URL}/users/${id}`,
  
  // Contact endpoint
  CONTACT: `${BASE_URL}/contact`,
  
  // File management endpoints
  DELETE_FILE: (key) => `${BASE_URL}/files/${key}`,
  
  // UploadThing endpoints
  UPLOADTHING: `${BASE_URL}/uploadthing`,
  UPLOAD_TOKEN: `${BASE_URL}/upload-token`,
};

// Debug function to print all endpoints
(() => {
  if (!isProd) {
    console.log('API Endpoints configuration:');
    Object.entries(API_ENDPOINTS).forEach(([key, value]) => {
      if (typeof value === 'function') {
        console.log(`${key} -> ${value('example')}`);
      } else {
        console.log(`${key} -> ${value}`);
      }
    });
  }
})();

// Function to get the appropriate URL for a file
export const getFileUrl = (path) => {
  if (!path) return '';
  
  // If path is already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // If it's an UploadThing URL (any of their domain patterns)
  // These should always be returned as-is since they're absolute URLs
  const uploadThingDomains = ['uploadthing.com', 'utfs.io', 'ufs.sh'];
  if (uploadThingDomains.some(domain => path.includes(domain))) {
    return path; 
  }
  
  // For non-UploadThing URLs, construct based on environment
  // Base server URL - use environment variable if available
  const baseServerUrl = (() => {
    // Check for environment variable
    const configuredUrl = import.meta.env.VITE_SERVER_URL;
    if (configuredUrl) {
      return configuredUrl;
    }
    
    // In production, use relative URLs (empty string)
    if (isProd) {
      return ''; 
    }
    
    // Default for development
    return 'http://localhost:5000';
  })();
    
  // Ensure path starts with a single slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Properly encode the URL components while preserving slashes
  const encodedPath = normalizedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  
  const fullUrl = `${baseServerUrl}${encodedPath}`;
  
  // Log the URL construction in development only
  if (!isProd) {
    console.log('File URL construction:', {
      original: path,
      normalized: normalizedPath,
      encoded: encodedPath,
      fullUrl,
      isProd
    });
  }
  
  return fullUrl;
}; 