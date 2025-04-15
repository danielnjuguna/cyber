import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/utils/config';

export function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file || !title || !description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('description', description);

    // Add debugging
    console.log('Uploading document:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      title,
      description
    });

    try {
      // Bypass the api utility and use fetch directly for clearer debugging
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('Sending request to:', API_ENDPOINTS.DOCUMENTS);
      console.log('With headers:', headers);
      
      const response = await fetch(API_ENDPOINTS.DOCUMENTS, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      console.log('Response status:', response.status);
      
      let responseData;
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server response was not valid JSON. Check server logs.');
      }
      
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Upload response data:', responseData);
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      navigate(`/documents/${responseData.document.id}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Document</Label>
        <Input
          id="file"
          type="file"
          onChange={handleFileChange}
          required
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.odt,.ods,.odp"
        />
      </div>
      <Button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </form>
  );
} 