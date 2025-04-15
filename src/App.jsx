import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { lazy, Suspense } from "react";
import NotFound from "./pages/NotFound";

// Lazy loaded components
const Documents = lazy(() => import("./pages/Documents"));
const Services = lazy(() => import("./pages/Services"));
const Contact = lazy(() => import("./pages/Contact"));
const DocumentView = lazy(() => import("./pages/DocumentView"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Index = lazy(() => import("./pages/Index"));

// Admin lazy imports
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminDocuments = lazy(() => import("./pages/admin/Documents"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <Suspense fallback={<PageLoader />}>
                <Index />
              </Suspense>
            } />
            <Route path="/documents" element={
              <Suspense fallback={<PageLoader />}>
                <Documents />
              </Suspense>
            } />
            <Route path="/services" element={
              <Suspense fallback={<PageLoader />}>
                <Services />
              </Suspense>
            } />
            <Route path="/contact" element={
              <Suspense fallback={<PageLoader />}>
                <Contact />
              </Suspense>
            } />
            <Route path="/documents/:id" element={
              <Suspense fallback={<PageLoader />}>
                <DocumentView />
              </Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            } />
            <Route path="/signup" element={
              <Suspense fallback={<PageLoader />}>
                <Signup />
              </Suspense>
            } />
            <Route path="/profile" element={
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
            } />
            <Route path="/forgot-password" element={
              <Suspense fallback={<PageLoader />}>
                <ForgotPassword />
              </Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<PageLoader />}>
                <ResetPassword />
              </Suspense>
            } />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            } />
            <Route path="/admin/services" element={
              <Suspense fallback={<PageLoader />}>
                <AdminServices />
              </Suspense>
            } />
            <Route path="/admin/documents" element={
              <Suspense fallback={<PageLoader />}>
                <AdminDocuments />
              </Suspense>
            } />
            <Route path="/admin/users" element={
              <Suspense fallback={<PageLoader />}>
                <AdminUsers />
              </Suspense>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
