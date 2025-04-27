import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MessageCircle, X, Image } from 'lucide-react';
import { openWhatsApp } from '@/utils/contact';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFileUrl } from '@/utils/config';

const ServiceCard = ({ 
  title, 
  description, 
  icon, 
  className, 
  imageUrl, 
  linkTo = "/services",
  longDescription
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isMobile = useIsMobile();
  
  // Function to handle image load errors
  const handleImageError = () => {
    console.error(`Failed to load image: ${imageUrl}`);
    setImageError(true);
  };
  
  const handleLearnMore = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetails(true);
  };
  
  const handleWhatsAppContact = () => {
    const message = `Hello, I'm interested in your ${title} service and would like to learn more.`;
    openWhatsApp(message);
    
    toast({
      title: "WhatsApp Contact Initiated",
      description: "You'll be connected with our team shortly.",
    });
  };
  
  // Ensure imageUrl has proper server path if it's a relative path from database
  const getImageUrl = (url) => {
    if (!url) return null;
    return getFileUrl(url);
  };
  
  // Fallback image URL - using a more reliable placeholder service
  const fallbackImageUrl = "https://via.placeholder.com/600x400?text=Service+Image";
  
  return (
    <>
      <Link to={linkTo} className="block h-full">
        <div
          className={cn(
            "glass-card rounded-xl transition-all-ease relative overflow-hidden group h-full flex flex-col", 
            isHovered ? "translate-y-[-5px] shadow-lg" : "shadow-md",
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Image Container with Fixed Height and AspectRatio */}
          <div className="w-full h-[200px] relative">
            {(imageUrl && !imageError) ? (
              <AspectRatio ratio={16/9} className="h-full">
                <div className="relative w-full h-full overflow-hidden">
                  <img 
                    src={getImageUrl(imageUrl)} 
                    alt={title} 
                    className={cn(
                      "w-full h-full object-cover transition-all duration-500",
                      isHovered ? "scale-110" : "scale-100",
                      imageLoaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                  />
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent opacity-60"></div>
                </div>
              </AspectRatio>
            ) : (
              <div className="w-full h-full bg-muted/20 flex items-center justify-center relative">
                <img 
                  src={fallbackImageUrl} 
                  alt={title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent opacity-60"></div>
              </div>
            )}
          </div>
          
          <div className="p-6 relative z-10 flex-grow flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-all-ease" />
            
            <div className="relative z-10 flex-grow">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-5 transition-all-ease">
                {icon}
              </div>
              
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className="text-muted-foreground mb-4">{description}</p>
              
              <div className="mt-auto">
                <Button 
                  variant="ghost" 
                  className="px-0 text-primary hover:bg-transparent hover:text-primary/80"
                  onClick={handleLearnMore}
                >
                  <span className="transition-all-ease">Learn more</span>
                  <ArrowRight 
                    className={cn(
                      "ml-2 h-3.5 w-3.5 transition-all-ease",
                      isHovered ? "translate-x-1" : ""
                    )}
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Responsive Service Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl w-[95%] p-0 overflow-hidden rounded-xl border-none shadow-lg max-h-[90vh] overflow-y-auto">
          {/* Close button (X) in the top right corner */}
          <Button
            onClick={() => setShowDetails(false)}
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-50 rounded-full bg-primary/10 backdrop-blur-sm hover:bg-primary/20 border border-primary/20 transition-colors duration-200"
          >
            <X className="h-4 w-4 text-primary" />
            <span className="sr-only">Close</span>
          </Button>
          
          {/* Dialog Header with Background Image */}
          <div className="relative">
            {(imageUrl && !imageError) ? (
              <div className="w-full h-48 md:h-56 relative overflow-hidden">
                <AspectRatio ratio={21/9} className="h-full">
                  <img 
                    src={getImageUrl(imageUrl)} 
                    alt={title} 
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-background/80"></div>
                </AspectRatio>
              </div>
            ) : (
              <div className="w-full h-48 md:h-56 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="flex flex-col items-center text-primary/60">
                  <Image className="h-16 w-16 mb-2" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-background/80"></div>
              </div>
            )}
            
            <DialogHeader className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-primary text-white">
                  {icon}
                </div>
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-bold">{title}</DialogTitle>
                  <DialogDescription className="text-white/90 mt-1 text-sm md:text-base">
                    {description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          
          {/* Dialog Body */}
          <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="prose prose-lg dark:prose-invert max-w-none md:w-2/3">
              <p className="text-base md:text-lg leading-relaxed mb-4 md:mb-6">
                {longDescription || description}
              </p>
              
              {/* Feature list with subtle gradient badges */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base">Premium Quality</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Expertly crafted solutions tailored to your needs</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-400/5">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base">Fast Delivery</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Quick turnaround times to meet your deadlines</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-full bg-gradient-to-br from-green-400/20 to-green-400/5">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base">Dedicated Support</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Ongoing assistance and guidance throughout the process</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-400/5">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base">Satisfaction Guaranteed</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Your complete satisfaction is our top priority</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Section */}
            <div className="md:w-1/3 bg-muted/30 p-3 md:p-5 rounded-xl flex flex-col gap-3 md:gap-4">
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Get in Touch</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-2 md:mb-4">
                Ready to discuss how our {title.toLowerCase()} can help you? Contact us directly through WhatsApp for personalized assistance.
              </p>
              
              <Button 
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={handleWhatsAppContact}
              >
                <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Contact via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceCard;
