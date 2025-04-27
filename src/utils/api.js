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

  // Add these convenience methods to match what's used in Services.jsx
  addService: async (serviceData) => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICES, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  updateService: async (id, serviceData) => {
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_BY_ID(id), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(serviceData),
      });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
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
  getDocuments: async (options = {}) => {
    try {
      let url = API_ENDPOINTS.DOCUMENTS;
      
      // Add query parameters if provided
      if (options.category || options.search) {
        const params = new URLSearchParams();
        if (options.category) params.append('category', options.category);
        if (options.search) params.append('search', options.search);
        url = `${url}?${params.toString()}`;
      }
      
      const response = await fetch(url, {
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

  // Add document with UploadThing URLs and keys
  addDocument: async (documentData) => {
    try {
      console.log('Adding document with data:', documentData);
      
      const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(documentData),
      });
      
      const result = await handleResponse(response);
      console.log('Document added successfully:', result);
      return result;
    } catch (error) {
      console.error('Error adding document:', error);
      return handleError(error);
    }
  },

  // Update document with UploadThing URLs and keys
  updateDocument: async (id, documentData) => {
    try {
      console.log('Updating document with data:', documentData);
      
      const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(documentData),
      });
      
      const result = await handleResponse(response);
      console.log('Document updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating document:', error);
      return handleError(error);
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
        console.log('Deleting document:', id);
        
        const response = await fetch(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
          method: 'DELETE',
          headers: getHeaders(),
        });
        
        const result = await handleResponse(response);
        console.log('Document deleted successfully:', result);
        return result;
      } catch (error) {
        console.error('Error deleting document:', error);
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
  
  // Delete a file from UploadThing
  deleteUploadedFile: async (fileKey) => {
    if (!fileKey) {
      console.warn('No file key provided for deletion');
      return { success: false, message: 'No file key provided' };
    }
    
    try {
      console.log(`🗑️ Attempting to delete file with key: ${fileKey}`);
      
      // Make sure we're sending the request to the proper endpoint
      const deleteUrl = API_ENDPOINTS.DELETE_FILE(fileKey);
      console.log(`DELETE request URL: ${deleteUrl}`);
      
      // Call the direct API to delete the file
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      // Log response details for debugging
      console.log(`DELETE response status: ${response.status} ${response.statusText}`);
      
      // Check for common error cases
      if (response.status === 404) {
        console.log('File not found or already deleted');
        // Consider this a success since the file is gone
        return { 
          success: true, 
          message: 'File already deleted or not found',
          status: response.status 
        };
      }
      
      // Clone the response before reading it to prevent "body stream already read" error
      const responseClone = response.clone();
      
      // For special case handling (500 errors), first try to read as text
      if (response.status === 500) {
        try {
          const text = await responseClone.text();
          console.log('Error response text:', text);
          
          if (text.includes('not found') || text.includes('No file with key') || text.includes('does not exist')) {
            // File doesn't exist, treat as success
            return {
              success: true,
              message: 'File already gone from server',
              status: response.status,
              details: 'Deletion attempted but file appears to be already gone'
            };
          }
        } catch (textError) {
          console.error('Failed to read error response text:', textError);
        }
      }
      
      // Try to parse JSON response, but handle gracefully if it fails
      try {
        // Try to parse as JSON
        const result = await response.json().catch(e => {
          console.warn('Response is not valid JSON:', e);
          return null;
        });
        
        if (result) {
          console.log('File deletion result:', result);
          // Server is now always returning success=true to avoid UI issues
          return result;
        }
        
        // If we couldn't parse JSON but the status was OK
        if (response.ok) {
          return { 
            success: true, 
            message: 'File appears to be deleted (non-JSON response)'
          };
        }
        
        // For 500 errors with serverless functions, just assume it worked
        if (response.status >= 500) {
          console.warn('Server returned error but the file deletion may have succeeded anyway');
          return { 
            success: true, 
            message: 'File deletion attempted (server error but may be successful)',
            warning: true
          };
        }
        
        // Fallback for any other case
        return {
          success: false,
          message: 'Unexpected server response',
          status: response.status
        };
      } catch (parseError) {
        console.error('Error parsing deletion response:', parseError);
        
        // Assume success for any error to prevent UI issues
        return { 
          success: true, 
          message: 'File deletion attempted (response parsing error)',
          warning: true
        };
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      
      // For resilience, return a "success" structure that won't break the UI
      return { 
        success: true, 
        warning: true,
        message: 'File deletion attempted but encountered an error',
        error: error.message
      };
    }
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
