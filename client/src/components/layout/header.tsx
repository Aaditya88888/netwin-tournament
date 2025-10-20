import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import React from "react";


interface HeaderProps {
  onSidebarToggle: () => void;
}

export const Header = ({ onSidebarToggle }: HeaderProps) => {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-30 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          className="p-2 rounded-md hover:bg-gray-800 mr-2"
          onClick={onSidebarToggle}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center">
          <img 
            src="/netwin-logo.png" 
            alt="Netwin Logo" 
            className="h-8 w-8 rounded mr-2 object-contain" 
            onError={(e) => {
              console.log('Header logo failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="ml-2 font-game font-bold text-lg text-white">NETWIN</h1>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Bell className="h-5 w-5" />
        </button>
        <Avatar className="h-8 w-8 bg-primary text-white">
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};
