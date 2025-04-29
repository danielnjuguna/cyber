import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { api } from '@/utils/api';
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const AdminUsers = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    role: 'user'
  });
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Define fetchUsers function outside useEffect so it can be reused
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      
      if (response.users && Array.isArray(response.users)) {
        setUsers(response.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again later.',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not authenticated or not admin/superadmin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Fetch users on initial load
  useEffect(() => {
    fetchUsers(); // Call the reusable fetch function
  }, []); // Empty dependency array means this runs once on mount

  // Filter users when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          (user.phone && user.phone.includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  // Check if current user is a superadmin
  const isSuperAdmin = user && user.role === 'superadmin';

  const handleAddUser = async () => {
    try {
      if (!formData.email || !formData.password) {
        toast({
          title: 'Validation Error',
          description: 'Email and password are required',
          variant: 'destructive',
        });
        return;
      }

      console.log('Creating user with data:', { ...formData, password: '******' });
      const response = await api.users.create(formData);
      console.log('Create user response:', response);
      
      toast({
        title: 'Success',
        description: 'User added successfully',
      });
      
      setIsAddUserDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        phone: '',
        role: 'user'
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Don't pre-fill password for security
      phone: user.phone || '',
      role: user.role || 'user'
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) return;
      
      const updateData = { ...formData };
      // Don't send empty password in update
      if (!updateData.password) {
        delete updateData.password;
      }

      console.log('Updating user ID:', selectedUser.id, 'with data:', { ...updateData, password: updateData.password ? '******' : undefined });
      const response = await api.users.update(selectedUser.id, updateData);
      console.log('Update user response:', response);
      
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      
      setIsEditUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const confirmDeleteUser = (user) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;
      
      console.log('Deleting user ID:', selectedUser.id);
      const response = await api.users.delete(selectedUser.id);
      console.log('Delete user response:', response);
      
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout title="User Management">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                onClick={fetchUsers}
                variant="outline"
                size="icon"
                title="Refresh users"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setIsAddUserDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage user accounts and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-2 text-lg font-medium">No users found</p>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Add a user to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'superadmin' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                            : user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                          Active
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => confirmDeleteUser(user)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">The user will use this email to log in</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Min. 8 characters recommended</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone (optional)</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+254712345678"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">User's contact number for support purposes</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Account Role</Label>
              <Select
                value={formData.role}
                onValueChange={handleRoleChange}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {isSuperAdmin && (
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Super Admin</strong>: Can manage all users including admins. <strong>Admin</strong>: Can manage content and regular users. <strong>User</strong>: Limited access.
                {!isSuperAdmin && <span className="block mt-1 text-amber-600 dark:text-amber-400">Note: Only Super Admins can assign Admin or Super Admin roles.</span>}
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsAddUserDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser}
              className="min-w-[100px]"
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit User</DialogTitle>
            <DialogDescription>
              Update the user account details.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Email address used for login</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep current password unchanged
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-medium">Phone (optional)</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  placeholder="+254712345678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Contact number for support purposes</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium">Account Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                  disabled={!isSuperAdmin && (selectedUser?.role === 'admin' || selectedUser?.role === 'superadmin')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    {isSuperAdmin && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </>
                    )}
                    {!isSuperAdmin && (selectedUser?.role === 'admin') && <SelectItem value="admin" disabled>Admin</SelectItem>}
                    {!isSuperAdmin && (selectedUser?.role === 'superadmin') && <SelectItem value="superadmin" disabled>Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  <strong>Super Admin</strong>: Can manage all users including admins. <strong>Admin</strong>: Can manage content and regular users. <strong>User</strong>: Limited access.
                  {!isSuperAdmin && <span className="block mt-1 text-amber-600 dark:text-amber-400">Note: Only Super Admins can change user roles.</span>}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditUserDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              className="min-w-[120px]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <div className="bg-muted/20 p-4 rounded-lg border space-y-2">
                <p className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email:</span> 
                  <span className="font-mono text-sm">{selectedUser.email}</span>
                </p>
                {selectedUser.role && (
                  <p className="flex items-center justify-between">
                    <span className="text-sm font-medium">Role:</span> 
                    <span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        selectedUser.role === 'admin' 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedUser.role}
                      </span>
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              className="min-w-[100px]"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers; 