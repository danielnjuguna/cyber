// API Configuration

// Check if running in production environment (Render sets NODE_ENV=production)
const isProduction = process.env.NODE_ENV === 'production';

// Read the variable from Vite's env (works reliably in local dev)
const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Determine the Base URL:
// - If in production (on Render), ALWAYS use relative path '/api'
// - Otherwise (local dev), use the value from .env or fallback to localhost
export const BASE_URL = isProduction
  ? '/api'
  : (viteApiBaseUrl || 'http://localhost:5000/api');

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${BASE_URL}/auth/login`,
  REGISTER: `${BASE_URL}/auth/register`,
  PROFILE: `${BASE_URL}/auth/profile`,
  REQUEST_RESET: `${BASE_URL}/auth/request-reset`,
  RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
  
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
  // Otherwise, assume it's relative to the root domain (e.g., /uploads/...)
  return `/${path.replace(/^\//, '')}`; // Ensure it starts with a single slash
}; 