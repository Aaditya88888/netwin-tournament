import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogger } from "@/lib/audit-logger";
import { ErrorBoundary, ErrorState, LoadingState, EmptyState } from "@/components/ui/error-boundary";
import { ConfirmationDialog, useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { HelpTooltip, FieldHelpTooltip, ActionHelpTooltip } from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Filter, Download, Upload, MoreHorizontal, Eye, Ban, Shield, Clock, Trash2, CreditCard, Trophy, Users as UsersIcon, UserCheck, UserX, AlertTriangle, TrendingUp, Mail, Phone, Calendar, MapPin, Wallet, Activity, Settings, RefreshCw, CheckCircle, X, Loader2, Plus, FileText, BarChart3 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { getInitials, getStatusColor, formatCurrency } from "@/lib/utils";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  uid?: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  status: 'active' | 'suspended' | 'banned' | 'pending';
  kycStatus: 'verified' | 'pending' | 'rejected' | 'not_submitted';
  walletBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  matchesPlayed: number;
  winRate: number;
  registrationDate: string;
  lastActive: string;
  location?: string;
  avatar?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    lastUsed: string;
  };
  preferences?: {
    notifications: boolean;
    marketing: boolean;
    language: string;
  };
  stats?: {
    totalTournaments: number;
    totalWinnings: number;
    averageRank: number;
    kdr: number;
  };
}

interface UserFilters {
  status: string;
  kycStatus: string;
  dateRange: string;
  balanceMin: string;
  balanceMax: string;
  region: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  verifiedUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  averageBalance: number;
  totalBalance: number;
  kycPendingCount: number;
}

