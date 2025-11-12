import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import QRCode from 'qrcode';
import React from "react";
import {Wallet, CreditCard, Search, Filter, Eye, Check, X, RefreshCw, Download, TrendingUp, TrendingDown, Clock, QrCode, CheckCircle, Image as ImageIcon } from 'lucide-react';


// Replace AdminUpiConfig with AdminWalletConfig and upi-config with wallet-config
// type AdminWalletConfig, CurrencyWalletConfig, etc.
// Update all API calls from '/wallet/upi-config' to '/wallet/config'
// Update all variable and UI references from upiConfig to walletConfig
// Update UI labels from 'UPI Config' to 'Wallet/Payment Link Configuration'

// Multi-currency config
type Currency = 'INR' | 'NGN' | 'USD';
interface AdminWalletConfig {
  [currency: string]: {
    upiId?: string; // For INR
    qrCodeUrl?: string; // For INR
    displayName?: string;
    paymentLink?: string; // For NGN/USD
    isActive: boolean;
    updatedAt?: string;
    updatedBy?: string;
  };
}

// Add type definitions if missing
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
  screenshotUrl?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  processedAt?: Date | string;
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
  createdAt: Date | string;
  updatedAt?: Date | string;
  verifiedAt?: Date | string;
  verifiedBy?: string;
  rejectionReason?: string;
  userName?: string; 
  userEmail?: string; 
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
  createdAt: Date | string;
  updatedAt?: Date | string;
  verifiedAt?: Date | string;
  verifiedBy?: string;
  rejectionReason?: string;
  userDetails?: {
    name: string;
    email: string;
    username?: string;
  };
}

