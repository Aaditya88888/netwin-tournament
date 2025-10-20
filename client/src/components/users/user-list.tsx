import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, getStatusColor, formatCurrency } from "@/lib/utils";
import { Search, MoreHorizontal, Eye, Ban, Shield, Clock, Trash2, CreditCard, Trophy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
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

const UserList = () => {  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { data: users, isLoading, isError, error } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('UserList - Fetching users...');
      const token = localStorage.getItem('adminToken');
      console.log('UserList - Token exists:', !!token);
      
      if (!token) {
        console.error('UserList - No authentication token available');
        throw new Error('Authentication required. Please log in again.');
      }
        try {
        const response = await apiRequest("GET", "/users");
        const data = await response.json();
        console.log('UserList - Users fetched successfully:', data?.length || 0);
        return data;
      } catch (err) {
        console.error('UserList - Error fetching users:', err);
        throw err;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  console.log('UserList render - users:', users?.length, 'loading:', isLoading, 'error:', error);
    const filteredUsers = (users || []).filter((user: any) => {
    // Filter out users without valid identifiers
    if (!user || (!user.id && !user.uid)) return false;
    
    if (searchQuery === "") return true;
    
    const searchLower = searchQuery.toLowerCase();
    const displayName = user.displayName || '';
    const username = user.username || '';
    const name = user.name || '';
    const email = user.email || '';
    
    return (
      name.toLowerCase().includes(searchLower) ||
      username.toLowerCase().includes(searchLower) ||
      displayName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });


  const handleStatusChange = async (user: any, status: string) => {
    const userId = user.id || user.uid;
    if (!userId) {
      toast({
        title: "Error",
        description: "Cannot update user status: missing user identifier.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("PATCH", `/users/${userId}`, { status });
      
      toast({
        title: "User Status Updated",
        description: `User has been ${status === "active" ? "activated" : status}.`,
      });
      
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteUser = async (user: any) => {
    try {
      setLoading(true);
      const userId = user.id || user.uid;
      
      if (!userId) {
        toast({
          title: "Error",
          description: "Invalid user ID",
          variant: "destructive"
        });
        return;
      }      await apiRequest(
        'DELETE',
        `/users/${userId}`
      );
      
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUsers = async () => {
    try {
      setSyncing(true);
      const response = await apiRequest("GET", "/users/sync");
      const data = await response.json();
      
      toast({
        title: "Users Synced",
        description: `Successfully synced ${data.count} users from all sources.`,
      });
      
      // Refresh user list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error("Error syncing users:", error);
      toast({
        title: "Error",
        description: "Failed to sync users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };
  
  if (isError) {
    console.error('Users query error:', error);
    
    // Check if error is related to authentication
    const isAuthError = error?.message?.toLowerCase().includes('authentication') || 
                        error?.message?.toLowerCase().includes('login') ||
                        error?.message?.toLowerCase().includes('unauthorized') ||
                        error?.message?.toLowerCase().includes('forbidden');
    
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-destructive text-lg">Failed to load users</p>
            <p className="text-sm text-muted-foreground mt-2">{error?.message || 'Unknown error'}</p>
            {isAuthError && (
              <p className="text-sm mt-4">Try logging out and logging back in to refresh your session.</p>
            )}<Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-game">User Management</CardTitle>
            <CardDescription>
              View and manage all registered users
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncUsers} 
              disabled={syncing}
            >
              <svg className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              {syncing ? "Syncing..." : "Sync All Users"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/kyc">
                <Shield className="h-4 w-4 mr-2" />
                KYC Verification
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, username, or email..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card animate-pulse rounded-md" />
            ))}
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>              <TableBody>
                {(filteredUsers || []).map((user: any) => (
                  <TableRow key={user.id || user.uid || user.email}>
                    <TableCell>
                      <div className="flex items-center">                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback>
                            {getInitials(user.name || user.displayName || user.username || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="font-medium">{user.name || user.displayName || user.username || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">@{user.username || user.email?.split('@')[0] || 'unknown'}</p>
                        </div>
                      </div>                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{user.email || 'No email'}</p>
                      <p className="text-xs text-muted-foreground">{user.phone || user.phoneNumber || "No phone"}</p>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(user.walletBalance || 0)}                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.kycStatus || 'unknown')}>
                        {(user.kycStatus || 'unknown').charAt(0).toUpperCase() + (user.kycStatus || 'unknown').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status || 'unknown')}>
                        {(user.status || 'unknown').charAt(0).toUpperCase() + (user.status || 'unknown').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/users/${user.id || user.uid}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/users/${user.id || user.uid}/transactions`}>
                              <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                              Transactions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/users/${user.id || user.uid}/matches`}>
                              <Trophy className="h-4 w-4 mr-2 text-purple-500" />
                              Match History
                            </Link>
                          </DropdownMenuItem>
                          {(user.status || 'unknown') === "active" ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(user, "suspended")}>
                              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (user.status || 'unknown') === "suspended" ? (
                            <DropdownMenuItem onClick={() => handleStatusChange(user, "active")}>
                              <Shield className="h-4 w-4 mr-2 text-green-500" />
                              Activate User
                            </DropdownMenuItem>
                          ) : null}
                          {(user.status || 'unknown') !== "banned" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(user, "banned")}>
                              <Ban className="h-4 w-4 mr-2 text-red-500" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                          {/* KYC Actions */}
                          {user.kycStatus && user.kycStatus.toUpperCase() === 'PENDING' && (
                            <>
                              <DropdownMenuItem onClick={async () => {
                                await apiRequest('POST', `/users/${user.id || user.uid}/kyc-status`, { status: 'APPROVED' });
                                queryClient.invalidateQueries({ queryKey: ['users'] });
                                toast({ title: 'KYC Approved', description: 'User KYC has been approved.' });
                              }}>
                                Approve KYC
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                await apiRequest('POST', `/users/${user.id || user.uid}/kyc-status`, { status: 'REJECTED' });
                                queryClient.invalidateQueries({ queryKey: ['users'] });
                                toast({ title: 'KYC Rejected', description: 'User KYC has been rejected.' });
                              }}>
                                Reject KYC
                              </DropdownMenuItem>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user and all their associated data including transactions, match history, and wallet information. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={loading}
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {loading ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserList;
