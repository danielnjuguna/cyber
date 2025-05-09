import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { api, handleApiError } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getFileUrl } from '@/utils/config';
import UploadButtonWrapper from '@/components/ui/UploadButtonWrapper';

const AdminServices = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    long_description: '',
    imageUrl: '',
    imageKey: '',
    displayImageUrl: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState('idle');
  const [newImageUploaded, setNewImageUploaded] = useState(false);

  // Redirect if not authenticated or not admin/superadmin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getServices();
      
      if (response.services && Array.isArray(response.services)) {
        setServices(response.services.map(service => ({
          ...service,
          imageUrl: service.imageUrl || service.image_url || '',
          imageKey: service.imageKey || service.image_key || '',
          displayImageUrl: (service.imageUrl || service.image_url) ? getFileUrl(service.imageUrl || service.image_url) : ''
        })));
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services. Please try again later.',
        variant: 'destructive',
      });
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call fetchServices on component mount
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      long_description: '',
      imageUrl: '',
      imageKey: '',
      displayImageUrl: ''
    });
    setIsEditing(false);
    setImageUploadStatus('idle');
  };

  const handleAddNew = () => {
    resetForm();
    setIsEditing(false);
    setIsDialogOpen(true);
    setNewImageUploaded(false);
  };

  const handleEdit = (service) => {
    const normalizedImageUrl = service.imageUrl ? 
      (service.imageUrl.includes('utfs.io') || service.imageUrl.includes('ufs.sh')) ? 
        `https://utfs.io/f/${service.imageUrl.split('/').pop()}` : 
        getFileUrl(service.imageUrl) : 
      '';
    
    setFormData({
      id: service.id,
      title: service.title,
      description: service.description,
      long_description: service.long_description || '',
      imageUrl: service.imageUrl || '',
      imageKey: service.imageKey || '',
      displayImageUrl: normalizedImageUrl
    });
    setIsEditing(true);
    setIsDialogOpen(true);
    setImageUploadStatus(service.imageUrl ? 'complete' : 'idle');
    setNewImageUploaded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isEditing && !formData.imageUrl) {
       toast({
         title: 'Missing Image',
         description: 'Please upload an image for the service.',
         variant: 'destructive',
       });
       setIsSubmitting(false);
       return;
    }
    
    if (imageUploadStatus === 'uploading') {
        toast({
          title: 'Upload in Progress',
          description: 'Please wait for the image upload to complete.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
     }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        long_description: formData.long_description,
      };

      if (!isEditing || newImageUploaded) { 
        if (!formData.imageUrl) {
          toast({
            title: 'Missing Image',
            description: 'Please upload an image for the service.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        payload.imageUrl = formData.imageUrl;
        payload.imageKey = formData.imageKey;
      }

      console.log('💾 Submitting payload:', payload);

      let response;
      try {
        if (isEditing) {
          console.log(`🔄 Updating service with ID: ${formData.id}`);
          response = await api.updateService(formData.id, payload);
          console.log('✅ Service updated successfully:', response);
          
          toast({ title: 'Success', description: 'Service updated successfully' });
          
          // Update the local state to reflect the changes immediately
          setServices(prevServices => prevServices.map(service => 
            service.id === formData.id 
              ? {
                  ...service,
                  ...payload,
                  // Ensure displayImageUrl is updated for UI rendering
                  displayImageUrl: payload.imageUrl ? getFileUrl(payload.imageUrl) : service.displayImageUrl
                }
              : service
          ));
        } else {
          console.log('➕ Creating new service');
          response = await api.addService(payload);
          console.log('✅ Service created successfully:', response);
          
          toast({ title: 'Success', description: 'Service created successfully' });
          
          if (response.service) {
            // Properly format the new service object with consistent image URL handling
            const newService = {
              ...response.service,
              // Ensure consistent field naming between backend and frontend
              imageUrl: response.service.imageUrl || response.service.image_url || '',
              imageKey: response.service.imageKey || response.service.image_key || '',
              // Critical: Set displayImageUrl for UI rendering
              displayImageUrl: (response.service.imageUrl || response.service.image_url) 
                ? getFileUrl(response.service.imageUrl || response.service.image_url) 
                : ''
            };
            
            console.log('🖼️ New service with image:', {
              originalUrl: response.service.imageUrl || response.service.image_url,
              normalizedDisplayUrl: newService.displayImageUrl
            });
            
            setServices(prevServices => [newService, ...prevServices]);
          }
        }
        
        resetForm();
        setIsDialogOpen(false);
      } catch (apiError) {
        console.error('🔴 API Error:', apiError);
        if (apiError.response) {
          console.error('Response data:', apiError.response.data);
          console.error('Response status:', apiError.response.status);
        }
        throw apiError; // Re-throw to be caught by outer catch block
      }
    } catch (error) {
      console.error('❌ Form submission error:', error.message);
      handleApiError(error, isEditing ? 'Failed to update service' : 'Failed to add service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (service) => {
    setServiceToDelete(service);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    
    try {
      await api.deleteService(serviceToDelete.id);
      
      setServices(prevServices => 
        prevServices.filter(service => service.id !== serviceToDelete.id)
      );
      
      toast({
        title: 'Success',
        description: 'Service deleted successfully',
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setServiceToDelete(null);
      setShowDeleteDialog(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading services...</p>
      </div>
    );
  }

  return (
    <AdminLayout title="Services">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Services</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" /> Add New Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{isEditing ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update the details of the service.' : 'Fill in the details to add a new service.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter service title"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground">A short, descriptive title for your service</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Short Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter a brief description (displayed in service cards)"
                  className="w-full min-h-[80px] resize-y"
                  required
                />
                <p className="text-xs text-muted-foreground">A concise summary (30-100 characters ideal) shown on service cards</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="long_description" className="text-sm font-medium">Full Description</Label>
                <Textarea
                  id="long_description"
                  name="long_description"
                  value={formData.long_description}
                  onChange={handleInputChange}
                  placeholder="Enter a detailed description of the service (displayed when 'Learn More' is clicked)"
                  className="w-full min-h-[150px] resize-y"
                />
                <p className="text-xs text-muted-foreground">A detailed explanation shown when users click "Learn More" on a service</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Service Image</Label>
                <div className="space-y-4">
                  {/* Single Image Preview Section - Shows current or newly uploaded image */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <p className="text-sm font-medium mb-2">
                      {newImageUploaded ? 'New Image:' : (isEditing ? 'Current Image:' : 'Preview:')}
                    </p>
                    <div className="relative overflow-hidden rounded-md border bg-background">
                      {(formData.displayImageUrl) ? (
                        <img
                          src={formData.displayImageUrl}
                          alt="Service Image"
                          className="w-full h-auto max-h-[120px] object-contain rounded"
                          onError={(e) => { 
                            console.error("Image load error:", e);
                            e.target.src = "/placeholder-image.png"; // Fallback to placeholder
                            e.target.onerror = null; // Prevent infinite error loop
                          }}
                        />
                      ) : (
                        <div className="w-full h-[120px] flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
                          No image uploaded yet
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {isEditing && !newImageUploaded 
                        ? "Upload a new image below to replace this one, or leave as is to keep the current image"
                        : "Upload service image below"}
                    </p>
                  </div>
                  
                  <div className="p-4 border border-dashed rounded-lg bg-muted/10 flex flex-col items-center justify-center text-center">
                    <div className="mb-2 text-sm font-medium">
                      {imageUploadStatus === 'uploading' ? 'Uploading...' : 'Upload Service Image'}
                    </div>
                    
                    <UploadButtonWrapper
                      endpoint="imageUploader"
                      buttonText={imageUploadStatus === 'complete' ? 'Replace Image' : 'Select Image'}
                      className="mb-2"
                      onClientUploadComplete={(res) => {
                        if (res && res.length > 0) {
                          console.log("🖼️ Service Image Upload Completed:", res);
                          const oldImageKey = isEditing ? formData.imageKey : null;
                          
                          const uploadedFile = res[0];
                          
                          setFormData(prev => ({
                            ...prev,
                            imageUrl: uploadedFile.url,
                            imageKey: uploadedFile.key,
                            displayImageUrl: uploadedFile.displayUrl || getFileUrl(uploadedFile.url)
                          }));
                          
                          setImageUploadStatus('complete');
                          toast({ title: 'Success', description: 'Image uploaded successfully' });
                          
                          if (oldImageKey && oldImageKey !== uploadedFile.key) {
                            console.log("🗑️ Attempting to delete previous image with key:", oldImageKey);
                            toast({ 
                              title: 'Info', 
                              description: 'Cleaning up previous image...', 
                              variant: 'default' 
                            });
                            
                            const keyToDelete = oldImageKey;
                            
                            const deleteOldImage = (retry = false) => {
                              console.log(`${retry ? '🔄 Retrying' : '🗑️ Starting'} deletion for key: ${keyToDelete}`);
                              
                              api.deleteUploadedFile(keyToDelete)
                                .then(result => {
                                  console.log("🗑️ Old image deletion result:", result);
                                  if (result.success) {
                                    console.log("✅ Old image deleted successfully");
                                    toast({ 
                                      title: 'Success', 
                                      description: 'Previous image cleaned up successfully',
                                      variant: 'default'
                                    });
                                  } else {
                                    console.warn("⚠️ Deletion API returned unsuccessful result:", result);
                                    console.info("💡 Manual cleanup may be needed for file key:", keyToDelete);
                                  }
                                  
                                  setNewImageUploaded(true);
                                })
                                .catch(err => {
                                  console.error("❌ Failed to delete old image:", err);
                                  console.info("💡 Manual cleanup may be needed for file key:", keyToDelete);
                                });
                            };
                            
                            deleteOldImage();
                          } else {
                            setNewImageUploaded(true);
                          }
                        } else {
                          console.error("Image upload failed or response incorrect:", res);
                          setImageUploadStatus('error');
                          toast({ title: 'Upload Error', description: 'Image upload failed.', variant: 'destructive'});
                        }
                      }}
                      onUploadError={(error) => {
                        console.error(`❌ Service Image Upload Error: ${error.message}`);
                        setImageUploadStatus('error');
                        toast({ title: 'Upload Error', description: `Image: ${error.message}`, variant: 'destructive'});
                      }}
                      onUploadBegin={() => {
                        console.log("🚀 Service Image Upload Started");
                        setImageUploadStatus('uploading');
                      }}
                    />
                    
                    {imageUploadStatus === 'uploading' && (
                      <div className="flex items-center text-sm text-blue-500 mt-1">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Uploading image...
                      </div>
                    )}
                    
                    {imageUploadStatus === 'complete' && formData.imageUrl && (
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center text-sm text-green-600">
                          <div className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full">Image Uploaded</div>
                        </div>
                      </div>
                    )}
                    
                    {imageUploadStatus === 'error' && (
                      <div className="text-sm text-red-500 mt-1">
                        Image upload failed. Please try again.
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-3">
                      Recommended: Square image, at least 600x600px. Max size: 10MB.
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || imageUploadStatus === 'uploading'}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    isEditing ? 'Save Changes' : 'Add Service'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Services</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading services...</p>
          ) : services.length === 0 ? (
             <p>No services found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                     <TableCell>
                       {service.displayImageUrl ? (
                         <img
                           src={service.displayImageUrl}
                           alt={service.title}
                           className="h-10 w-10 object-cover rounded"
                           onError={(e) => { 
                             console.error("Service list image load error:", e);
                             e.target.src = "/placeholder-image.png"; 
                             e.target.onerror = null;
                           }}
                         />
                       ) : (
                         <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                       )}
                     </TableCell>
                    <TableCell className="font-medium">{service.title}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell>{formatDate(service.created_at)}</TableCell>
                    <TableCell>{formatDate(service.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                         <AlertDialog open={showDeleteDialog && serviceToDelete?.id === service.id} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
                          <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="icon" onClick={() => confirmDelete(service)}>
                              <Trash className="h-4 w-4" />
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the service "{serviceToDelete?.title}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setServiceToDelete(null)}>Cancel</AlertDialogCancel>
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

export default AdminServices; 