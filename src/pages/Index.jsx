import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '@/components/Hero';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import DocumentPreview from '@/components/DocumentPreview';
import { setupScrollAnimations } from '@/utils/animations';
import { FileText, FileImage, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getFileUrl } from '@/utils/config';

// Fallback services if API call fails
const fallbackServices = [
  {
    id: 'service-1',
    title: 'Document Services',
    description: 'High-quality documents tailored to your specific needs with professional formatting and content.',
    icon: <FileText className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-2',
    title: 'Image Processing',
    description: 'Professional image editing, optimization, and enhancement for all your digital content needs.',
    icon: <FileImage className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-3',
    title: 'Email Notifications',
    description: 'Stay updated with real-time notifications about document status and delivery.',
    icon: <Mail className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-4',
    title: 'Secure Delivery',
    description: 'Encrypted document delivery to ensure your sensitive information remains protected.',
    icon: <ShieldCheck className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=2070&auto=format&fit=crop'
  }
];

// Fallback documents if API call fails
const fallbackDocuments = [
  {
    id: 'doc-001',
    title: 'Professional Resume Template',
    description: 'A clean, modern resume template designed for professionals seeking new opportunities.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop',
    previewUrl: '/samples/resume-preview.pdf'
  },
  {
    id: 'doc-002',
    title: 'Business Proposal Template',
    description: 'Comprehensive business proposal template to help you win new clients and projects.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop',
    previewUrl: '/samples/proposal-preview.pdf'
  },
  {
    id: 'doc-003',
    title: 'Legal Document Bundle',
    description: 'Essential legal documents for small businesses, including contracts and agreements.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2042&auto=format&fit=crop',
    previewUrl: '/samples/legal-preview.pdf'
  }
];

// Helper function to get service icon based on title
const getServiceIcon = (title) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('document') || titleLower.includes('template')) return <FileText className="h-6 w-6" />;
  if (titleLower.includes('image') || titleLower.includes('photo')) return <FileImage className="h-6 w-6" />;
  if (titleLower.includes('email') || titleLower.includes('notification')) return <Mail className="h-6 w-6" />;
  if (titleLower.includes('secure') || titleLower.includes('protect')) return <ShieldCheck className="h-6 w-6" />;
  return <FileText className="h-6 w-6" />;
};

const Index = () => {
  const [services, setServices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const cleanup = setupScrollAnimations();
    return cleanup;
  }, []);

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setServicesLoading(true);
        const response = await api.getServices();
        
        if (response.services && Array.isArray(response.services)) {
          // Transform API response to match component expectations
          const transformedServices = response.services.map(service => ({
            id: service.id,
            title: service.title,
            description: service.description,
            icon: getServiceIcon(service.title),
            imageUrl: service.image_path 
              ? getFileUrl(service.image_path) 
              : null
          }));
          
          // Limit to 4 services for the homepage
          const limitedServices = transformedServices.slice(0, 4);
          setServices(limitedServices);
        } else {
          // Use fallback services if API doesn't return expected data
          setServices(fallbackServices);
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
        toast({
          title: 'Error',
          description: 'Failed to load services. Using default data.',
          variant: 'destructive',
        });
        setServices(fallbackServices);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch documents from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setDocumentsLoading(true);
        const response = await api.getDocuments();
        
        if (response.documents && Array.isArray(response.documents)) {
          // Transform API response to match component expectations
          const transformedDocuments = response.documents.map(document => ({
            id: document.id,
            title: document.title,
            description: document.description,
            thumbnailUrl: document.thumbnail_path 
              ? getFileUrl(document.thumbnail_path) 
              : 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop',
            previewUrl: document.document_path
              ? getFileUrl(document.document_path)
              : null
          }));
          
          // Limit to 3 documents for the featured section
          const limitedDocuments = transformedDocuments.slice(0, 3);
          setDocuments(limitedDocuments);
        } else {
          // Use fallback documents if API doesn't return expected data
          setDocuments(fallbackDocuments);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load documents. Using default data.',
          variant: 'destructive',
        });
        setDocuments(fallbackDocuments);
      } finally {
        setDocumentsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero />
        
        {/* Services Section */}
        <section className="py-20 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12 reveal">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Our Services</h2>
              <p className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto">
                We provide comprehensive document solutions to meet your digital needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
              {servicesLoading ? (
                // Loading skeleton
                Array(4).fill(0).map((_, index) => (
                  <div key={index} className="glass-card rounded-xl h-64 animate-pulse bg-muted/50"></div>
                ))
              ) : (
                services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    title={service.title}
                    description={service.description}
                    icon={service.icon}
                    imageUrl={service.imageUrl}
                  />
                ))
              )}
            </div>
            
            {/* Only show "View All Services" button if we have more than one service */}
            {!servicesLoading && services.length > 1 && (
              <div className="flex justify-center mt-8 reveal">
                <Link to="/services">
                  <Button variant="outline" className="transition-all-ease">
                    View All Services
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
        
        {/* Featured Documents Section */}
        <section className="py-20 bg-secondary">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 reveal">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Featured Documents</h2>
                <p className="mt-4 text-xl text-muted-foreground max-w-2xl">
                  Browse our selection of premium documents with secure previews
                </p>
              </div>
              
              {/* Only show "View All Documents" button if we have more than one document */}
              {!documentsLoading && documents.length > 1 && (
                <Link to="/documents">
                  <Button variant="outline" className="mt-4 md:mt-0 transition-all-ease">
                    View All Documents
                  </Button>
                </Link>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal">
              {documentsLoading ? (
                // Loading skeleton
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="glass-card rounded-xl h-80 animate-pulse bg-muted/50"></div>
                ))
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <DocumentPreview
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    description={doc.description}
                    thumbnailUrl={doc.thumbnailUrl}
                    previewUrl={doc.previewUrl}
                  />
                ))
              ) : (
                // If no documents are found, show fallback
                fallbackDocuments.map((doc) => (
                  <DocumentPreview
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    description={doc.description}
                    thumbnailUrl={doc.thumbnailUrl}
                    previewUrl={doc.previewUrl}
                  />
                ))
              )}
            </div>
          </div>
        </section>
        
        {/* CTA Section - Only show if user is not authenticated */}
        {!isAuthenticated && (
          <section className="py-20">
            <div className="container px-4 md:px-6 mx-auto">
              <div className="glass-morphism rounded-2xl p-8 md:p-12 reveal">
                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                    Ready to get started?
                  </h2>
                  <p className="text-xl text-muted-foreground mb-8">
                    Join us today and discover our premium document services
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/signup">
                      <Button size="lg" className="bg-primary hover:bg-primary/90 transition-all-ease">
                        Create an Account
                      </Button>
                    </Link>
                    <Link to="/services">
                      <Button size="lg" variant="outline" className="transition-all-ease">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
