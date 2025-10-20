import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import React from "react";


export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-card border-b border-gray-700">
      <div className="flex items-center justify-between h-16 px-4">
        <Logo />
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6 text-gray-400" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-full sm:w-64 border-r border-gray-700">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
