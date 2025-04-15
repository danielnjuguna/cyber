import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DocumentPreview from '@/components/DocumentPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api } from '@/utils/api';
import { toast } from '@/hooks/use-toast';

// Mock data for documents (fallback if API fails)
const allDocumentsFallback = [
  {
    id: 'doc-001',
    title: 'Professional Resume Template',
    description: 'A clean, modern resume template designed for professionals seeking new opportunities.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop',
    previewUrl: '/samples/resume-preview.pdf',
    category: 'templates'
  },
  {
    id: 'doc-002',
    title: 'Business Proposal Template',
    description: 'Comprehensive business proposal template to help you win new clients and projects.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop',
    previewUrl: '/samples/proposal-preview.pdf',
    category: 'templates'
  },
  {
    id: 'doc-003',
    title: 'Legal Document Bundle',
    description: 'Essential legal documents for small businesses, including contracts and agreements.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2042&auto=format&fit=crop',
    previewUrl: '/samples/legal-preview.pdf',
    category: 'legal'
  },
  {
    id: 'doc-004',
    title: 'Marketing Plan Template',
    description: 'Comprehensive marketing plan template to help you strategize and execute campaigns.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?q=80&w=2066&auto=format&fit=crop',
    previewUrl: '/samples/marketing-preview.pdf',
    category: 'templates'
  },
  {
    id: 'doc-005',
    title: 'Financial Report Template',
    description: 'Professional financial report template for businesses of all sizes.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2036&auto=format&fit=crop',
    previewUrl: '/samples/financial-preview.pdf',
    category: 'templates'
  },
  {
    id: 'doc-006',
    title: 'NDA Agreement',
    description: 'Standard non-disclosure agreement to protect your confidential information.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1607863680198-23d4b2565df0?q=80&w=2070&auto=format&fit=crop',
    previewUrl: '/samples/nda-preview.pdf',
    category: 'legal'
  },
];

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Documents' },
    { id: 'templates', name: 'Templates' },
    { id: 'legal', name: 'Legal Documents' },
  ]);
    
  // Fetch documents from API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await api.getDocuments();
        
        if (response.documents && Array.isArray(response.documents)) {
          // Transform backend documents to match frontend format
          const transformedDocuments = response.documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            thumbnailUrl: doc.thumbnail_path 
              ? `http://localhost:5000${doc.thumbnail_path.startsWith('/') ? doc.thumbnail_path : `/${doc.thumbnail_path}`}` 
              : 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=2070&auto=format&fit=crop',
            previewUrl: doc.document_path
              ? `http://localhost:5000${doc.document_path.startsWith('/') ? doc.document_path : `/${doc.document_path}`}`
              : null,
            category: doc.category || 'other'
          }));
          
          setAllDocuments(transformedDocuments);
          
          // Extract unique categories
          if (transformedDocuments.length > 0) {
            const uniqueCategories = [...new Set(transformedDocuments.map(doc => doc.category))];
            const categoryOptions = [
              { id: 'all', name: 'All Documents' },
              ...uniqueCategories.map(cat => {
                // Ensure cat is a string before using string methods
                const category = String(cat);
                return { 
                  id: category, 
                  name: category.charAt(0).toUpperCase() + category.slice(1) 
                };
              })
            ];
            setCategories(categoryOptions);
          }
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load documents. Please try again later.',
          variant: 'destructive',
        });
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);
  
  // Filter documents based on search query and category
  useEffect(() => {
    let filtered = allDocuments;
    
    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        doc.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }
    
    setDocuments(filtered);
  }, [searchQuery, selectedCategory, allDocuments]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Combined header section */}
        <div className="bg-secondary pt-20 pb-6">
          <div className="container px-4 md:px-6 mx-auto">
            {/* Title */}
            <div className="max-w-3xl mx-auto text-center mb-6">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
                Browse Our Documents
              </h1>
              <p className="text-lg text-muted-foreground">
                Explore our collection of premium documents with secure previews
              </p>
            </div>
            
            {/* Search and filter - directly below the title */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="w-full md:w-auto flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search documents..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <Button
                    key={index}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    className="mr-1 mb-1"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Document Grid - Visible immediately without scrolling */}
        <section className="py-6">
          <div className="container px-4 md:px-6 mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div key={index} className="h-64 rounded-xl bg-muted/50 animate-pulse"></div>
                ))}
              </div>
            ) : documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map(doc => (
                  <DocumentPreview 
                    key={doc.id}
                    id={doc.id}
                    title={doc.title}
                    description={doc.description}
                    thumbnailUrl={doc.thumbnailUrl}
                    previewUrl={doc.previewUrl}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xl text-muted-foreground">No documents found matching your search criteria.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Documents;
