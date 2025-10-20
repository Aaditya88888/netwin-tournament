import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import React from "react";

import {Gamepad,
  BarChart3,
  Trophy,
  Users,
  Wallet,
  Bell,
  Badge, // Use Badge for KYC Verification
  Settings,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    name: "Tournaments",
    href: "/tournaments",
    icon: Trophy,
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Finance",
    href: "/finance",
    icon: Wallet,
  },
  {
    name: "Announcements",
    href: "/announcements",
    icon: Bell,
  },
  {
    name: "KYC Verification",
    href: "/kyc",
    icon: Badge, // Use Badge instead of IdCard
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-card">
        <div className="flex items-center justify-center h-16 px-4 bg-[#1a222e] border-b border-gray-700">
      <Logo />
        </div>
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-300 hover:bg-card/80 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-primary-foreground/80" : "text-gray-400 group-hover:text-gray-300"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div>
              <img
                className="inline-block h-9 w-9 rounded-full"
                src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Admin profile"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs font-medium text-gray-400">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
