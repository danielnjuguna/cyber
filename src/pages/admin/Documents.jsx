import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Pencil, 
  Trash, 
  Plus,
  Eye,
  Loader2,
} from 'lucide-react';
import { api, handleApiError } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFullUploadThingUrl } from '@/lib/uploadthing';
import UploadButtonWrapper from '@/components/ui/UploadButtonWrapper';

// Helper function to format dates to dd/mm/yyyy
const formatDate = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

const AdminDocuments = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    category: '',
    documentUrl: '',
    documentKey: '',
    thumbnailUrl: '',
    thumbnailKey: '',
    documentType: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categories, setCategories] = useState(['templates', 'legal', 'finance', 'marketing', 'other']);
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentUploadStatus, setDocumentUploadStatus] = useState('idle');
  const [thumbnailUploadStatus, setThumbnailUploadStatus] = useState('idle');

  // Redirect if not authenticated or not admin/superadmin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await api.getDocuments();
        
        if (response.documents && Array.isArray(response.documents)) {
          setDocuments(response.documents.map(doc => ({
            ...doc,
            documentUrl: doc.document_url || '',
            thumbnailUrl: doc.thumbnail_url || ''
          })));
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load documents. Please try again later.',
          variant: 'destructive',
        });
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    if (value === "custom") {
      setShowCustomCategoryInput(true);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      setShowCustomCategoryInput(false);
    }
  };

  const handleCustomCategoryChange = (e) => {
    setCustomCategory(e.target.value);
  };

  const addCustomCategory = () => {
    if (customCategory.trim()) {
      // Normalize the category (lowercase, no spaces)
      const normalizedCategory = customCategory.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Add the new category if it doesn't already exist
      if (!categories.includes(normalizedCategory)) {
        setCategories(prev => [...prev, normalizedCategory]);
        toast({
          title: 'Category Added',
          description: `Added new category: ${normalizedCategory}`,
        });
      }
      
      // Set the form data to use this new category
      setFormData(prev => ({ ...prev, category: normalizedCategory }));
      
      // Reset the custom category input
      setCustomCategory('');
      setShowCustomCategoryInput(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      category: '',
      documentUrl: '',
      documentKey: '',
      thumbnailUrl: '',
      thumbnailKey: '',
      documentType: ''
    });
    setIsEditing(false);
    setDocumentUploadStatus('idle');
    setThumbnailUploadStatus('idle');
    setShowCustomCategoryInput(false);
    setCustomCategory('');
  };

  const handleAddNew = () => {
    resetForm();
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (document) => {
    console.log('📝 Editing document:', document);
    setFormData({
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category || 'other',
      documentUrl: document.document_url || '',
      documentKey: document.document_key || '',
      thumbnailUrl: document.thumbnail_url || '',
      thumbnailKey: document.thumbnail_key || '',
      documentType: document.file_type || ''
    });
    setIsEditing(true);
    setIsDialogOpen(true);
    setDocumentUploadStatus(document.document_url ? 'complete' : 'idle');
    setThumbnailUploadStatus(document.thumbnail_url ? 'complete' : 'idle');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Form submission started');
    setIsSubmitting(true);
    
    if (showCustomCategoryInput && customCategory.trim()) {
      addCustomCategory();
    }

    // Log the state right before validation
    console.log('💾 Checking formData before validation:', formData);
    
    // Ensure file type is captured in formData
    if (!isEditing && (!formData.documentUrl || !formData.thumbnailUrl || !formData.documentType)) {
       toast({
         title: 'Missing Files or Type',
         description: 'Please upload both a document and a thumbnail, and ensure file type was captured.',
         variant: 'destructive',
       });
       console.error('Validation Failed: Missing URL or Type.', { 
           docUrl: formData.documentUrl, 
           thumbUrl: formData.thumbnailUrl, 
           docType: formData.documentType 
       });
       setIsSubmitting(false);
       return;
    }
    
    if (documentUploadStatus === 'uploading' || thumbnailUploadStatus === 'uploading') {
        toast({
          title: 'Upload in Progress',
          description: 'Please wait for the file uploads to complete.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
     }
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        documentUrl: formData.documentUrl,
        documentKey: formData.documentKey,
        documentType: formData.documentType,
        thumbnailUrl: formData.thumbnailUrl,
        thumbnailKey: formData.thumbnailKey,
      };

      console.log('💾 Submitting payload:', payload);

      let response;
      if (isEditing) {
        const updatePayload = { ...payload };
        delete updatePayload.documentType;
        response = await api.updateDocument(formData.id, updatePayload);
        setDocuments(prev => prev.map(doc =>
          doc.id === formData.id ? { ...doc, ...payload, updated_at: new Date().toISOString() } : doc
        ));
        toast({ title: 'Success', description: 'Document updated successfully!' });
      } else {
        response = await api.addDocument(payload);
        const newDocument = {
           ...response.document,
           documentUrl: response.document?.document_url || payload.documentUrl,
           thumbnailUrl: response.document?.thumbnail_url || payload.thumbnailUrl,
           file_type: response.document?.file_type || payload.documentType
         };
        setDocuments(prev => [newDocument, ...prev]);
        toast({ title: 'Success', description: 'Document added successfully!' });
      }

      console.log('✅ API Response:', response);

      resetForm();
      setIsDialogOpen(false);

    } catch (error) {
      console.error('❌ Form submission error:', error);
      handleApiError(error, isEditing ? 'Failed to update document' : 'Failed to add document');
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Form submission finished');
    }
  };

  const confirmDelete = (document) => {
    setDocumentToDelete(document);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      await api.documents.delete(documentToDelete.id);
      
      setDocuments(prevDocuments => 
        prevDocuments.filter(doc => doc.id !== documentToDelete.id)
      );
      
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setDocumentToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading documents...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Documents</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" /> Add New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Document' : 'Add New Document'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the details of the document.' : 'Fill in the details to add a new document.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={4}
                />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <div className="col-span-3 flex flex-col gap-2">
                  <Select
                    name="category"
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange('category', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Standard Categories</SelectLabel>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value="custom">Add Custom Category...</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                   {showCustomCategoryInput && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="Enter new category name"
                        value={customCategory}
                        onChange={handleCustomCategoryChange}
                        className="flex-grow"
                      />
                      <Button type="button" onClick={addCustomCategory} size="sm">Add</Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Document File</Label>
                <div className="col-span-3">
                  <UploadButtonWrapper
                    endpoint="documentUploader"
                    buttonText="Upload Document"
                    onClientUploadComplete={(res) => {
                      if (res && res.length > 0 && res[0].serverData) {
                        console.log("📄 Document Upload Completed:", res);
                        setFormData(prev => ({
                          ...prev,
                          documentUrl: res[0].url,
                          documentKey: res[0].key,
                          documentType: res[0].serverData.type
                        }));
                        setDocumentUploadStatus('complete');
                        toast({ title: 'Success', description: 'Document uploaded.' });
                      } else {
                         console.error("Document upload failed or response format incorrect:", res);
                         setDocumentUploadStatus('error');
                         toast({ title: 'Upload Error', description: 'Document upload response missing expected data.', variant: 'destructive'});
                      }
                    }}
                    onUploadError={(error) => {
                      console.error(`❌ Document Upload Error: ${error.message}`);
                      setDocumentUploadStatus('error');
                      toast({ title: 'Upload Error', description: `Document: ${error.message}`, variant: 'destructive'});
                    }}
                    onUploadBegin={() => {
                       console.log("🚀 Document Upload Started");
                       setDocumentUploadStatus('uploading');
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">You can upload any type of file (max size: 30MB)</p>
                  {documentUploadStatus === 'uploading' && <p className="text-sm text-blue-500 mt-1">Uploading document...</p>}
                  {documentUploadStatus === 'complete' && formData.documentUrl && (
                    <p className="text-sm text-green-600 mt-1">
                      Document uploaded: <a href={formData.documentUrl} target="_blank" rel="noopener noreferrer" className="underline">{formData.documentUrl.split('/').pop()}</a>
                    </p>
                  )}
                   {documentUploadStatus === 'error' && <p className="text-sm text-red-500 mt-1">Document upload failed.</p>}
                   {isEditing && formData.documentUrl && documentUploadStatus !== 'uploading' && (
                     <p className="text-sm text-gray-500 mt-1">
                       Current: <a href={formData.documentUrl} target="_blank" rel="noopener noreferrer" className="underline">{formData.documentUrl.split('/').pop()}</a>. Upload new to replace.
                     </p>
                   )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Thumbnail Image</Label>
                <div className="col-span-3">
                   {isEditing && formData.thumbnailUrl && thumbnailUploadStatus !== 'uploading' && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">Current Thumbnail:</p>
                      <img
                        src={formData.thumbnailUrl}
                        alt="Current Thumbnail"
                        className="h-20 w-auto rounded border"
                      />
                    </div>
                   )}
                  <UploadButtonWrapper
                    endpoint="imageUploader"
                    buttonText="Upload Thumbnail"
                    onClientUploadComplete={(res) => {
                       if (res && res.length > 0) {
                        console.log("🖼️ Thumbnail Upload Completed:", res);
                        setFormData(prev => ({
                          ...prev,
                          thumbnailUrl: res[0].url,
                          thumbnailKey: res[0].key,
                        }));
                        setThumbnailUploadStatus('complete');
                        toast({ title: 'Success', description: 'Thumbnail uploaded.' });
                       } else {
                         console.error("Thumbnail upload failed or response format incorrect:", res);
                         setThumbnailUploadStatus('error');
                         toast({ title: 'Upload Error', description: 'Thumbnail upload failed.', variant: 'destructive'});
                       }
                    }}
                    onUploadError={(error) => {
                      console.error(`❌ Thumbnail Upload Error: ${error.message}`);
                      setThumbnailUploadStatus('error');
                      toast({ title: 'Upload Error', description: `Thumbnail: ${error.message}`, variant: 'destructive'});
                    }}
                     onUploadBegin={() => {
                       console.log("🚀 Thumbnail Upload Started");
                       setThumbnailUploadStatus('uploading');
                     }}
                  />
                   {thumbnailUploadStatus === 'uploading' && <p className="text-sm text-blue-500 mt-1">Uploading thumbnail...</p>}
                   {thumbnailUploadStatus === 'complete' && formData.thumbnailUrl && (
                     <p className="text-sm text-green-600 mt-1">
                       Thumbnail updated: <a href={formData.thumbnailUrl} target="_blank" rel="noopener noreferrer" className="underline">{formData.thumbnailUrl.split('/').pop()}</a>
                     </p>
                   )}
                   {thumbnailUploadStatus === 'error' && <p className="text-sm text-red-500 mt-1">Thumbnail upload failed.</p>}
                   {isEditing && formData.thumbnailUrl && thumbnailUploadStatus !== 'uploading' && (
                     <p className="text-sm text-gray-500 mt-1">Upload new image to replace.</p>
                   )}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || documentUploadStatus === 'uploading' || thumbnailUploadStatus === 'uploading'}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    isEditing ? 'Save Changes' : 'Add Document'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading documents...</p>
          ) : documents.length === 0 ? (
             <p>No documents found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {doc.thumbnailUrl ? (
                        <img
                          src={doc.thumbnailUrl}
                          alt={doc.title}
                          className="h-10 w-10 object-cover rounded"
                           onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{doc.category || 'N/A'}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell>{formatDate(doc.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                       {doc.documentUrl && (
                        <Link to={`/documents/${doc.id}`} target="_blank">
                          <Button variant="outline" size="icon">
                              <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                       )}
                        <Button variant="outline" size="icon" onClick={() => handleEdit(doc)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={showDeleteDialog && documentToDelete?.id === doc.id} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
                          <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="icon" onClick={() => confirmDelete(doc)}>
                              <Trash className="h-4 w-4" />
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the document "{documentToDelete?.title}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
                                {isSubmitting ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDocuments; 