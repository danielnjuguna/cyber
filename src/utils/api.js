import { toast } from '@/hooks/use-toast';

const API_URL = 'http://localhost:5000/api';

export const api = {
  // Generic fetch with auth token
  fetch: async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Not a JSON response - could be HTML error page
        const textContent = await response.text();
        console.error(`Non-JSON response from API (${endpoint}):`, textContent.substring(0, 200) + '...');
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'API request failed';
      console.error(`API Error (${endpoint}):`, message);
      throw error;
    }
  },
  
  // Services
  services: {
    getAll: () => api.fetch('/services'),
    getById: (id) => api.fetch(`/services/${id}`),
    create: (body) => api.fetch('/services', {
      method: 'POST',
      body,
      // Don't set Content-Type, let browser set it with boundary for FormData
    }),
    update: (id, body) => api.fetch(`/services/${id}`, {
      method: 'PUT',
      body,
    }),
    delete: (id) => api.fetch(`/services/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // Documents
  documents: {
    getAll: (params) => {
      let queryString = '';
      
      if (params) {
        const queryParams = new URLSearchParams();
        if (params.category) queryParams.append('category', params.category);
        if (params.search) queryParams.append('search', params.search);
        queryString = `?${queryParams.toString()}`;
      }
      
      return api.fetch(`/documents${queryString}`);
    },
    getById: (id) => api.fetch(`/documents/${id}`),
    create: (body) => api.fetch('/documents', {
      method: 'POST',
      body,
    }),
    update: (id, body) => api.fetch(`/documents/${id}`, {
      method: 'PUT',
      body,
    }),
    delete: (id) => api.fetch(`/documents/${id}`, {
      method: 'DELETE',
    }),
  },

  // Users
  users: {
    getAll: () => api.fetch('/users'),
    getById: (id) => api.fetch(`/users/${id}`),
    create: (data) => api.fetch('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),
    update: (id, data) => api.fetch(`/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),
    delete: (id) => api.fetch(`/users/${id}`, {
      method: 'DELETE',
    }),
  },

  // Contact
  contact: {
    send: (data) => api.fetch('/contact/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),
  },
};

// Helper to handle form submission with error toast
export const handleApiError = (error) => {
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';
    
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
  
  return message;
};
