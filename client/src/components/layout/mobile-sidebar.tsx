import { Link, useLocation } from "wouter";
import { UserProfile } from "./user-profile";
import React from "react";
import {LayoutDashboard, Code, Users, BadgeDollarSign, Megaphone, FileCheck, FileText, Settings, HelpCircle, Server, X } from 'lucide-react';


interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    {
      title: "General",
      items: [
        {
          icon: <LayoutDashboard className="h-5 w-5 text-primary" />,
          label: "Dashboard",
          path: "/"
        }
      ]
    },
    {      title: "Frontend",
      items: [
        {
          icon: <Code className="h-5 w-5 text-primary" />,
          label: "Tournament Matches",
          path: "/tournaments"
        },
        {
          icon: <Users className="h-5 w-5 text-primary" />,
          label: "User Management",
          path: "/users"
        },
        {
          icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
          label: "Revenue & Payouts",
          path: "/finance"
        }
      ]
    },
    {
      title: "Backend",
      items: [
        {
          icon: <Server className="h-5 w-5 text-primary" />,
          label: "Management",
          path: "/management"
        },
        {
          icon: <Megaphone className="h-5 w-5 text-primary" />,
          label: "Announcements",
          path: "/announcements"
        },
        {
          icon: <FileCheck className="h-5 w-5 text-primary" />,
          label: "KYC Verification",
          path: "/kyc"
        }
      ]
    },
    {
      title: "System",
      items: [
        {
          icon: <FileText className="h-5 w-5 text-primary" />,
          label: "Reports",
          path: "/reports"
        },
        {
          icon: <Settings className="h-5 w-5 text-primary" />,
          label: "Settings",
          path: "/settings"
        },
        {
          icon: <HelpCircle className="h-5 w-5 text-primary" />,
          label: "Help & Support",
          path: "/help"
        }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
        onClick={onClose}
      ></div>
      
      {/* Sidebar */}
      <aside className="md:hidden flex flex-col fixed inset-y-0 z-50 bg-sidebar border-r border-border w-64">
        <div className="flex items-center justify-between px-4 py-5 border-b border-border">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-game font-bold text-white text-xl">NW</span>
            </div>
            <h1 className="ml-3 font-game font-bold text-xl text-white">NETWIN</h1>
          </div>
          <button 
            className="p-2 rounded-md hover:bg-gray-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto scrollbar-hide pt-5 pb-4">
          <div className="px-3 space-y-1">
            {navItems.map((section, idx) => (
              <div key={idx} className="py-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="mt-2 space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <Link 
                      key={itemIdx} 
                      href={item.path}
                      className={`sidebar-item group flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive(item.path) ? 'active bg-primary text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                      onClick={onClose}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
        
        <div className="border-t border-border p-4">
          <UserProfile />
        </div>
      </aside>
    </>
  );
};
