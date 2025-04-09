import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Layers, 
  LogOut 
} from 'lucide-react';

const AdminLayout = ({ children, title = "Admin Panel" }) => {
  const { pathname } = useLocation();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                <h2 className="text-2xl font-bold">Admin Panel</h2>
                <div className="flex flex-col space-y-1">
                  <Button 
                    asChild 
                    variant={pathname === "/admin/dashboard" ? "default" : "ghost"} 
                    className="justify-start"
                  >
                    <Link to="/admin/dashboard">
                      <LayoutDashboard className="mr-2 h-5 w-5" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant={pathname === "/admin/services" ? "default" : "ghost"} 
                    className="justify-start"
                  >
                    <Link to="/admin/services">
                      <Layers className="mr-2 h-5 w-5" />
                      Services
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant={pathname === "/admin/documents" ? "default" : "ghost"} 
                    className="justify-start"
                  >
                    <Link to="/admin/documents">
                      <FileText className="mr-2 h-5 w-5" />
                      Documents
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant={pathname === "/admin/users" ? "default" : "ghost"} 
                    className="justify-start"
                  >
                    <Link to="/admin/users">
                      <Users className="mr-2 h-5 w-5" />
                      Users
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-5">
              <h1 className="text-3xl font-bold mb-6">{title}</h1>
              {children}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminLayout; 