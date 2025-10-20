import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getInitials, formatCurrency } from "@/lib/utils";
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Wallet, Trophy, Activity, Shield, CheckCircle, X, AlertCircle, Clock, Ban } from 'lucide-react';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, KycDocument } from "@shared/schema";
import KycStatus from "./kyc-status";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UserDetail = () => {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [addBonusDialogOpen, setAddBonusDialogOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/users/${id}`);
      return await response.json();
    },
    enabled: !!id,
  });

  const { data: kycDocuments } = useQuery({
    queryKey: ['users', id, 'kyc'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/users/${id}/kyc`);
        if (!response.ok) {
          // If endpoint doesn't exist yet, just return empty array
          return [];
        }
        return await response.json();
      } catch (error) {
        console.warn('Failed to fetch KYC documents, API may not be implemented yet', error);
        return [];
      }
    },
    enabled: !!id,
  });

  const { data: tournaments } = useQuery({
    queryKey: ['users', id, 'tournaments'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/users/${id}/tournaments`);
      return await response.json();
    },
    enabled: !!id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['users', id, 'transactions'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/users/${id}/transactions`);
      return await response.json();
    },
    enabled: !!id,
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      return apiRequest("PATCH", `/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: async ({ kycStatus }: { kycStatus: string }) => {
      return apiRequest("PATCH", `/users/${id}/kyc`, { kycStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Success",
        description: "KYC status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive",
      });
    }
  });

  const addBonusMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      return apiRequest("POST", `/users/${id}/add-bonus`, { amount, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Success",
        description: "Bonus added successfully",
      });
      setAddBonusDialogOpen(false);
      setBonusAmount("");
      setBonusReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add bonus",
        variant: "destructive",
      });
    }
  });

  const handleAddBonus = () => {
    const amount = parseFloat(bonusAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bonus amount",
        variant: "destructive",
      });
      return;
    }
    if (!bonusReason.trim()) {
      toast({
        title: "Missing Reason",
        description: "Please provide a reason for the bonus",
        variant: "destructive",
      });
      return;
    }
    addBonusMutation.mutate({ amount, reason: bonusReason.trim() });
  };
  const getStatusBadge = (status: string | undefined) => {
    // Use a default if undefined
    const userStatus = status || 'unknown';
    
    switch (userStatus) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Inactive
        </Badge>;
      case 'banned':
        return <Badge variant="destructive">
          <Ban className="w-3 h-3 mr-1" />
          Banned
        </Badge>;
      case 'unknown':
        return <Badge variant="outline">Unknown</Badge>;
      default:
        return <Badge variant="outline">{userStatus}</Badge>;
    }
  };
  const getKycBadge = (kycStatus: string | undefined) => {
    // Use a default if undefined
    const status = kycStatus || 'not_submitted';
    
    switch (status) {
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive">
          <X className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'not_submitted':
        return <Badge variant="outline">Not Submitted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <p className="text-destructive text-lg">Failed to load user details</p>
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['users', id] })}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-card animate-pulse rounded-md"></div>
          <div className="h-96 bg-card animate-pulse rounded-md"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <p className="text-muted-foreground text-lg">User not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">User Details</h1>
            <p className="text-muted-foreground">
              Viewing profile for {user.name || user.username || 'Unknown User'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => updateUserStatusMutation.mutate({ 
              status: user.status === 'active' ? 'inactive' : 'active' 
            })}
            disabled={updateUserStatusMutation.isPending}
          >
            {user.status === 'active' ? 'Deactivate' : 'Activate'} User
          </Button>
          <Button
            variant="secondary"
            onClick={() => setAddBonusDialogOpen(true)}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Add Bonus
          </Button>
          {user.kycStatus === 'pending' && (
            <>
              <Button
                variant="outline"
                onClick={() => updateKycStatusMutation.mutate({ kycStatus: 'approved' })}
                disabled={updateKycStatusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve KYC
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateKycStatusMutation.mutate({ kycStatus: 'rejected' })}
                disabled={updateKycStatusMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reject KYC
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">              <AvatarFallback className="text-xl">
                {getInitials(user.name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{user.name || user.username || 'Unknown User'}</h2>
                <p className="text-muted-foreground">@{user.username}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatCurrency(user.walletBalance || 0)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(user.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">KYC Status</p>
                  {getKycBadge(user.kycStatus)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for additional information */}
      <Tabs defaultValue="tournaments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tournaments">
            <Trophy className="h-4 w-4 mr-2" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Activity className="h-4 w-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="kyc">
            <Shield className="h-4 w-4 mr-2" />
            KYC Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tournaments">
          <Card>
            <CardHeader>
              <CardTitle>Tournament History</CardTitle>
            </CardHeader>
            <CardContent>
              {tournaments?.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tournament history found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tournament</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Prize Won</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>                    <TableBody>
                      {(tournaments || []).map((tournament: any) => (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">
                            {tournament.name}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(tournament.entryFee)}
                          </TableCell>
                          <TableCell>
                            {tournament.position ? `#${tournament.position}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(tournament.prizeWon || 0)}
                          </TableCell>
                          <TableCell>
                            {new Date(tournament.joinedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions?.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>                    <TableBody>
                      {(transactions || []).map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge variant={transaction.type === 'credit' ? 'secondary' : 'outline'}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.status === 'completed' ? 'secondary' : 'outline'}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>KYC Verification</CardTitle>
            </CardHeader>
            <CardContent className="pb-0">
              <KycStatus 
                user={{ ...user, name: user.name || user.username || 'Unknown User' } as User} 
                kycDocuments={kycDocuments || []} 
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['users', id, 'kyc'] })}
                isAdmin={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bonus Dialog */}
      <Dialog open={addBonusDialogOpen} onOpenChange={setAddBonusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bonus to {user.name || user.username || 'Unknown User'}</DialogTitle>
            <DialogDescription>
              Add a bonus amount to the user's wallet balance. This will be recorded as a transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bonusAmount">Bonus Amount</Label>
              <Input
                id="bonusAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter bonus amount"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bonusReason">Reason</Label>
              <Textarea
                id="bonusReason"
                placeholder="Enter reason for bonus (e.g., Special reward, Compensation, etc.)"
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddBonusDialogOpen(false)}
              disabled={addBonusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBonus}
              disabled={addBonusMutation.isPending}
            >
              {addBonusMutation.isPending ? "Adding..." : "Add Bonus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDetail;
