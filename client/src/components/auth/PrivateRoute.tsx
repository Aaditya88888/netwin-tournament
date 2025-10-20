import React from "react";
import { Route, useLocation, Redirect } from 'wouter';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Loader2 } from 'lucide-react';


interface PrivateRouteProps {
  children: React.ReactNode;
  path: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, path }) => {
  const { user, loading } = useAdminAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/admin/login?redirect=${encodeURIComponent(location)}`} />;
  }

  return <Route path={path}>{() => children}</Route>;
};

export default PrivateRoute; 
