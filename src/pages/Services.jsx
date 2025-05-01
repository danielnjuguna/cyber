import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ServiceCard from '@/components/ServiceCard';
import { setupScrollAnimations } from '@/utils/animations';
import { FileText, FileImage, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import { getFileUrl } from '@/utils/config';



const defaultServices = [
  {
    id: 'service-1',
    title: 'Document Services',
    description: 'High-quality documents tailored to your specific needs with professional formatting and content.',
    long_description: 'Our document services include formatting, template creation, and content development. We ensure all documents are professionally crafted with attention to detail and adherence to industry standards. Whether you need academic papers, business proposals, or legal documents, we have the expertise to deliver high-quality results.',
    icon: <FileText className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-2',
    title: 'Image Processing',
    description: 'Professional image editing, optimization, and enhancement for all your digital content needs.',
    long_description: 'Our image processing services include editing, retouching, resizing, and format conversion. We enhance your images to ensure they look their best across all platforms. Our team uses industry-standard tools and techniques to deliver exceptional results.',
    icon: <FileImage className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-3',
    title: 'Email Notifications',
    description: 'Stay updated with real-time notifications about document status and delivery.',
    long_description: 'Stay informed with our email notification system. Receive updates when your documents are processed, when payments are received, and when deliveries are made. Our streamlined communication ensures you\'re always in the loop.',
    icon: <Mail className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-4',
    title: 'Secure Delivery',
    description: 'Encrypted document delivery to ensure your sensitive information remains protected.',
    long_description: 'Security is our priority. All documents are delivered through encrypted channels to ensure your sensitive information remains confidential. We implement industry-leading security measures to protect your data throughout the entire process.',
    icon: <ShieldCheck className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'service-5',
    title: 'AI-Powered Assistance',
    description: 'Leverage cutting-edge AI to enhance document creation and processing workflows.',
    long_description: 'Our AI-powered assistance helps you create, edit, and optimize documents with unprecedented speed and accuracy. From smart templates to automated formatting, our AI tools streamline your workflow and ensure professional results every time.',
    icon: <Sparkles className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1677442135968-6144fc1c8531?q=80&w=2069&auto=format&fit=crop'
  },
  {
    id: 'service-6',
    title: 'Custom Templates',
    description: 'Professionally designed templates tailored to your brand identity and specific needs.',
    long_description: 'We create custom document templates that reflect your brand identity while meeting your specific business needs. Each template is designed for consistency, professionalism, and ease of use, helping you maintain a cohesive brand image across all your documents.',
    icon: <FileText className="h-6 w-6" />,
    imageUrl: 'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?q=80&w=2070&auto=format&fit=crop'
  }
];

const getServiceIcon = (title) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('document') || titleLower.includes('template')) return <FileText className="h-6 w-6" />;
  if (titleLower.includes('image') || titleLower.includes('photo')) return <FileImage className="h-6 w-6" />;
  if (titleLower.includes('email') || titleLower.includes('notification')) return <Mail className="h-6 w-6" />;
  if (titleLower.includes('secure') || titleLower.includes('protect')) return <ShieldCheck className="h-6 w-6" />;
  if (titleLower.includes('ai') || titleLower.includes('intelligence')) return <Sparkles className="h-6 w-6" />;
  return <FileText className="h-6 w-6" />;
};

const Services = () => {
  const [services, setServices] = useState(defaultServices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanup = setupScrollAnimations();
    return cleanup;
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await api.getServices();
        
        if (response.services && Array.isArray(response.services)) {
          const transformedServices = response.services.map((service) => ({
            id: service.id,
            title: service.title,
            description: service.description,
            longDescription: service.long_description,
            icon: getServiceIcon(service.title),
            imageUrl: service.imageUrl
              ? getFileUrl(service.imageUrl)
              : 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?q=80&w=2070&auto=format&fit=crop'
          }));
          
          setServices(transformedServices);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24">
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-secondary to-secondary/50 py-16">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center reveal">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Our Services
              </h1>
              <p className="text-xl text-muted-foreground">
                Comprehensive document solutions tailored to your needs
              </p>
            </div>
          </div>
        </section>
        
        {/* Services Grid */}
        <section className="py-16">
          <div className="container px-4 md:px-6 mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div key={index} className="h-64 rounded-xl bg-muted/50 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 reveal">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    title={service.title}
                    description={service.description}
                    longDescription={service.longDescription}
                    icon={service.icon}
                    imageUrl={service.imageUrl}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Services;
