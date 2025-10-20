import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import React from "react";
import {BarChart3, Users, Trophy, DollarSign, TrendingUp, TrendingDown, Activity, Calendar, Clock, AlertCircle, CheckCircle, RefreshCw, Eye, UserCheck, Wallet } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import DashboardOverview from "@/components/dashboard/overview";


interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalTournaments: number;
    activeTournaments: number;
    totalRevenue: number;
    monthlyRevenue: number;
    pendingKyc: number;
    pendingPayouts: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'user_registration' | 'tournament_created' | 'kyc_submitted' | 'payment_completed';
    description: string;
    timestamp: string;
    user?: string;
  }>;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    notifications: 'healthy' | 'warning' | 'error';
    overall: 'healthy' | 'warning' | 'error';
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    type: 'tournament' | 'maintenance' | 'event';
    startTime: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Enhanced dashboard data fetching
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', refreshKey],
    queryFn: async () => {
      const res = await apiRequest('GET', '/admin/dashboard/stats');
      return (await res.json()) as DashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: tournaments } = useQuery({
    queryKey: ['/tournaments'],
    refetchInterval: 60000,
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/users?limit=5&sort=createdAt&order=desc');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <Users className="h-4 w-4 text-blue-500" />;
      case 'tournament_created': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'kyc_submitted': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'payment_completed': return <Wallet className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | NetWin Admin</title>
        <meta name="description" content="NetWin Admin Dashboard for PUBG/BGMI tournaments" />
      </Helmet>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your tournament platform.
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Badge variant={stats?.systemHealth?.overall === 'healthy' ? 'default' : 'destructive'}>
              {getStatusIcon(stats?.systemHealth?.overall || 'healthy')}
              <span className="ml-1">
                {stats?.systemHealth?.overall === 'healthy' ? 'All Systems Operational' : 'System Issues'}
              </span>
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.overview?.totalUsers?.toLocaleString() || '0'}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stats?.overview?.activeUsers || 0} active
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.overview?.totalTournaments || '0'}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-blue-600 flex items-center">
                      <Activity className="h-3 w-3 mr-1" />
                      {stats?.overview?.activeTournaments || 0} active
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.overview?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {formatCurrency(stats?.overview?.monthlyRevenue || 0)} this month
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats?.overview?.pendingKyc || 0) + (stats?.overview?.pendingPayouts || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.overview?.pendingKyc || 0} KYC, {stats?.overview?.pendingPayouts || 0} payouts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/tournaments/create">
                    <Button className="w-full justify-start">
                      <Trophy className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </Link>
                  <Link href="/kyc">
                    <Button variant="outline" className="w-full justify-start">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Review KYC ({stats?.overview?.pendingKyc || 0})
                    </Button>
                  </Link>
                  <Link href="/users">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link href="/finance">
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Financial Overview
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers?.slice(0, 5).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.username || user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-muted-foreground text-sm">No recent users</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Scheduled tournaments and maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.upcomingEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.startTime)}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            event.priority === 'high' ? 'destructive' : 
                            event.priority === 'medium' ? 'default' : 
                            'secondary'
                          }
                        >
                          {event.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system activities and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                          {activity.user && ` • ${activity.user}`}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Database</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats?.systemHealth?.database || 'healthy')}
                    <span className="text-sm font-medium">
                      {stats?.systemHealth?.database || 'healthy'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats?.systemHealth?.storage || 'healthy')}
                    <span className="text-sm font-medium">
                      {stats?.systemHealth?.storage || 'healthy'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats?.systemHealth?.notifications || 'healthy')}
                    <span className="text-sm font-medium">
                      {stats?.systemHealth?.notifications || 'healthy'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Overall</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats?.systemHealth?.overall || 'healthy')}
                    <span className="text-sm font-medium">
                      {stats?.systemHealth?.overall || 'healthy'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Dashboard;
