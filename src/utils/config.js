// API Configuration
// Use Vite environment variable for the base URL
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'; // Fallback for safety

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
  return path.startsWith('http') ? path : `${BASE_URL}/${path}`;
}; 