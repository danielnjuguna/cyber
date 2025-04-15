import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, MessageCircle, FileText } from 'lucide-react';
import { openWhatsApp } from '@/utils/contact';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '@/utils/config';

const DocumentPreview = ({ id, title, description, thumbnailUrl, previewUrl, className }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  
  // Fix the thumbnail URL if it's a relative path
  const getThumbnailUrl = (url) => {
    if (!url) return '';
    return getFileUrl(url);
  };
  
  const handleWhatsAppContact = (e) => {
    e.stopPropagation(); // Prevent card click when clicking contact button
    const message = `Hello, I'm interested in the document: ${title} (ID: ${id})`;
    openWhatsApp(message);
    
    toast({
      title: "WhatsApp Contact Initiated",
      description: "You'll be connected with our team shortly.",
    });
  };
  
  const handlePreview = (e) => {
    e.stopPropagation(); // Prevent card click when clicking preview button
    navigate(`/documents/${id}`);
  };
  
  const handleCardClick = () => {
    navigate(`/documents/${id}`);
  };
  
  return (
    <div
      className={cn(
        "neo-morphism rounded-xl overflow-hidden transition-all-ease relative group cursor-pointer", 
        isHovered ? "shadow-lg scale-[1.02]" : "shadow",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      role="button"
      aria-label={`Preview ${title}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        {(!isLoaded || imageError) && (
          <div className="absolute inset-0 bg-muted/80 flex flex-col items-center justify-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-muted-foreground">{imageError ? "No Preview" : "Loading..."}</span>
          </div>
        )}
        <img 
          src={getThumbnailUrl(thumbnailUrl)} 
          alt={title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isHovered ? "scale-105" : "scale-100",
            (imageError || !isLoaded) ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            console.error(`Failed to load thumbnail: ${thumbnailUrl}`);
            setImageError(true);
            setIsLoaded(true);
          }}
        />
        
        {/* Preview Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all-ease flex flex-col justify-end p-4">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="glass-morphism backdrop-blur-md bg-white/20 text-white border-white/10 hover:bg-white/30"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button 
              size="sm" 
              className="glass-morphism backdrop-blur-md bg-green-500/90 text-white border-white/10 hover:bg-green-600/90"
              onClick={handleWhatsAppContact}
            >
              <MessageCircle className="h-4 w-4 mr-1" /> Contact
            </Button>
          </div>
        </div>
        
        {/* Sample indicator */}
        <div className="absolute top-3 left-3">
          <span className="subtle-glass px-2 py-1 text-xs font-medium rounded-full text-primary-foreground bg-primary/80">
            Sample
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
      </div>
    </div>
  );
};

export default DocumentPreview;
