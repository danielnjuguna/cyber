import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar, Shield, Settings, Lock, Edit, Check, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, isAuthenticated, logout, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFetched, setProfileFetched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Load initial user data from context
    if (user) {
      setUserData(user);
    }
    
    // Fetch fresh user data only once
    const loadProfileData = async () => {
      if (profileFetched) return; // Skip if we've already fetched profile data
      
      setIsLoading(true);
      try {
        const profileData = await fetchProfile();
        if (profileData) {
          setUserData(profileData);
          console.log("Fresh profile data:", profileData);
          setProfileFetched(true); // Mark profile as fetched
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfileData();
  }, [isAuthenticated, user, navigate, profileFetched]); // Removed fetchProfile from dependencies

  if (!userData && isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!userData) {
    return null;
  }

  // Format date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return 'N/A';
    }
  };

  const handlePasswordReset = () => {
    navigate('/forgot-password');
    toast({
      title: "Password Reset",
      description: "You've been redirected to the password reset page",
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast({
      title: "Logged Out",
      description: "You've been successfully logged out",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-16 mt-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            {/* Profile Summary Card */}
            <div className="space-y-6">
              <Card className="overflow-hidden transition-all hover:shadow-md">
                <div className="relative h-32 bg-gradient-to-r from-primary/30 to-primary/10">
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <Avatar className="h-24 w-24 border-4 border-background">
                      <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                        {userData.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <CardContent className="pt-14 pb-4 text-center">
                  <h3 className="text-xl font-semibold mt-2">{userData.email?.split('@')[0] || 'User'}</h3>
                  <p className="text-muted-foreground text-sm">{userData.email || 'No email'}</p>
                  
                  <div className="flex justify-center mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Shield className="h-3 w-3 mr-1" /> Active Account
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center border-t pt-4 pb-4">
                  <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                    Sign Out
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
              {/* Personal Information */}
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Manage your personal details</CardDescription>
                    </div>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm font-medium">Email Address</span>
                      </div>
                      <p className="text-foreground font-medium">{userData.email || 'Not provided'}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm font-medium">Phone Number</span>
                      </div>
                      <p className="text-foreground font-medium">{userData.phone || 'Not provided'}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Member Since</span>
                      </div>
                      <p className="text-foreground font-medium">{formatDate(userData.created_at)}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Account Status</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center text-green-600 font-medium">
                          <Check className="h-4 w-4 mr-1" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>Manage your account security</CardDescription>
                    </div>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Lock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Password</h4>
                          <p className="text-sm text-muted-foreground">Change your account password</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={handlePasswordReset}>
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;