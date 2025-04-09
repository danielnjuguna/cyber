import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const routes = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Documents', path: '/documents' },
    { name: 'Contact', path: '/contact' },
  ];

  const handleLogout = () => {
    logout();
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all-ease",
        isScrolled ? "py-3 glass-morphism" : "py-5 bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link 
          to="/" 
          className="text-2xl font-display font-bold text-foreground flex items-center"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700">CyberDocs</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {routes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={cn(
                "relative text-sm font-medium transition-all-ease hover:text-primary focus-ring",
                location.pathname === route.path 
                  ? "text-primary" 
                  : "text-foreground/80 hover:text-foreground"
              )}
            >
              {route.name}
              {location.pathname === route.path && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-primary animate-fade-in" />
              )}
            </Link>
          ))}
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                {user && user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/signup">
              <Button size="sm" className="ml-4 bg-primary hover:bg-primary/90 transition-all-ease">
                Get Started
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-foreground p-2 focus-ring"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass-morphism animate-fade-in-down">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {routes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={cn(
                  "py-2 text-base font-medium transition-all-ease",
                  location.pathname === route.path 
                    ? "text-primary" 
                    : "text-foreground/80 hover:text-primary"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {route.name}
              </Link>
            ))}
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className="py-2 text-base font-medium text-foreground/80 hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="inline-block mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
                {user && user.role === 'admin' && (
                  <Link 
                    to="/admin/dashboard" 
                    className="py-2 text-base font-medium text-foreground/80 hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="inline-block mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <Button 
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full mt-2"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full mt-2">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
