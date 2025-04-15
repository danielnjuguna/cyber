import { toast } from '@/hooks/use-toast';
import { API_ENDPOINTS, getFileUrl } from './config';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

const handleError = (error) => {
  console.error('API Error:', error);
  if (error.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  throw error;
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Add a new function for form data headers (without Content-Type)
const getFormDataHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Auth
  login: async (credentials) => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  register: async (userData) => {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  // Services
  getServices: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICES, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  getService: async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_BY_ID(id), {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  services: {
    create: async (formData) => {
      try {
        const response = await fetch(API_ENDPOINTS.SERVICES, {
          method: 'POST',
          // Important: Don't set Content-Type for FormData
          headers: getFormDataHeaders(),
          body: formData,
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    },
    
    update: async (id, formData) => {
      try {
        const response = await fetch(API_ENDPOINTS.SERVICE_BY_ID(id), {
          method: 'PUT',
          // Important: Don't set Content-Type for FormData
          headers: getFormDataHeaders(),
          body: formData,
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    },
    
    delete: async (id) => {
      try {
        const response = await fetch(API_ENDPOINTS.SERVICE_BY_ID(id), {
          method: 'DELETE',
          headers: getHeaders(),
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  // Documents
  getDocuments: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  getDocument: async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  documents: {
    create: async (formData) => {
      try {
        const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
          method: 'POST',
          // Important: Don't set Content-Type for FormData
          headers: getFormDataHeaders(),
          body: formData,
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    },
    
    update: async (id, formData) => {
      console.log('🔍 Updating document with id:', id);
      
      // Validate formData
      if (!(formData instanceof FormData)) {
        console.error('⚠️ Invalid formData type:', typeof formData);
        throw new Error('Invalid form data format');
      }
      
      // Enhanced debugging for FormData contents
      console.log('📋 Form data initial check:', {
        hasDocument: formData.has('document'),
        hasThumbnail: formData.has('thumbnail'),
        title: formData.get('title'),
        description: formData.get('description')
      });
      
      // Log document file details if present
      const documentFile = formData.get('document');
      if (documentFile) {
        console.log('📄 Document file details:', {
          name: documentFile.name,
          type: documentFile.type,
          size: `${(documentFile.size / 1024).toFixed(2)} KB`
        });
      } else {
        console.log('⚠️ No document file in FormData');
      }
      
      try {
        // For debugging, log all FormData entries
        console.log('🔍 All FormData entries:');
        for (let pair of formData.entries()) {
          const value = pair[1] instanceof File 
            ? `File: ${pair[1].name} (${pair[1].type}, ${(pair[1].size / 1024).toFixed(2)} KB)` 
            : pair[1];
          console.log(`- ${pair[0]}: ${value}`);
        }
        
        console.log('🔄 Sending PUT request to:', API_ENDPOINTS.DOCUMENT_BY_ID(id));
        const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
          method: 'PUT',
          // Important: Don't set Content-Type for FormData
          headers: getFormDataHeaders(),
          body: formData,
        });
        
        console.log('📥 Response status:', response.status, response.statusText);
        
        // If we get a non-JSON response, log it for debugging
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          console.log('📥 Response content-type:', contentType);
          
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('⚠️ Non-JSON error response:', text);
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
          }
        }
        
        const data = await handleResponse(response);
        console.log('✅ Update successful, response data:', data);
        return data;
      } catch (error) {
        console.error('❌ Error updating document:', error);
        return handleError(error);
      }
    },
    
    delete: async (id) => {
      try {
        const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
          method: 'DELETE',
          headers: getHeaders(),
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  uploadDocument: async (formData) => {
    try {
      const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  downloadDocument: async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id) + '/download', {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      return response.blob();
    } catch (error) {
      handleError(error);
    }
  },

  deleteDocument: async (documentId) => {
    try {
      const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(documentId), {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  // Users
  getUsers: async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  getUser: async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.USER_BY_ID(id), {
        headers: getHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  // Add the missing users CUD operations
  users: {
    create: async (userData) => {
      try {
        const response = await fetch(API_ENDPOINTS.USERS, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(userData),
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    },
    
    update: async (id, updateData) => {
      try {
        const response = await fetch(API_ENDPOINTS.USER_BY_ID(id), {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updateData),
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    },
    
    delete: async (id) => {
      try {
        const response = await fetch(API_ENDPOINTS.USER_BY_ID(id), {
          method: 'DELETE',
          headers: getHeaders(),
        });
        return handleResponse(response);
      } catch (error) {
        return handleError(error);
      }
    }
  },

  // Contact
  sendContact: async (contactData) => {
    try {
      const response = await fetch(API_ENDPOINTS.CONTACT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  // File URL helper
  getFileUrl,
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
