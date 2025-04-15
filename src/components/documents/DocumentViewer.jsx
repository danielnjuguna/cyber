import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export function DocumentViewer() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await api.getDocument(documentId);
      setDocument(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.downloadDocument(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  // ... existing code ...
} 