const Users = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    kycStatus: 'all',
    dateRange: 'all',
    balanceMin: '',
    balanceMax: '',
    region: 'all',
    sortBy: 'registrationDate',
    sortOrder: 'desc'
  });

  const { toast } = useToast();
  const { logUserAction, logSystemAction } = useAuditLogger();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  // Fetch users with filters
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['users', filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

      const response = await apiRequest("GET", `/users?${params}`);
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch user statistics
  const { data: stats } = useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/admin/users/stats");
      return response.json();
    },
    staleTime: 60000,
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter((user: User) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });
  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to perform bulk action.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog based on action severity
    const actionConfig = {
      suspend: {
        title: "Suspend Users",
        description: `Are you sure you want to suspend ${selectedUsers.length} users? They will not be able to access the platform until reactivated.`,
        variant: "warning" as const,
        confirmText: "Suspend Users",
      },
      ban: {
        title: "Ban Users",
        description: `Are you sure you want to permanently ban ${selectedUsers.length} users? This action cannot be easily undone.`,
        variant: "destructive" as const,
        confirmText: "Ban Users",
      },
      delete: {
        title: "Delete Users",
        description: `Are you sure you want to permanently delete ${selectedUsers.length} users? This will remove all their data and cannot be undone.`,
        variant: "destructive" as const,
        confirmText: "Delete Users",
      },
      activate: {
        title: "Activate Users",
        description: `Activate ${selectedUsers.length} users and restore their access to the platform?`,
        variant: "default" as const,
        confirmText: "Activate Users",
      },
    };

    const config = actionConfig[action as keyof typeof actionConfig];
    if (!config) return;

    showConfirmation({
      ...config,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await apiRequest("POST", "/admin/users/bulk", {
            action,
            userIds: selectedUsers
          });

          // Log the bulk action
          await logSystemAction(`bulk_${action}_users`, {
            action,
            userCount: selectedUsers.length,
            userIds: selectedUsers,
          });

          toast({
            title: "Bulk Action Completed",
            description: `Successfully applied ${action} to ${selectedUsers.length} users.`,
          });

          setSelectedUsers([]);
          setBulkAction("");
          refetch();
        } catch (error) {
          toast({
            title: "Bulk Action Failed",
            description: "Failed to apply bulk action. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };
  // Handle user status change
  const handleStatusChange = async (userId: string, status: string, userName?: string) => {
    const statusConfig = {
      suspended: {
        title: "Suspend User",
        description: `Suspend ${userName || 'this user'}? They will not be able to access the platform until reactivated.`,
        variant: "warning" as const,
      },
      banned: {
        title: "Ban User",
        description: `Permanently ban ${userName || 'this user'}? This action cannot be easily undone.`,
        variant: "destructive" as const,
      },
      active: {
        title: "Activate User",
        description: `Activate ${userName || 'this user'} and restore their access to the platform?`,
        variant: "default" as const,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      // Direct update for non-critical status changes
      await updateUserStatus(userId, status, userName);
      return;
    }

    showConfirmation({
      ...config,
      confirmText: `${status.charAt(0).toUpperCase() + status.slice(1)} User`,
      onConfirm: () => updateUserStatus(userId, status, userName),
    });
  };

  const updateUserStatus = async (userId: string, status: string, userName?: string) => {
    try {
      await apiRequest("PATCH", `/admin/users/${userId}/status`, { status });
      
      // Log the status change
      await logUserAction(`status_change_${status}`, userId, {
        oldStatus: users.find(u => u.id === userId)?.status,
        newStatus: status,
        userName,
      });

      toast({
        title: "Status Updated",
        description: `User status changed to ${status}.`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    }
  };
  // Handle user deletion
  const handleDeleteUser = async (userId: string, userName?: string) => {
    showConfirmation({
      title: "Delete User",
      description: `Are you sure you want to permanently delete "${userName || 'this user'}"? This will remove all their data including transactions, match history, and KYC documents. This action cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete User",
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          console.log('Deleting user:', userId);
          
          const response = await apiRequest("DELETE", `/users/${userId}`);
          console.log('Delete response:', response.status);
          
          // Log the deletion
          await logUserAction('delete_user', userId, {
            userName,
            deletedBy: 'admin',
          });

          toast({
            title: "User Deleted",
            description: `User "${userName || userId}" has been permanently deleted.`,
          });
          
          // Remove from selected users if it was selected
          setSelectedUsers(prev => prev.filter(id => id !== userId));
          refetch();
        } catch (error: any) {
          console.error('Delete user error:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to delete user.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };
  // Export users data
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (selectedUsers.length > 0) {
        params.append('userIds', selectedUsers.join(','));
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

      const response = await apiRequest("GET", `/admin/users/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${format}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Log the export action
      await logSystemAction('export_users_data', {
        format,
        selectedUsersCount: selectedUsers.length,
        totalUsers: filteredUsers.length,
        filters,
      });

      toast({
        title: "Export Successful",
        description: `Users data exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export users data.",
        variant: "destructive",
      });
    }
  };
  return (
    <ErrorBoundary>
      <Helmet>
        <title>User Management | NetWin Admin</title>
        <meta name="description" content="Comprehensive user management for the PUBG/BGMI tournament platform" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">User Management</h1>
              <HelpTooltip
                content="Manage all user accounts, view analytics, perform bulk actions, and monitor user activity across the platform."
                variant="info"
              />
            </div>
            <p className="text-muted-foreground">
              Comprehensive user administration and analytics
            </p>
          </div>
          <div className="flex gap-2">
            <ActionHelpTooltip content="Refresh user data and statistics">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </ActionHelpTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeUsers} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newUsersThisMonth}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.newUsersThisWeek} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.kycPendingCount} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(stats.averageBalance)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <HelpTooltip
                  content="Search across user names, emails, usernames, and phone numbers. Use partial matches for better results."
                  variant="info"
                  side="top"
                >
                  <Input
                    placeholder="Search users by name, email, username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </HelpTooltip>
              </div>
              <div className="flex gap-2">
                <ActionHelpTooltip content="Show advanced filters to narrow down results by status, KYC, balance, and more">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </ActionHelpTooltip>                {selectedUsers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FieldHelpTooltip content="Select an action to apply to all selected users. Use with caution as some actions cannot be undone." />
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Bulk Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activate">Activate</SelectItem>
                        <SelectItem value="suspend">Suspend</SelectItem>
                        <SelectItem value="ban">Ban</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="export">Export Selected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {bulkAction && (
                  <Button
                    onClick={() => handleBulkAction(bulkAction)}
                    disabled={isProcessing}
                    variant={bulkAction === 'delete' || bulkAction === 'ban' ? 'destructive' : 'default'}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Apply ({selectedUsers.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>KYC Status</Label>
                    <Select value={filters.kycStatus} onValueChange={(value) => setFilters({...filters, kycStatus: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Range</Label>
                    <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Min Balance</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.balanceMin}
                      onChange={(e) => setFilters({...filters, balanceMin: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label>Max Balance</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.balanceMax}
                      onChange={(e) => setFilters({...filters, balanceMax: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label>Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registrationDate">Registration Date</SelectItem>
                        <SelectItem value="lastActive">Last Active</SelectItem>
                        <SelectItem value="walletBalance">Wallet Balance</SelectItem>
                        <SelectItem value="matchesPlayed">Matches Played</SelectItem>
                        <SelectItem value="winRate">Win Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(filteredUsers.map(u => u.id));
                              } else {
                                setSelectedUsers([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>KYC</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>
                                  {getInitials(user.name || user.displayName || user.username || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name || user.displayName || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">@{user.username || 'unknown'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email || 'No email'}
                              </p>
                              {user.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(user.walletBalance || 0)}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.matchesPlayed || 0} matches
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'active' ? 'default' : user.status === 'suspended' ? 'secondary' : 'destructive'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.kycStatus === 'verified' ? 'default' : user.kycStatus === 'pending' ? 'secondary' : 'destructive'}>
                              {user.kycStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{user.lastActive ? format(new Date(user.lastActive), 'MMM dd, yyyy') : 'Never'}</p>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDetails(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  View Transactions
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Trophy className="h-4 w-4 mr-2" />
                                  Match History
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status === 'active' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'suspended')}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {user.status === 'suspended' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}                                <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'banned')}>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user.id, user.name || user.displayName || user.email)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-10">
                    <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No users found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Details Sheet */}
        <Sheet open={showUserDetails} onOpenChange={setShowUserDetails}>
          <SheetContent className="w-full max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>User Details</SheetTitle>
              <SheetDescription>
                Complete user information and management options
              </SheetDescription>
            </SheetHeader>

            {selectedUser && (
              <div className="mt-6 space-y-6">
                {/* User Profile */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedUser.name || selectedUser.displayName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.name || selectedUser.displayName}</h3>
                    <p className="text-muted-foreground">@{selectedUser.username}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={selectedUser.status === 'active' ? 'default' : 'destructive'}>
                        {selectedUser.status}
                      </Badge>
                      <Badge variant={selectedUser.kycStatus === 'verified' ? 'default' : 'secondary'}>
                        KYC: {selectedUser.kycStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedUser.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedUser.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedUser.location || 'No location'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Joined {format(new Date(selectedUser.registrationDate), 'MMM dd, yyyy')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Financial Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Wallet Balance</p>
                            <p className="text-2xl font-bold">{formatCurrency(selectedUser.walletBalance)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Deposits</p>
                            <p className="text-lg font-semibold">{formatCurrency(selectedUser.totalDeposits || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                            <p className="text-lg font-semibold">{formatCurrency(selectedUser.totalWithdrawals || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Net P&L</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency((selectedUser.totalDeposits || 0) - (selectedUser.totalWithdrawals || 0))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gaming Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Matches Played</p>
                            <p className="text-2xl font-bold">{selectedUser.matchesPlayed || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                            <p className="text-2xl font-bold">{(selectedUser.winRate || 0).toFixed(1)}%</p>
                          </div>
                          {selectedUser.stats && (
                            <>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Winnings</p>
                                <p className="text-lg font-semibold">{formatCurrency(selectedUser.stats.totalWinnings)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">K/D Ratio</p>
                                <p className="text-lg font-semibold">{selectedUser.stats.kdr.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Activity className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-sm">Last login</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedUser.lastActive ? format(new Date(selectedUser.lastActive), 'MMM dd, yyyy HH:mm') : 'Never'}
                              </p>
                            </div>
                          </div>
                          {selectedUser.deviceInfo && (
                            <div className="flex items-center gap-3">
                              <Settings className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-sm">Device: {selectedUser.deviceInfo.platform} {selectedUser.deviceInfo.version}</p>
                                <p className="text-xs text-muted-foreground">
                                  Last used: {format(new Date(selectedUser.deviceInfo.lastUsed), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="transactions">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Transactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">Transaction history will be displayed here.</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="settings">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">User Preferences</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedUser.preferences && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Notifications</span>
                              <Badge variant={selectedUser.preferences.notifications ? 'default' : 'secondary'}>
                                {selectedUser.preferences.notifications ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Marketing Emails</span>
                              <Badge variant={selectedUser.preferences.marketing ? 'default' : 'secondary'}>
                                {selectedUser.preferences.marketing ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Language</span>
                              <span className="text-sm">{selectedUser.preferences.language || 'English'}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </SheetContent>
        </Sheet>      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </ErrorBoundary>
  );
};

export default Users;
