import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Github, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full py-12 bg-secondary">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700">
              CyberDocs
            </h3>
            <p className="text-muted-foreground">
              Premium document services with secure previews and seamless communication.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="text-muted-foreground hover:text-primary transition-all-ease" aria-label="Github">
                <Github size={18} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-all-ease" aria-label="Twitter">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-all-ease" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-base font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/documents" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Documents
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          {/* <div>
            <h4 className="text-base font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-all-ease">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-primary transition-all-ease">
                  FAQ
                </Link>
              </li>
            </ul>
          </div> */}
          
          {/* Contact */}
          <div>
            <h4 className="text-base font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Mail className="h-5 w-5 mr-2 text-primary" />
                <a href="mailto:contact@cyberdocs.com" className="text-muted-foreground hover:text-primary transition-all-ease">
                  contact@cyberdocs.com
                </a>
              </li>
              <li className="flex items-start">
                <Phone className="h-5 w-5 mr-2 text-primary" />
                <a href="tel:+1234567890" className="text-muted-foreground hover:text-primary transition-all-ease">
                  +254712345678
                </a>
              </li>
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span className="text-muted-foreground">
                  Nairobi, Kenya
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-end items-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CyberDocs. All rights reserved.
            </p>
            {/* <div className="flex items-center mt-4 md:mt-0">
              <p className="text-sm text-muted-foreground mr-1">
                Designed with
              </p>
              <span className="text-primary">♥</span>
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
