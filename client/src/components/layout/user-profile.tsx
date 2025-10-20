import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useLocation } from "wouter";
import { AdminUser } from "@shared/types";
import React from "react";


export const UserProfile = () => {
  const { user, signOut } = useAdminAuth();
  const [, setLocation] = useLocation();
  const handleLogout = () => {
    signOut();
    setLocation('/admin/login');
  };

  return (
    <div className="flex items-center">
      <Avatar className="h-10 w-10 bg-primary text-white">
        <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
      </Avatar>
      <div className="ml-3">
        <p className="text-sm font-medium text-foreground">Admin User</p>
        <p className="text-xs text-muted-foreground">{user?.email || 'admin@netwin.com'}</p>
      </div>
      <button 
        onClick={handleLogout}
        className="ml-auto p-2 rounded-full hover:bg-gray-800 transition-colors"
      >
        <LogOut className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
};
