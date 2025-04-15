import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  const heroRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      
      const { clientX, clientY } = e;
      const { left, top, width, height } = heroRef.current.getBoundingClientRect();
      
      const x = (clientX - left) / width;
      const y = (clientY - top) / height;
      
      // Apply a subtle parallax effect
      const elements = heroRef.current.querySelectorAll('.parallax');
      elements.forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "0.05");
        const xShift = (x - 0.5) * speed * 100;
        const yShift = (y - 0.5) * speed * 100;
        
        el.style.transform = `translate(${xShift}px, ${yShift}px)`;
      });
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16"
    >
      {/* Background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl opacity-60 parallax" data-speed="0.02"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl opacity-60 parallax" data-speed="0.03"></div>
      </div>
      
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center text-center space-y-10">
          <div className="space-y-6 max-w-4xl">
            <div className="inline-block neo-morphism px-4 py-1.5 rounded-full mb-4 animate-fade-in-down">
              <p className="text-sm font-medium text-primary">Premium Document Services</p>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Documents that <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700">stand out</span> in the digital world
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              We provide high-quality document services with secure previews 
              and seamless communication for all your digital needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <Link to="/documents">
                <Button size="lg" className="bg-primary hover:bg-primary/90 transition-all-ease group">
                  Browse Documents
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="transition-all-ease">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Enhanced Document Preview Area */}
          <div className="relative w-full max-w-5xl h-80 md:h-96 mt-16 glass-card rounded-2xl overflow-hidden animate-fade-in-up shadow-lg" style={{animationDelay: '0.4s'}}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 w-full h-full">
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-4">Document Preview</h3>
                  <p className="text-muted-foreground mb-4">View our premium documents with secure preview technology.</p>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative w-full aspect-[3/4] bg-secondary rounded-lg overflow-hidden shadow-lg">
                    <div className="absolute inset-0 flex flex-col">
                      <div className="h-4 bg-muted flex items-center px-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        </div>
                      </div>
                      <div className="flex-grow p-3 text-xs">
                        <div className="h-4 w-3/4 bg-primary/10 rounded mb-2"></div>
                        <div className="h-3 w-full bg-muted rounded mb-1"></div>
                        <div className="h-3 w-full bg-muted rounded mb-1"></div>
                        <div className="h-3 w-2/3 bg-muted rounded mb-3"></div>
                        
                        <div className="h-4 w-1/2 bg-primary/10 rounded mb-2"></div>
                        <div className="h-3 w-full bg-muted rounded mb-1"></div>
                        <div className="h-3 w-full bg-muted rounded mb-1"></div>
                        <div className="h-3 w-5/6 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/80 to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
