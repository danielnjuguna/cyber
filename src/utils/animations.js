
// Function to set up scroll animations
export const setupScrollAnimations = () => {
  const handleScroll = () => {
    const elements = document.querySelectorAll('.reveal');
    
    elements.forEach((element) => {
      const elementPosition = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (elementPosition < windowHeight * 0.85) {
        element.classList.add('active');
      }
    });
  };
  
  // Initial check
  handleScroll();
  
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
  
  // Clean up
  return () => window.removeEventListener('scroll', handleScroll);
};

