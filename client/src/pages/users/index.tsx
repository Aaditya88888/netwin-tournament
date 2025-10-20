import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { KYCRealtimeService, ExtendedUser } from '@/lib/firebase/kyc-service';
import React from "react";


interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  status: 'active' | 'inactive';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  walletBalance: number;
}

const Users = () => {
  const { toast } = useToast();
  const [kycService] = useState(() => new KYCRealtimeService());

  const { data: users = [], isLoading, error } = useQuery<ExtendedUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      // Use the real-time KYC service to get users with KYC data
      return await kycService.getAllUsersWithKYC();
    },
    retry: false,
    refetchOnWindowFocus: false
  });
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch users",
      });
    }
  }, [error, toast]);  // Set up real-time listeners for KYC updates (temporarily disabled due to type conflicts)
  useEffect(() => {
    // TODO: Re-enable when type compatibility is resolved
    // const unsubscribe = kycService.subscribeToAllExtendedUsersWithKYC((updatedUsers: ExtendedUser[]) => {
    //   console.log('KYC Update received:', updatedUsers.length, 'users updated');
    // });

    // return () => {
    //   unsubscribe();
    //   kycService.cleanup();
    // };
  }, [kycService]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
      case 'APPROVED':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'REJECTED':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">Failed to load users</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage and monitor user accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Joined Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (                users.map((user: ExtendedUser) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status || 'active')}>
                        {user.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.kycStatus)}>
                        {user.kycStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{user.walletBalance}</TableCell>
                    <TableCell>
                      {(() => {
                        const val = user.createdAt;
                        // Firestore Timestamp: has toDate()
                        if (val && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
                          const date = val.toDate();
                          return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
                        }
                        // Firestore Timestamp: has seconds
                        if (val && typeof val === 'object' && 'seconds' in val && typeof val.seconds === 'number') {
                          const date = new Date(val.seconds * 1000);
                          return !isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A";
                        }
                        // ISO string or Date
                        if (val && !isNaN(new Date(val).getTime())) {
                          return new Date(val).toLocaleDateString();
                        }
                        return "N/A";
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
