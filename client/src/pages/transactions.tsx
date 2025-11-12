import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import React from "react";
import {Wallet, CreditCard, Search, Filter, Eye, Check, X, RefreshCw, Download, TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';


interface WalletTransaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  method?: string;
  reference?: string;
  upiRefId?: string;
  upiId?: string;
  screenshot?: string;
  createdAt: Date;
  updatedAt?: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
  userDetails?: {
    name: string;
    email: string;
    username?: string;
  };
}

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  upiRefId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  userDetails?: {
    name: string;
    email: string;
    username?: string;
  };
}

interface PendingWithdrawal {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  upiId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  userDetails?: {
    name: string;
    email: string;
    username?: string;  
  };
}

export default function AllTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | PendingDeposit | PendingWithdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch all wallet transactions
  const { data: allTransactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/transactions');
      const result = await res.json();
      return (result.transactions || []) as WalletTransaction[];
    }
  });

  // Fetch pending deposits
  const { data: pendingDeposits, isLoading: depositsLoading, refetch: refetchDeposits } = useQuery({
    queryKey: ['pending-deposits'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/deposits');
      const result = await res.json();
      return (result.data || result.deposits || []) as PendingDeposit[];
    }
  });

  // Fetch pending withdrawals
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/withdrawals');
      const result = await res.json();
      return (result.data || result.withdrawals || []) as PendingWithdrawal[];
    }
  });

  // Get combined transactions from all sources
  const getAllTransactions = () => {
    const mainTransactions = allTransactions || [];
    const deposits = (pendingDeposits || []).map(deposit => ({
      ...deposit,
      type: 'DEPOSIT' as const,
      reference: deposit.upiRefId
    }));
    const withdrawals = (pendingWithdrawals || []).map(withdrawal => ({
      ...withdrawal,
      type: 'WITHDRAWAL' as const,
      reference: withdrawal.upiId
    }));

    // Combine all transactions and remove duplicates based on ID and type
    const combined = [...mainTransactions, ...deposits, ...withdrawals];
    const uniqueTransactions = combined.filter((transaction, index, self) => 
      index === self.findIndex(t => t.id === transaction.id && t.type === transaction.type)
    );

    // Sort by creation date (newest first)
    return uniqueTransactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // Mutations for approving/rejecting transactions
  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'deposit' | 'withdrawal' }) => {
      return apiRequest('POST', `/wallet/${type}s/${id}/approve`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Transaction approved successfully',
      });
      refetchTransactions();
      refetchDeposits();
      refetchWithdrawals();
      setSelectedTransaction(null);
    },
    // 🔥 FIX: Enhanced Error Reporting
    onError: async (error) => {
      let errorMessage = 'Failed to approve transaction. Check server logs.';
      
      // Attempt to extract the detailed message from the error object
      try {
        // Assuming 'error' might contain the response body, which should have a 'message' field
        const response = (error as any).response;
        if (response && response.json) {
          const errorJson = await response.json();
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        }
      } catch (e) {
        // Fallback to generic message if JSON parsing fails or if it's a network error
        errorMessage = (error as Error).message || errorMessage;
      }

      toast({
        title: 'Error Approving Transaction',
        description: errorMessage, // Display the specific reason
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, type, reason }: { id: string; type: 'deposit' | 'withdrawal'; reason: string }) => {
      return apiRequest('POST', `/wallet/${type}s/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Transaction rejected successfully',
      });
      refetchTransactions();
      refetchDeposits();
      refetchWithdrawals();
      setSelectedTransaction(null);
      setRejectionReason('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject transaction',
        variant: 'destructive',
      });
    },
  });

  // Filter functions
  const filterTransactions = (transactions: any[]) => {
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.userDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.userDetails?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <Badge variant="outline" className="text-green-600 border-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          Deposit
        </Badge>;
      case 'WITHDRAWAL':
        return <Badge variant="outline" className="text-red-600 border-red-600">
          <TrendingDown className="w-3 h-3 mr-1" />
          Withdrawal
        </Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleApprove = (transaction: any) => {
    const type = transaction.type.toLowerCase();
    approveMutation.mutate({ id: transaction.id, type });
  };

  const handleReject = (transaction: any) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }
    const type = transaction.type.toLowerCase();
    rejectMutation.mutate({ id: transaction.id, type, reason: rejectionReason });
  };

  // Calculate stats
  const allTrans = getAllTransactions();
  const pendingCount = allTrans.filter(t => t.status === 'PENDING').length;
  const approvedCount = allTrans.filter(t => t.status === 'APPROVED').length;
  const rejectedCount = allTrans.filter(t => t.status === 'REJECTED').length;
  const totalAmount = allTrans.reduce((sum, t) => sum + t.amount, 0);

  if (transactionsLoading || depositsLoading || withdrawalsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">All Transactions</h1>
            <p className="text-gray-400 mt-1">Loading transaction data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <p className="text-gray-400 mt-1">Complete transaction history from all sources</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchTransactions();
              refetchDeposits();
              refetchWithdrawals();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Transactions</p>
                <h3 className="text-2xl font-bold">{allTrans.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending</p>
                <h3 className="text-2xl font-bold">{pendingCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Approved</p>
                <h3 className="text-2xl font-bold">{approvedCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <X className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Rejected</p>
                <h3 className="text-2xl font-bold">{rejectedCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by email, name, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEPOSIT">Deposits</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterTransactions(getAllTransactions()).map((transaction) => (
                <TableRow key={`${transaction.type}-${transaction.id}`}>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {formatDate(transaction.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {transaction.userDetails?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {transaction.userDetails?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {transaction.reference || '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {transaction.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(transaction)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <CreditCard className="h-5 w-5" />
                Transaction Details
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Complete information about this transaction
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transaction Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                  </div>                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                    <div className="mt-1">{getTypeBadge('type' in selectedTransaction ? selectedTransaction.type : ('upiRefId' in selectedTransaction ? 'DEPOSIT' : 'WITHDRAWAL'))}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedTransaction.userDetails?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.userDetails?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{selectedTransaction.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</p>
                    <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.userDetails?.username || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transaction Details</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</p>
                      <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedTransaction.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Currency</p>
                      <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.currency}</p>
                    </div>
                  </div>                  {('reference' in selectedTransaction && selectedTransaction.reference) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.reference}
                      </p>
                    </div>                  )}

                  {('upiRefId' in selectedTransaction && selectedTransaction.upiRefId) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI Reference ID</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.upiRefId}
                      </p>
                    </div>
                  )}

                  {('upiId' in selectedTransaction && selectedTransaction.upiId) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI ID</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.upiId}
                      </p>
                    </div>
                  )}

                  {selectedTransaction.rejectionReason && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejection Reason</p>
                      <p className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 rounded text-red-700 dark:text-red-200">
                        {selectedTransaction.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions for pending transactions */}
              {selectedTransaction.status === 'PENDING' && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => handleApprove(selectedTransaction)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </Button>
                    
                    <div className="flex-1">
                      <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mb-2"
                      />
                      <Button
                        onClick={() => handleReject(selectedTransaction)}
                        disabled={!rejectionReason.trim() || rejectMutation.isPending}
                        variant="destructive"
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
