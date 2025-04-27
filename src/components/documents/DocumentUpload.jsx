import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UploadButtonWrapper from '@/components/ui/UploadButtonWrapper';
import { Loader2 } from 'lucide-react';

export function DocumentUpload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentUploadStatus, setDocumentUploadStatus] = useState('idle');
  const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState('idle');
  const [documentData, setDocumentData] = useState({ url: '', key: '' });
  const [thumbnailData, setThumbnailData] = useState({ url: '', key: '' });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = ['templates', 'legal', 'finance', 'marketing', 'other'];

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate form fields
    if (!title || !description || !category) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate document and thumbnail uploads
    if (!documentData.url || !documentData.key) {
      toast({
        title: 'Error',
        description: 'Please upload a document',
        variant: 'destructive',
      });
      return;
    }

    if (!thumbnailData.url || !thumbnailData.key) {
      toast({
        title: 'Error',
        description: 'Please upload a thumbnail image',
        variant: 'destructive',
      });
      return;
    }

    // Check if uploads are still in progress
    if (documentUploadStatus === 'uploading' || thumbnailUploadStatus === 'uploading') {
      toast({
        title: 'Upload in Progress',
        description: 'Please wait for all uploads to complete',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting document data:', {
        title,
        description,
        category,
        documentUrl: documentData.url,
        documentKey: documentData.key,
        thumbnailUrl: thumbnailData.url,
        thumbnailKey: thumbnailData.key,
      });

      // Use the API to create the document with UploadThing URLs and keys
      const response = await api.addDocument({
        title,
        description,
        category,
        documentUrl: documentData.url,
        documentKey: documentData.key,
        thumbnailUrl: thumbnailData.url,
        thumbnailKey: thumbnailData.key,
      });

      console.log('Document created successfully:', response);
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      // Navigate to the document view page
      if (response && response.document && response.document.id) {
        navigate(`/documents/${response.document.id}`);
      } else {
        navigate('/documents');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Document</Label>
        <div className="flex flex-col gap-2">
          <UploadButtonWrapper
            endpoint="documentUploader"
            buttonText="Upload Document"
            onClientUploadComplete={(res) => {
              if (res && res.length > 0) {
                console.log("Document Upload Completed:", res);
                setDocumentData({
                  url: res[0].url,
                  key: res[0].key,
                });
                setDocumentUploadStatus('complete');
                toast({
                  title: 'Success',
                  description: 'Document uploaded successfully',
                });
              }
            }}
            onUploadError={(error) => {
              console.error('Document Upload Error:', error);
              setDocumentUploadStatus('error');
              toast({
                title: 'Upload Error',
                description: error.message || 'Failed to upload document',
                variant: 'destructive',
              });
            }}
            onUploadBegin={() => {
              setDocumentUploadStatus('uploading');
            }}
          />
          {documentUploadStatus === 'uploading' && (
            <p className="text-sm text-blue-500">Uploading document...</p>
          )}
          {documentUploadStatus === 'complete' && (
            <p className="text-sm text-green-600">
              Document uploaded: {documentData.url.split('/').pop()}
            </p>
          )}
          {documentUploadStatus === 'error' && (
            <p className="text-sm text-red-500">Document upload failed.</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Thumbnail</Label>
        <div className="flex flex-col gap-2">
          <UploadButtonWrapper
            endpoint="imageUploader"
            buttonText="Upload Thumbnail"
            onClientUploadComplete={(res) => {
              if (res && res.length > 0) {
                console.log("Thumbnail Upload Completed:", res);
                setThumbnailData({
                  url: res[0].url,
                  key: res[0].key,
                });
                setThumbnailUploadStatus('complete');
                toast({
                  title: 'Success',
                  description: 'Thumbnail uploaded successfully',
                });
              }
            }}
            onUploadError={(error) => {
              console.error('Thumbnail Upload Error:', error);
              setThumbnailUploadStatus('error');
              toast({
                title: 'Upload Error',
                description: error.message || 'Failed to upload thumbnail',
                variant: 'destructive',
              });
            }}
            onUploadBegin={() => {
              setThumbnailUploadStatus('uploading');
            }}
          />
          {thumbnailUploadStatus === 'uploading' && (
            <p className="text-sm text-blue-500">Uploading thumbnail...</p>
          )}
          {thumbnailUploadStatus === 'complete' && (
            <div className="mt-2">
              <p className="text-sm text-green-600 mb-1">Thumbnail uploaded successfully</p>
              <img 
                src={thumbnailData.url} 
                alt="Thumbnail preview" 
                className="h-20 w-auto object-contain border rounded" 
              />
            </div>
          )}
          {thumbnailUploadStatus === 'error' && (
            <p className="text-sm text-red-500">Thumbnail upload failed.</p>
          )}
        </div>
      </div>
      
      <Button 
        type="submit" 
        disabled={isSubmitting || documentUploadStatus === 'uploading' || thumbnailUploadStatus === 'uploading'}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          'Upload Document'
        )}
      </Button>
    </form>
  );
} 