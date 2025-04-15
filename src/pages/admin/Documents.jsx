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
  DialogTrigger 
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
import { getFileUrl } from '@/utils/config';

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
    document: null,
    thumbnail: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categories, setCategories] = useState(['templates', 'legal', 'finance', 'marketing', 'other']);
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
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
          setDocuments(response.documents);
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

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    // Log file selection details
    console.log(`🔍 File selected for ${name}:`, files.length ? {
      name: files[0].name,
      type: files[0].type,
      size: `${(files[0].size / 1024).toFixed(2)} KB`,
      lastModified: new Date(files[0].lastModified).toISOString()
    } : 'No file selected');
    
    setFormData(prev => ({ ...prev, [name]: files[0] }));
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      category: '',
      document: null,
      thumbnail: null
    });
    setIsEditing(false);
  };

  const handleEdit = (document) => {
    console.log('📝 Editing document:', document);
    setFormData({
      id: document.id,
      title: document.title,
      description: document.description,
      category: document.category || 'other',
      document: null,
      thumbnail: null
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Form submission started');
    setIsSubmitting(true);
    
    // If we have a custom category pending, add it first
    if (showCustomCategoryInput && customCategory.trim()) {
      addCustomCategory();
    }
    
    try {
      // Log current form data
      console.log('📋 Form data at submission:', {
        id: formData.id,
        title: formData.title,
        description: formData.description?.substring(0, 50) + (formData.description?.length > 50 ? '...' : ''),
        category: formData.category,
        hasDocument: !!formData.document,
        hasThumbnail: !!formData.thumbnail,
        isEditing: isEditing
      });
      
      if (formData.document) {
        console.log('📄 Document file details:', {
          name: formData.document.name,
          type: formData.document.type,
          size: `${(formData.document.size / 1024).toFixed(2)} KB`,
          lastModified: new Date(formData.document.lastModified).toISOString()
        });
      }
      
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('description', formData.description);
      formPayload.append('category', formData.category);
      
      if (formData.document) {
        console.log('📎 Appending document file to FormData');
        formPayload.append('document', formData.document);
      } else {
        console.log(isEditing ? 
          '⚠️ No document file provided for update' : 
          '❌ No document file provided for new upload');
      }
      
      if (formData.thumbnail) {
        console.log('📎 Appending thumbnail file to FormData');
        formPayload.append('thumbnail', formData.thumbnail);
      }
      
      // Log all FormData entries
      console.log('🔍 FormData contents:');
      for (let pair of formPayload.entries()) {
        const value = pair[1] instanceof File 
          ? `File: ${pair[1].name} (${pair[1].type}, ${(pair[1].size / 1024).toFixed(2)} KB)` 
          : pair[1];
        console.log(`- ${pair[0]}: ${value}`);
      }

      let response;
      if (isEditing) {
        console.log(`🔄 Updating document with ID: ${formData.id}`);
        response = await api.documents.update(formData.id, formPayload);
        console.log('✅ Document update response:', response);
        toast({
          title: 'Success',
          description: 'Document updated successfully',
        });
        
        // Update documents list
        setDocuments(prevDocuments => 
          prevDocuments.map(doc => 
            doc.id === formData.id ? { ...doc, ...response.document } : doc
          )
        );
      } else {
        if (!formData.document) {
          console.error('❌ Document file is required for new uploads');
          throw new Error('Document file is required');
        }
        
        console.log('🔄 Creating new document');
        response = await api.documents.create(formPayload);
        console.log('✅ Document creation response:', response);
        toast({
          title: 'Success',
          description: 'Document created successfully',
        });
        
        // Add new document to list with properly formatted date
        const newDocument = {
          ...response.document,
          created_at: new Date().toISOString() // Ensure we have a valid date
        };
        setDocuments(prevDocuments => [...prevDocuments, newDocument]);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
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
      
      // Remove from documents list
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
    <AdminLayout title="Manage Documents">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents Library</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsEditing(false); }}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Document' : 'Upload New Document'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Update document details below.' : 'Fill in the details to upload a new document.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      name="title" 
                      value={formData.title} 
                      onChange={handleInputChange} 
                      required 
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleInputChange} 
                      required 
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleSelectChange('category', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Existing Categories</SelectLabel>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectItem value="custom" className="text-primary font-medium">
                          + Add custom category
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {showCustomCategoryInput && (
                      <div className="mt-2 grid grid-cols-[1fr,auto] gap-2">
                        <Input
                          placeholder="Enter new category name"
                          value={customCategory}
                          onChange={handleCustomCategoryChange}
                          disabled={isSubmitting}
                        />
                        <Button 
                          type="button" 
                          size="sm"
                          onClick={addCustomCategory}
                          disabled={!customCategory.trim() || isSubmitting}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="document">Document File {!isEditing && <span className="text-sm text-muted-foreground">(Required for new uploads)</span>}</Label>
                    <Input 
                      id="document" 
                      name="document" 
                      type="file" 
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.odt,.ods,.odp" 
                      onChange={handleFileChange} 
                      required={!isEditing}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">
                      The document will be displayed directly in the preview with a blur effect on a portion of the content. 
                      Supported formats include PDF, Office documents (DOC, DOCX, PPT, PPTX, XLS, XLSX), 
                      images (JPG, PNG, GIF), text files (TXT), and OpenDocument formats.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
                    <Input 
                      id="thumbnail" 
                      name="thumbnail" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      isEditing ? 'Update Document' : 'Upload Document'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.id}</TableCell>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>{doc.category || 'Uncategorized'}</TableCell>
                    <TableCell>{formatDate(doc.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-1" onClick={() => {
                        const downloadUrl = getFileUrl(doc.document_path);
                        window.open(downloadUrl, '_blank');
                      }}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(doc)} className="mr-1">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirmDelete(doc)} className="text-destructive">
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No documents found. Upload your first document!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document "{documentToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminDocuments; 