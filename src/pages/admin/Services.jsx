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
  Loader2,
} from 'lucide-react';
import { api, handleApiError } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
    image: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await api.getServices();
        
        if (response.services && Array.isArray(response.services)) {
          setServices(response.services);
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
    };

    fetchServices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      long_description: '',
      image: null
    });
    setIsEditing(false);
  };

  const handleEdit = (service) => {
    setFormData({
      id: service.id,
      title: service.title,
      description: service.description,
      long_description: service.long_description || '',
      image: null
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('title', formData.title);
      formPayload.append('description', formData.description);
      formPayload.append('long_description', formData.long_description);
      if (formData.image) {
        formPayload.append('image', formData.image);
      }

      let response;
      if (isEditing) {
        response = await api.services.update(formData.id, formPayload);
        toast({
          title: 'Success',
          description: 'Service updated successfully',
        });
        
        // Update services list
        setServices(prevServices => 
          prevServices.map(service => 
            service.id === formData.id ? { ...service, ...response.service } : service
          )
        );
      } else {
        response = await api.services.create(formPayload);
        toast({
          title: 'Success',
          description: 'Service created successfully',
        });
        
        // Add new service to list with properly formatted date
        const newService = {
          ...response.service,
          created_at: new Date().toISOString() // Ensure we have a valid date
        };
        setServices(prevServices => [...prevServices, newService]);
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      handleApiError(error);
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
      await api.services.delete(serviceToDelete.id);
      
      // Remove from services list
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
    <AdminLayout title="Manage Services">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services List</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsEditing(false); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Service' : 'Add New Service'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Update service details below.' : 'Fill in the details to create a new service.'}
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="long_description">Full Description</Label>
                    <Textarea 
                      id="long_description" 
                      name="long_description" 
                      value={formData.long_description} 
                      onChange={handleInputChange} 
                      rows={5}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="image">Image {!isEditing && <span className="text-sm text-muted-foreground">(Required for new services)</span>}</Label>
                    <Input 
                      id="image" 
                      name="image" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      required={!isEditing}
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
                      isEditing ? 'Update Service' : 'Create Service'
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
              <p>Loading services...</p>
            </div>
          ) : services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.id}</TableCell>
                    <TableCell>{service.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                    <TableCell>{formatDate(service.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(service)} className="mr-1">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => confirmDelete(service)} className="text-destructive">
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
              <p className="text-muted-foreground">No services found. Add your first service!</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the service "{serviceToDelete?.title}". This action cannot be undone.
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

export default AdminServices; 