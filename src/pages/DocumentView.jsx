import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { setupScrollAnimations } from '@/utils/animations';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Share, FileText, Lock } from 'lucide-react';
import { openWhatsApp } from '@/utils/contact';
import { toast } from '@/hooks/use-toast';
import { api } from '@/utils/api';
import DocumentViewer from '@/components/DocumentViewer';
import { getFileUrl } from '@/utils/config';

const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cleanup = setupScrollAnimations();
    return cleanup;
  }, []);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.getDocument(id);
        
        if (response && response.document) {
          // Transform API response to match component expectations
          const transformedDocument = {
            id: response.document.id,
            title: response.document.title,
            description: response.document.description,
            longDescription: response.document.description, // Use description as long description if needed
            category: response.document.category || 'uncategorized',
            thumbnailUrl: response.document.thumbnail_path 
              ? getFileUrl(response.document.thumbnail_path) 
              : 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop',
            // Document path for preview
            previewUrl: response.document.document_path
              ? getFileUrl(response.document.document_path)
              : null,
            sampleContent: response.document.preview_text || "This is a preview of the document. For full access, please contact us."
          };
          
          setDocument(transformedDocument);
        } else {
          setError('Document not found');
        }
      } catch (error) {
        console.error('Failed to fetch document:', error);
        setError('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  const handleWhatsAppContact = () => {
    if (!document) return;
    
    const message = `Hello, I'm interested in the document: ${document.title} (ID: ${document.id})`;
    openWhatsApp(message);
    
    toast({
      title: "WhatsApp Contact Initiated",
      description: "You'll be connected with our team shortly.",
    });
  };

  const handleShare = () => {
    if (!document) return;
    
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        toast({
          title: "Link Copied",
          description: "Document link has been copied to clipboard.",
        });
      },
      () => {
        toast({
          title: "Copy Failed",
          description: "Could not copy link to clipboard.",
          variant: "destructive"
        });
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading document...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Document Not Found</h1>
            <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/documents')}>Back to Documents</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24">
        <div className="container px-4 md:px-6 mx-auto py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/documents')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
          </Button>
        </div>
        
        <section className="py-4">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="neo-morphism rounded-xl overflow-hidden">
                  {document.thumbnailUrl ? (
                    <img 
                      src={document.thumbnailUrl} 
                      alt={document.title}
                      className="w-full h-auto aspect-[3/4] object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.classList.add('flex', 'items-center', 'justify-center', 'bg-muted/20');
                        const fallback = document.createElement('div');
                        fallback.className = 'flex flex-col items-center text-muted-foreground p-4';
                        fallback.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          <span class="text-sm">${document.title}</span>
                        `;
                        e.target.parentNode.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <div className="w-full h-auto aspect-[3/4] flex items-center justify-center bg-muted/20">
                      <div className="flex flex-col items-center text-muted-foreground p-4">
                        <FileText className="h-16 w-16 mb-2 opacity-50" />
                        <span className="text-sm">{document.title}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 space-y-4">
                  <Button 
                    className="w-full bg-green-500 hover:bg-green-600"
                    onClick={handleWhatsAppContact}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Contact via WhatsApp
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleShare}
                  >
                    <Share className="h-4 w-4 mr-2" /> Share Document
                  </Button>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold">{document.title}</h1>
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {document.category.charAt(0).toUpperCase() + document.category.slice(1)}
                  </span>
                </div>
                
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-2">Description</h2>
                  <p className="text-muted-foreground">{document.longDescription}</p>
                </div>
                
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Document Preview</h2>
                  <div className="neo-morphism rounded-xl p-6 glass-morphism bg-background/50">
                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center p-1.5 bg-primary/10 text-primary rounded-full">
                        <Lock className="h-4 w-4" />
                      </div>
                      <span>
                        <b>Preview Mode:</b> This is a limited preview. Contact us for the full document access.
                      </span>
                    </div>
                    
                    {document.previewUrl ? (
                      <DocumentViewer 
                        documentUrl={document.previewUrl} 
                        className="mt-4"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No preview available</p>
                        <p className="text-muted-foreground mt-2 mb-4">This document doesn't have a preview available.</p>
                        <Button 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={handleWhatsAppContact}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" /> Contact for Access
                        </Button>
                      </div>
                    )}
                    
                    <div className="mt-6 bg-muted/30 p-4 rounded-md border border-dashed">
                      <h3 className="text-sm font-medium mb-2">Document Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium">{document.category.charAt(0).toUpperCase() + document.category.slice(1)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Access Level:</span>
                          <span className="font-medium">Limited Preview</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default DocumentView;
