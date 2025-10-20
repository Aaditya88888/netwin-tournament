import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, DollarSign, Activity } from "lucide-react";
import { useAdminAuth } from '@/context/AdminAuthContext';
import React from "react";


interface DashboardStats {
  activeTournaments: number;
  registeredUsers: number;
  totalRevenue: number;
  activeUsers: number;
}

const Dashboard = () => {
  const { user, token } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeTournaments: 0,
    registeredUsers: 0,
    totalRevenue: 0,
    activeUsers: 0
  });
  
  // Debug auth status on dashboard
  useEffect(() => {
    console.log('Dashboard - Auth state:', { 
      isAuthenticated: !!user, 
      email: user?.email,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 15)}...` : 'none'
    });
  }, [user, token]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/stats/dashboard');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Active Tournaments",
      value: stats.activeTournaments,
      icon: Trophy,
      description: "Currently running tournaments"
    },
    {
      title: "Total Users",
      value: stats.registeredUsers,
      icon: Users,
      description: "Registered users"
    },
    {
      title: "Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Total revenue generated"
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      description: "Users active today"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard; 
