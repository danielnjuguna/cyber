// API Configuration

// In Vite, we need to use import.meta.env.MODE to check production environment,
// not process.env which may not be available in the client bundle
const isProd = import.meta.env.MODE === 'production' || import.meta.env.PROD;

// Get the base URL for API calls
const getBaseUrl = () => {
  // For combined deployment, API calls are relative to the current origin.
  // We return an empty string, and API_ENDPOINTS will start with '/api'.
  return ''; 
};

// Log the environment to debug
console.log('Build environment:', {
  mode: import.meta.env.MODE, 
  isProd,
  apiBaseUrl: getBaseUrl()
});

// Use the function to determine base URL (will be empty string)
export const BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  // Endpoints will now correctly start with /api/...
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
  
  // For relative paths (like /uploads/...), just ensure it starts with a slash.
  // BASE_URL is empty, so we don't prepend anything.
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Properly encode the URL components while preserving slashes
  const encodedPath = normalizedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
    
  // In development, this might be useful, but in production, it's just the path.
  // const fullUrl = `${BASE_URL}${encodedPath}`; // BASE_URL is empty
  const fullUrl = encodedPath;

  // Log the URL construction in development only
  if (!isProd) {
    console.log('File URL construction (Combined Deployment):', {
      original: path,
      normalized: normalizedPath,
      encoded: encodedPath,
      // baseServerUrl: BASE_URL, // BASE_URL is empty
      fullUrl,
      isProd
    });
  }
  
  return fullUrl;
}; 