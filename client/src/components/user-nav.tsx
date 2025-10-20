import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";


export function UserNav() {
  return (
    <header className="flex-shrink-0 relative h-16 bg-card hidden md:flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-white">Dashboard</h2>
      </div>
      <div className="ml-4 flex items-center md:ml-6 space-x-4">
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5 text-gray-400" />
          <span className="sr-only">Search</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent"></span>
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  );
}
