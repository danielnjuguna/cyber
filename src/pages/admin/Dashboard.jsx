import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Layers, Plus, UserPlus } from 'lucide-react';
import { api } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

const AdminDashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    services: 0,
    documents: 0,
    users: 0
  });
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated or not admin/superadmin
  useEffect(() => {
    console.log('Admin Dashboard - Auth Status:', {
      isAuthenticated,
      isLoading,
      userRole: user?.role,
      user
    });

    if (!isLoading && (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      console.log('Redirecting to login - Not authorized for admin dashboard');
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Fetch counts for dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Check if user is authenticated and has a role before fetching
        if (!user || !(user.role === 'admin' || user.role === 'superadmin')) {
          console.log('Dashboard data fetch skipped: User not authorized.');
          setIsLoading(false);
          return; // Skip fetching if not authorized
        }

        // Fetch services
        const servicesResponse = await api.getServices();
        if (servicesResponse.services && Array.isArray(servicesResponse.services)) {
          setServices(servicesResponse.services);
        }

        // Fetch documents
        const documentsResponse = await api.getDocuments();
        if (documentsResponse.documents && Array.isArray(documentsResponse.documents)) {
          setDocuments(documentsResponse.documents);
        }

        // Fetch users (accessible by admin/superadmin)
        const usersResponse = await api.getUsers();
        if (usersResponse.users && Array.isArray(usersResponse.users)) {
          setUsers(usersResponse.users);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only run fetch if user exists and is authenticated
    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]); // Depend on user object to refetch if user data changes

  // Handle opening the respective forms
  const handleOpenDocumentsDialog = () => {
    navigate('/admin/documents');
    setIsDocumentDialogOpen(true);
  };
  
  const handleOpenServicesDialog = () => {
    navigate('/admin/services');
    setIsServiceDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Services</CardTitle>
            <CardDescription>Manage your service offerings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-12 bg-muted rounded"></div>
                <div className="h-4 w-24 bg-muted rounded mt-2"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{services.length}</div>
                <p className="text-sm text-muted-foreground">Active services</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/admin/services">Manage Services</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Documents</CardTitle>
            <CardDescription>Manage your document library</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-12 bg-muted rounded"></div>
                <div className="h-4 w-24 bg-muted rounded mt-2"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{documents.length}</div>
                <p className="text-sm text-muted-foreground">Available documents</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/admin/documents">Manage Documents</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Users</CardTitle>
            <CardDescription>Manage registered users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-12 bg-muted rounded"></div>
                <div className="h-4 w-24 bg-muted rounded mt-2"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{users.length}</div>
                <p className="text-sm text-muted-foreground">Registered users</p>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/admin/users">Manage Users</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start"
              onClick={handleOpenServicesDialog}
            >
              <Layers className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Add New Service</div>
                <div className="text-sm text-muted-foreground">Create a new service offering</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-4 justify-start"
              onClick={handleOpenDocumentsDialog}
            >
              <FileText className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Upload Document</div>
                <div className="text-sm text-muted-foreground">Add a new document to library</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard; 