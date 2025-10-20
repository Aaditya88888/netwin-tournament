import React from "react";
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';


const AdminLogin = () => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setLocation] = useLocation();
  const { signIn, user } = useAdminAuth();
  const { toast } = useToast();
  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    console.log('AdminLogin - User state:', user);
    const token = localStorage.getItem('adminToken');
    console.log('AdminLogin - Token exists:', !!token);
    
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/dashboard';
      console.log('AdminLogin - Redirecting to:', redirect);
      setLocation(redirect);
    }
  }, [user, setLocation]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);    try {      console.log('AdminLogin - Signing in with:', username);
      await signIn(username, password);
      console.log('AdminLogin - Login successful');
      
      toast({
        title: "Success",
        description: "Successfully logged in as admin",
      });
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/dashboard';
      console.log('AdminLogin - Will redirect to:', redirect);
      
      setTimeout(() => {
        console.log('AdminLogin - Now redirecting to:', redirect);
        setLocation(redirect);
      }, 100);
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "Failed to sign in",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      <Card className="w-full max-w-md bg-dark-card border-gray-800">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/netwin-logo.png" 
              alt="Netwin Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.log('Login page logo failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Netwin Admin Login</CardTitle>          <CardDescription>
            Enter your admin credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">            <div className="space-y-2">
              <Input
                id="username"
                type="text"
                placeholder="Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-gray-800 text-white border-gray-700 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-800 text-white border-gray-700 placeholder:text-gray-400"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <div className="text-center mt-4">
              <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;