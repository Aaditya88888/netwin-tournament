import { Link, useLocation } from "wouter";
import React from "react";
import { UserProfile } from "./user-profile";

import {LayoutDashboard, 
  Gamepad, 
  Users, 
  BadgeDollarSign, 
  Megaphone, 
  FileCheck, 
  BarChart, 
  Settings, 
  HelpCircle,
  Code,
  Server,
  FileText,
  MessageSquare,
  Wallet,
  CreditCard,
  QrCode
} from "lucide-react";

export const Sidebar = () => {
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
          path: "/dashboard"
        }
      ]
    },    {
      title: "Frontend",
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
        }
      ]
    },    {
      title: "Payment Management",
      items: [
        // {
        //   icon: <BadgeDollarSign className="h-5 w-5 text-primary" />,
        //   label: "Finance & Wallets",
        //   path: "/finance"
        // },
        {
          icon: <Wallet className="h-5 w-5 text-primary" />,
          label: "Wallet Management",
          path: "/wallet-transactions"
        },
        {
          icon: <CreditCard className="h-5 w-5 text-primary" />,
          label: "All Transactions",
          path: "/transactions"
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
        },
        {
          icon: <MessageSquare className="h-5 w-5 text-primary" />,
          label: "Support Tickets",
          path: "/support-tickets"
        }
      ]
    },
    {
      title: "System",
      items: [
        // {
        //   icon: <Settings className="h-5 w-5 text-primary" />,
        //   label: "Settings",
        //   path: "/settings"
        // }
      ]
    }
  ];

  return (
    <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-50 bg-sidebar border-r border-border">
      <div className="flex items-center justify-between px-4 py-5 border-b border-border">
        <div className="flex items-center">
          <img 
            src="/netwin-logo.png" 
            alt="Netwin Logo" 
            className="w-10 h-10 rounded-lg object-contain"
            onError={(e) => {
              console.log('Sidebar logo failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="ml-3 font-game font-bold text-xl text-white">NETWIN</h1>
        </div>
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
  );
};
