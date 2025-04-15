// API Configuration

// In Vite, we need to use import.meta.env.MODE to check production environment,
// not process.env which may not be available in the client bundle
const isProd = import.meta.env.MODE === 'production' || import.meta.env.PROD;

// FORCE to use '/api' in production, log the environment to debug
console.log('Build environment:', {
  mode: import.meta.env.MODE, 
  isProd,
  apiBaseUrl: isProd ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
});

// For development, use VITE_API_BASE_URL from .env files if set
// For production, ALWAYS use the relative '/api' path
export const BASE_URL = isProd 
  ? '/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

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
};

export const getFileUrl = (path) => {
  if (!path) return '';
  // If path is already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }
  
  // Otherwise, construct the URL based on environment
  // For uploads, we need to use the domain root, not the /api path
  // In production (Render), this will be a relative path
  // In development, we need the full localhost URL
  const baseServerUrl = isProd 
    ? '' // Empty string for relative URLs in production
    : 'http://localhost:5000'; // Full server URL in development
    
  // Ensure path starts with a single slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseServerUrl}${normalizedPath}`;
}; 