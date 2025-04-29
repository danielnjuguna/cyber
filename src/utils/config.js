// API Configuration

// In Vite, we need to use import.meta.env.MODE to check production environment,
// not process.env which may not be available in the client bundle
const isProd = import.meta.env.MODE === 'production' || import.meta.env.PROD;

// Get the base URL for API calls
const getBaseUrl = () => {
  // Check for environment variable first (highest priority)
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredUrl) {
    // Return the configured base URL directly. 
    // Remove trailing slash if present for consistency.
    return configuredUrl.replace(/\/$/, ''); 
  }
  
  // Default development URL (server root)
  return 'http://localhost:5000'; 
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
  LOGIN: `${BASE_URL}/api/users/login`,
  REGISTER: `${BASE_URL}/api/users/register`,
  PROFILE: `${BASE_URL}/api/users/profile`,
  REQUEST_RESET: `${BASE_URL}/api/users/request-reset`,
  RESET_PASSWORD: `${BASE_URL}/api/users/reset-password`,
  
  // Services endpoints
  SERVICES: `${BASE_URL}/api/services`,
  SERVICE_BY_ID: (id) => `${BASE_URL}/api/services/${id}`,
  
  // Documents endpoints
  DOCUMENTS: `${BASE_URL}/api/documents`,
  DOCUMENT_BY_ID: (id) => `${BASE_URL}/api/documents/${id}`,
  
  // Users endpoints
  USERS: `${BASE_URL}/api/users`,
  USER_BY_ID: (id) => `${BASE_URL}/api/users/${id}`,
  
  // Contact endpoint
  CONTACT: `${BASE_URL}/api/contact`,
  
  // File management endpoints
  DELETE_FILE: (key) => `${BASE_URL}/api/files/${key}`,
  
  // UploadThing endpoints
  UPLOADTHING: `${BASE_URL}/api/uploadthing`,
  UPLOAD_TOKEN: `${BASE_URL}/api/upload-token`,
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
  
  // If it's an UploadThing URL (already absolute)
  const uploadThingDomains = ['uploadthing.com', 'utfs.io', 'ufs.sh'];
  if (uploadThingDomains.some(domain => path.includes(domain))) {
    return path; 
  }
  
  // For relative paths (like those served from /uploads on the backend)
  // use the BASE_URL determined earlier.
  const baseServerUrl = BASE_URL; 
    
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
      baseServerUrl: baseServerUrl, // Use the correct variable name
      fullUrl,
      isProd
    });
  }
  
  return fullUrl;
}; 