export default function WalletTransactionsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | PendingDeposit | PendingWithdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showWalletConfig, setShowWalletConfig] = useState(false);
  const [walletConfig, setWalletConfig] = useState<AdminWalletConfig>({});
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('INR');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  // Fetch all deposits (pending, approved, rejected)
  const { data: deposits, isLoading: depositsLoading, refetch: refetchDeposits } = useQuery({
    queryKey: ['wallet-deposits'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/deposits');
      const result = await res.json();
      return (result.data || result || []) as PendingDeposit[];
    }
  });
  
  // Fetch all withdrawals (pending, approved, rejected)
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['wallet-withdrawals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/withdrawals');
      const result = await res.json();
      return (result.data || result || []) as PendingWithdrawal[];
    }
  });

  // Fetch wallet config (multi-currency)
  const { data: adminWalletConfigData, refetch: refetchWalletConfig } = useQuery({
    queryKey: ['admin-wallet-config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/config');
      const result = await res.json();
      // Always return an object, never undefined
      return (result.data as AdminWalletConfig) || {};
    }
  });

  // Update wallet config mutation
  const updateWalletConfigMutation = useMutation({
    mutationFn: async (config: AdminWalletConfig) => {
      return apiRequest('POST', '/wallet/config', config);
    },
    onSuccess: () => {
      toast({
        title: 'Wallet Config Updated',
        description: 'Admin wallet configuration has been updated.',
      });
      refetchWalletConfig();
      setShowWalletConfig(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update wallet configuration.',
        variant: 'destructive',
      });
    },
  });

  // QR Code generation for INR
  useEffect(() => {
    const generateQrCode = async () => {
      const upiId = walletConfig['INR']?.upiId || adminWalletConfigData?.['INR']?.upiId;
      if (upiId) {
        try {
          const url = await QRCode.toDataURL(upiId, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 200,
          });
          setQrCodeUrl(url);
        } catch (error) {
          setQrCodeUrl('');
        }
      } else {
        setQrCodeUrl('');
      }
    };
    generateQrCode();
  }, [walletConfig, adminWalletConfigData]);

  // Mutations for approving/rejecting transactions
  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'deposit' | 'withdrawal' }) => {
      return apiRequest('POST', `/wallet/${type}s/${id}/approve`);
    },    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Transaction approved successfully',
      });
      refetchDeposits();
      refetchWithdrawals();
      setSelectedTransaction(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve transaction',
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, type, reason }: { id: string; type: 'deposit' | 'withdrawal'; reason: string }) => {
      return apiRequest('POST', `/wallet/${type}s/${id}/reject`, { reason });
    },    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Transaction rejected successfully',
      });
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
  
  // Get all transactions - deposits and withdrawals with all statuses
  const getAllTransactions = () => {
    const transactions: any[] = [];
    
    // Add all deposits (pending, approved, rejected)
    if (deposits) {
      const formattedDeposits = deposits.map(deposit => ({
        ...deposit,
        type: 'DEPOSIT',
        reference: deposit.upiRefId,
        // FIX: Map stored user name and email to userDetails object
        userDetails: {
            name: (deposit as any).userName || 'Unknown User', 
            email: (deposit as any).userEmail || 'N/A'
        },
        // Ensure we have the same structure as WalletTransaction
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt || deposit.verifiedAt,
        processedAt: deposit.verifiedAt,
        processedBy: deposit.verifiedBy
      }));
      transactions.push(...formattedDeposits);
    }
    
    // Add all withdrawals (pending, approved, rejected)
    if (withdrawals) {
      const formattedWithdrawals = withdrawals.map(withdrawal => ({
        ...withdrawal,
        type: 'WITHDRAWAL',
        reference: withdrawal.upiId,
        // Ensure we have the same structure as WalletTransaction
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt || withdrawal.verifiedAt,
        processedAt: withdrawal.verifiedAt,
        processedBy: withdrawal.verifiedBy
      }));
      transactions.push(...formattedWithdrawals);
    }
    
    // Sort by creation date (newest first)
    return transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

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
  const pendingDepositCount = allTrans.filter(t => t.type === 'DEPOSIT' && t.status === 'PENDING').length;
  const pendingWithdrawalCount = allTrans.filter(t => t.type === 'WITHDRAWAL' && t.status === 'PENDING').length;
  const totalPendingAmount = allTrans
    .filter(t => t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0);

  if (depositsLoading || withdrawalsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Wallet Transactions</h1>
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
      <div className="flex justify-between items-center">        <div>
          <h1 className="text-3xl font-bold">Wallet Management</h1>
          <p className="text-gray-400 mt-1">Manage pending deposits and withdrawals</p>
        </div><div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowWalletConfig(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code & Payment Link Management
          </Button>          <Button 
            variant="outline" 
            onClick={() => {
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
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Pending</p>
                <div className="flex items-center">
                  <h3 className="text-2xl font-bold">{pendingCount}</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending Deposits</p>
                <div className="flex items-center">
                  <h3 className="text-2xl font-bold">{pendingDepositCount}</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending Withdrawals</p>
                <div className="flex items-center">
                  <h3 className="text-2xl font-bold">{pendingWithdrawalCount}</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending Amount</p>
                <div className="flex items-center">
                  <h3 className="text-2xl font-bold">{formatCurrency(totalPendingAmount, selectedCurrency)}</h3>
                </div>
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
          <CardTitle>All Transactions</CardTitle>
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
                  <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.userDetails?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-400">{transaction.userDetails?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                  <TableCell className="text-sm text-gray-400">{transaction.reference}</TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      {/* Screenshot thumbnail if exists */}
                      {transaction.screenshotUrl && (
                        <>
                          <img
                            src={transaction.screenshotUrl}
                            alt="Screenshot"
                            className="w-8 h-8 object-cover rounded border hover:opacity-80 cursor-pointer"
                            title="View Screenshot"
                            onClick={() => setPreviewImageUrl(transaction.screenshotUrl)}
                          />
                        </>
                      )}
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
      </Card>      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Wallet className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review and manage this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (            <div className="space-y-6">
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
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                    <div className="mt-1">{getTypeBadge(
                      'type' in selectedTransaction 
                        ? selectedTransaction.type 
                        : 'upiRefId' in selectedTransaction 
                          ? 'DEPOSIT' 
                          : 'WITHDRAWAL'
                    )}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                  </div>
                </div>
              </div>              {/* User Information */}
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
              </div>              {/* Transaction Details */}
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
                  </div>

                  {/* Deposit-specific details */}
                  {'upiRefId' in selectedTransaction && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI Reference ID</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.upiRefId}
                      </p>
                    </div>
                  )}

                  {/* Withdrawal-specific details */}
                  {'upiId' in selectedTransaction && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI ID</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.upiId}
                      </p>
                    </div>
                  )}                  {/* General reference field */}
                  {('reference' in selectedTransaction && selectedTransaction.reference) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-gray-100 break-all">
                        {selectedTransaction.reference}
                      </p>
                    </div>
                  )}

                  {/* Payment method */}
                  {('method' in selectedTransaction && selectedTransaction.method) && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</p>
                      <p className="text-gray-900 dark:text-gray-100">{selectedTransaction.method}</p>
                    </div>
                  )}

                  {/* Processing details */}
                  {(('processedAt' in selectedTransaction && selectedTransaction.processedAt) || 
                    ('verifiedAt' in selectedTransaction && selectedTransaction.verifiedAt)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Processed At</p>
                        <p className="text-gray-900 dark:text-gray-100">{formatDate(
                          ('processedAt' in selectedTransaction && selectedTransaction.processedAt) || 
                          ('verifiedAt' in selectedTransaction && selectedTransaction.verifiedAt)
                        )}</p>
                      </div>
                      {(('processedBy' in selectedTransaction && selectedTransaction.processedBy) || 
                        ('verifiedBy' in selectedTransaction && selectedTransaction.verifiedBy)) && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Processed By</p>
                          <p className="text-gray-900 dark:text-gray-100">{
                            ('processedBy' in selectedTransaction && selectedTransaction.processedBy) || 
                            ('verifiedBy' in selectedTransaction && selectedTransaction.verifiedBy)
                          }</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {selectedTransaction.rejectionReason && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejection Reason</p>
                      <p className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 rounded text-red-700 dark:text-red-200">
                        {selectedTransaction.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>              {/* Actions for pending transactions */}
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
                      <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl w-[90vw]">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <X className="h-5 w-5 text-red-500" />
                            Reject Transaction
                          </DialogTitle>
                          <DialogDescription className="text-gray-600 dark:text-gray-400">
                            Please provide a detailed reason for rejecting this transaction. This will be visible to the user.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Transaction Summary */}
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Transaction to Reject</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-red-600 dark:text-red-400">Transaction ID:</span>
                                <p className="font-mono text-red-800 dark:text-red-200 break-all">{selectedTransaction.id}</p>
                              </div>
                              <div>
                                <span className="text-red-600 dark:text-red-400">Amount:</span>
                                <p className="font-semibold text-red-800 dark:text-red-200">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                              </div>
                              <div>
                                <span className="text-red-600 dark:text-red-400">User:</span>
                                <p className="text-red-800 dark:text-red-200">{selectedTransaction.userDetails?.name || 'Unknown'}</p>
                              </div>
                              <div>
                                <span className="text-red-600 dark:text-red-400">Type:</span>
                                <p className="text-red-800 dark:text-red-200">
                                  {'upiRefId' in selectedTransaction ? 'Deposit' : 'Withdrawal'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Rejection Reason Input */}
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Rejection Reason *
                              </Label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Provide a clear and specific reason for rejection. This will help the user understand what went wrong.
                              </p>
                            </div>
                            <Textarea
                              id="reason"
                              placeholder="Enter detailed reason for rejection (e.g., Invalid UPI reference, Insufficient documentation, etc.)..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="min-h-[100px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                              required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Character count: {rejectionReason.length}/500
                            </p>
                          </div>

                          {/* Warning Message */}
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400">⚠️</div>
                              <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">Important:</p>
                                <p className="text-amber-700 dark:text-amber-300">
                                  This action cannot be undone. The user will be notified via email about the rejection and the reason provided.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRejectionReason('');
                              }}
                              className="flex-1 text-gray-700 dark:text-gray-300"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleReject(selectedTransaction)}
                              disabled={!rejectionReason.trim() || rejectionReason.length < 10 || rejectMutation.isPending}
                              className="flex-1"
                            >
                              {rejectMutation.isPending ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Processing...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <X className="h-4 w-4" />
                                  Confirm Rejection
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* Payment Screenshot for manual deposit */}
              {'screenshotUrl' in selectedTransaction && selectedTransaction.screenshotUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Screenshot</p>
                  <a href={selectedTransaction.screenshotUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedTransaction.screenshotUrl}
                      alt="Payment Screenshot"
                      className="max-w-xs max-h-64 border rounded shadow mb-2 cursor-pointer hover:opacity-80"
                    />
                  </a>
                  <a
                    href={selectedTransaction.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline text-xs"
                  >
                    View Full Image / Download
                  </a>
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
          )}
        </DialogContent>      </Dialog>

      {/* QR Code & Payment Link Management Dialog */}
      {showWalletConfig && (
        <Dialog open={showWalletConfig} onOpenChange={setShowWalletConfig}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code & Payment Link Configuration
              </DialogTitle>
              <DialogDescription>
                Configure payment options for INR, NGN, and USD wallets. Players will see these options when making deposits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Currency Selector */}
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={selectedCurrency} onValueChange={val => setSelectedCurrency(val as Currency)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (India)</SelectItem>
                    <SelectItem value="NGN">NGN (Nigeria)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Config Fields by Currency */}
              {selectedCurrency === 'INR' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi-id" className="text-sm font-medium">UPI ID</Label>
                    <Input
                      id="upi-id"
                      value={walletConfig['INR']?.upiId || adminWalletConfigData?.['INR']?.upiId || ''}
                      onChange={e => setWalletConfig(prev => ({
                        ...prev,
                        INR: {
                          ...prev['INR'],
                          upiId: e.target.value,
                          displayName: prev['INR']?.displayName || adminWalletConfigData?.['INR']?.displayName || 'Netwin Gaming',
                          isActive: prev['INR']?.isActive ?? adminWalletConfigData?.['INR']?.isActive ?? true
                        }
                      }))}
                      placeholder="admin@paytm"
                    />
                    <Label htmlFor="display-name" className="text-sm font-medium">Display Name</Label>
                    <Input
                      id="display-name"
                      value={walletConfig['INR']?.displayName || adminWalletConfigData?.['INR']?.displayName || ''}
                      onChange={e => setWalletConfig(prev => ({
                        ...prev,
                        INR: {
                          ...prev['INR'],
                          upiId: prev['INR']?.upiId || adminWalletConfigData?.['INR']?.upiId || '',
                          displayName: e.target.value,
                          isActive: prev['INR']?.isActive ?? adminWalletConfigData?.['INR']?.isActive ?? true
                        }
                      }))}
                      placeholder="Netwin Gaming"
                    />
                    <div className="flex items-center gap-2">
                      <Label htmlFor="qr-active" className="text-sm">Active</Label>
                      <Switch
                        id="qr-active"
                        checked={walletConfig['INR']?.isActive ?? adminWalletConfigData?.['INR']?.isActive ?? true}
                        onCheckedChange={checked => setWalletConfig(prev => ({
                          ...prev,
                          INR: {
                            ...prev['INR'],
                            isActive: checked
                          }
                        }))}
                      />
                    </div>
                  </div>
                  {/* QR Code Preview */}
                  <div>
                    <p className="text-sm font-medium mb-2">QR Code Preview</p>
                    <div className="bg-white p-4 border rounded-lg text-center">
                      {qrCodeUrl ? (
                        <div className="space-y-2">
                          <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" />
                          <p className="text-xs text-gray-600">
                            UPI ID: {walletConfig['INR']?.upiId || adminWalletConfigData?.['INR']?.upiId}
                          </p>
                          <p className="text-xs text-gray-600">
                            {walletConfig['INR']?.displayName || adminWalletConfigData?.['INR']?.displayName}
                          </p>
                        </div>
                      ) : (
                        <div className="w-48 h-48 mx-auto flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                          <div className="text-center">
                            <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-400 text-sm">Enter UPI ID to generate QR code</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="payment-link" className="text-sm font-medium">Payment Link ({selectedCurrency})</Label>
                  <Input
                    id="payment-link"
                    value={walletConfig[selectedCurrency]?.paymentLink || adminWalletConfigData?.[selectedCurrency]?.paymentLink || ''}
                    onChange={e => setWalletConfig(prev => ({
                      ...prev,
                      [selectedCurrency]: {
                        ...prev[selectedCurrency],
                        paymentLink: e.target.value,
                        displayName: prev[selectedCurrency]?.displayName || adminWalletConfigData?.[selectedCurrency]?.displayName || '',
                        isActive: prev[selectedCurrency]?.isActive ?? adminWalletConfigData?.[selectedCurrency]?.isActive ?? true
                      }
                    }))}
                    placeholder={`https://pay.example.com/${selectedCurrency}`}
                  />
                  <Label htmlFor="display-name-link" className="text-sm font-medium">Display Name</Label>
                  <Input
                    id="display-name-link"
                    value={walletConfig[selectedCurrency]?.displayName || adminWalletConfigData?.[selectedCurrency]?.displayName || ''}
                    onChange={e => setWalletConfig(prev => ({
                      ...prev,
                      [selectedCurrency]: {
                        ...prev[selectedCurrency],
                        paymentLink: prev[selectedCurrency]?.paymentLink || adminWalletConfigData?.[selectedCurrency]?.paymentLink || '',
                        displayName: e.target.value,
                        isActive: prev[selectedCurrency]?.isActive ?? adminWalletConfigData?.[selectedCurrency]?.isActive ?? true
                      }
                    }))}
                    placeholder="Netwin Gaming"
                  />
                  <div className="flex items-center gap-2">
                    <Label htmlFor="link-active" className="text-sm">Active</Label>
                    <Switch
                      id="link-active"
                      checked={walletConfig[selectedCurrency]?.isActive ?? adminWalletConfigData?.[selectedCurrency]?.isActive ?? true}
                      onCheckedChange={checked => setWalletConfig(prev => ({
                        ...prev,
                        [selectedCurrency]: {
                          ...prev[selectedCurrency],
                          isActive: checked
                        }
                      }))}
                    />
                  </div>
                </div>
              )}
              {/* Save/Cancel Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => updateWalletConfigMutation.mutate(walletConfig)}
                  disabled={updateWalletConfigMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateWalletConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWalletConfig(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Screenshot Preview Modal */}
      <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent className="max-w-lg w-full flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Payment Screenshot Preview"
              className="max-w-full max-h-[70vh] rounded border shadow mb-2"
            />
          )}
          <Button variant="outline" onClick={() => setPreviewImageUrl(null)} className="mt-2">Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
