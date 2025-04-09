import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Mail, ArrowLeft } from 'lucide-react';

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const { requestPasswordReset } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });
  
  const onSubmit = async (values) => {
    try {
      setIsLoading(true);
      // In development, we'll get the token back directly
      const result = await requestPasswordReset(values.email);
      // The result might be undefined or a string token
      if (result && typeof result === 'string') {
        setResetToken(result);
      } else {
        setResetToken(null);
      }
      setIsRequestSent(true);
    } catch (error) {
      console.error('Password reset request error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md glass-morphism p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Reset Your Password</h1>
            <p className="text-muted-foreground mt-2">
              {isRequestSent 
                ? "We've sent you an email with password reset instructions" 
                : "Enter your email to receive a password reset link"
              }
            </p>
          </div>
          
          {isRequestSent ? (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm">For development purposes, here's your reset token:</p>
                <div className="bg-background p-2 mt-2 rounded border border-border overflow-auto">
                  <code className="text-xs">{resetToken}</code>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  In production, this would be sent via email instead.
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button asChild>
                  <Link to="/reset-password">
                    Reset Your Password
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/login" className="flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="your@email.com" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>
                
                <div className="text-center mt-4">
                  <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPassword;
