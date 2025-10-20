import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import QRCode from 'qrcode';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, X, Eye, Search, RefreshCw, QrCode, Settings, DollarSign, Download, Upload, Image as ImageIcon } from 'lucide-react';


interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  upiRefId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  userDetails: {
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
  upiId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  userDetails: {
    name: string;
    email: string;
    username?: string;
  };
  bankDetails?: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    recipientAddress?: string;
    bankAddress?: string;
    routingNumber?: string;
    ifsc?: string;
    swiftCode?: string;
  };
}

interface CurrencyWalletConfig {
  upiId?: string;
  qrCodeUrl?: string;
  displayName: string;
  paymentLink?: string;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

interface AdminWalletConfig {
  INR?: CurrencyWalletConfig;
  NGN?: CurrencyWalletConfig;
  USD?: CurrencyWalletConfig;
}

interface UserTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'winning' | 'entry_fee' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  description: string;
  reference?: string;
  tournamentId?: string;
  tournamentName?: string;
  createdAt: string;
  updatedAt?: string;
}

interface UserAllTransactions {
  userId: string;
  userName: string;
  userEmail: string;
  walletBalance: number;
  transactions: UserTransaction[];
  totalDeposits: number;
  totalWithdrawals: number;
  totalWinnings: number;
  totalEntryFees: number;
}

const WalletManagement = () => {
  // Helper to render bank details for withdrawals
  const renderBankDetails = (bankDetails?: PendingWithdrawal['bankDetails'], currency?: string) => {
    if (!bankDetails) return null;
    return (
      <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
        {bankDetails.accountName && <div><b>Account Name:</b> {bankDetails.accountName}</div>}
        {bankDetails.bankName && <div><b>Bank Name:</b> {bankDetails.bankName}</div>}
        {bankDetails.accountNumber && <div><b>Account Number:</b> {bankDetails.accountNumber}</div>}
        {bankDetails.recipientAddress && <div><b>Recipient Address:</b> {bankDetails.recipientAddress}</div>}
        {bankDetails.bankAddress && <div><b>Bank Address:</b> {bankDetails.bankAddress}</div>}
        {bankDetails.routingNumber && <div><b>Routing Number:</b> {bankDetails.routingNumber}</div>}
        {bankDetails.ifsc && <div><b>IFSC:</b> {bankDetails.ifsc}</div>}
        {bankDetails.swiftCode && <div><b>SWIFT Code:</b> {bankDetails.swiftCode}</div>}
      </div>
    );
  };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("deposits");
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<PendingDeposit | PendingWithdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showWalletConfig, setShowWalletConfig] = useState(false);
  const [walletConfig, setWalletConfig] = useState<AdminWalletConfig | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'NGN' | 'USD'>('INR');
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedUserTransactions, setSelectedUserTransactions] = useState<UserAllTransactions | null>(null);

  // Fetch pending deposits
  const { data: deposits, isLoading: depositsLoading, refetch: refetchDeposits } = useQuery({
    queryKey: ['pending-deposits'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/deposits');
      return await res.json() as PendingDeposit[];
    }
  });

  // Fetch pending withdrawals  
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['pending-withdrawals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/withdrawals');
      return await res.json() as PendingWithdrawal[];
    }
  });

  // Fetch Wallet config
  const { data: adminWalletConfigData, refetch: refetchWalletConfig } = useQuery({
    queryKey: ['admin-wallet-config'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/wallet/config');
      return await res.json() as AdminWalletConfig;
    },
  });

  // Approve deposit mutation
  const approveDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      return apiRequest('POST', `/wallet/deposits/${depositId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: 'Deposit Approved',
        description: 'Deposit request has been approved and wallet credited.',
      });
      refetchDeposits();
      setSelectedRequest(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve deposit request.',
        variant: 'destructive',
      });
    },
  });

  // Reject deposit mutation
  const rejectDepositMutation = useMutation({
    mutationFn: async ({ depositId, reason }: { depositId: string; reason: string }) => {
      return apiRequest('POST', `/wallet/deposits/${depositId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: 'Deposit Rejected',
        description: 'Deposit request has been rejected.',
      });
      refetchDeposits();
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject deposit request.',
        variant: 'destructive',
      });
    },
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      return apiRequest('POST', `/wallet/withdrawals/${withdrawalId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: 'Withdrawal Approved',
        description: 'Withdrawal request has been approved and processed.',
      });
      refetchWithdrawals();
      setSelectedRequest(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to approve withdrawal request.',
        variant: 'destructive',
      });
    },
  });

  // Reject withdrawal mutation
  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) => {
      return apiRequest('POST', `/wallet/withdrawals/${withdrawalId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: 'Withdrawal Rejected',
        description: 'Withdrawal request has been rejected.',
      });
      refetchWithdrawals();
      setSelectedRequest(null);
      setRejectionReason('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject withdrawal request.',
        variant: 'destructive',
      });
    },
  });

  // Update Wallet config mutation
  const updateWalletConfigMutation = useMutation({
    mutationFn: async (config: AdminWalletConfig) => {
      return apiRequest('POST', '/wallet/config', config);
    },
    onSuccess: () => {
      refetchWalletConfig();
      toast({
        title: 'Wallet Config Updated',
        description: 'Admin wallet configuration has been updated.',
      });
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

  // Fetch all transactions for a specific user
  const fetchUserAllTransactions = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest('GET', `/users/${userId}/all-transactions`);
      return await res.json() as UserAllTransactions;
    },
    onSuccess: (data) => {
      setSelectedUserTransactions(data);
      setShowAllTransactions(true);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to fetch user transactions.',
        variant: 'destructive',
      });
    },
  });
  // Filter functions
  const filterDeposits = (deposits: PendingDeposit[] = []) => {
    return deposits.filter(deposit => {
      const matchesSearch = !searchTerm || 
        deposit.userDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.userDetails.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deposit.upiRefId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const filterWithdrawals = (withdrawals: PendingWithdrawal[] = []) => {
    return withdrawals.filter(withdrawal => {
      const matchesSearch = !searchTerm || 
        withdrawal.userDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.userDetails.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.upiId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-600 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // QR Code generation effect
  useEffect(() => {
    if (selectedCurrency === 'INR' && walletConfig?.INR?.upiId) {
      const generateQrCode = async () => {
        try {
          const url = await QRCode.toDataURL(walletConfig.INR.upiId, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 200,
          });
          setQrCodeUrl(url);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };
      generateQrCode();
    } else {
      setQrCodeUrl('');
    }
  }, [walletConfig, selectedCurrency]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Wallet Management</h2>
          <p className="text-gray-400">Manage deposit and withdrawal requests</p>
        </div>
        <div className="flex gap-2">          <Button
            variant="outline"
            onClick={() => setShowWalletConfig(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code Management
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetchDeposits();
              refetchWithdrawals();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Deposits</p>
                <p className="text-2xl font-bold">
                  {deposits?.filter(d => d.status === 'PENDING').length || 0}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Withdrawals</p>
                <p className="text-2xl font-bold">
                  {withdrawals?.filter(w => w.status === 'PENDING').length || 0}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Deposit Amount</p>
                <p className="text-2xl font-bold">
                  ₹{deposits?.filter(d => d.status === 'PENDING').reduce((sum, d) => sum + d.amount, 0).toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Withdrawal Amount</p>
                <p className="text-2xl font-bold">
                  ₹{withdrawals?.filter(w => w.status === 'PENDING').reduce((sum, w) => sum + w.amount, 0).toLocaleString() || 0}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="deposits">Deposit Requests</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Requests</CardTitle>
              <CardDescription>
                Review and approve/reject deposit requests from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UPI Ref ID</TableHead>
                    <TableHead>Payment Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterDeposits(deposits).map((deposit) => (
                    <TableRow key={deposit.id}>                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{deposit.userDetails.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{deposit.userDetails.email}</p>                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(deposit.amount)}</TableCell>
                      <TableCell className="font-mono text-sm">{deposit.upiRefId}</TableCell>
                      <TableCell>
                        {(deposit as any).screenshotUrl ? (
                          <div className="flex items-center gap-2">
                            <img 
                              src={(deposit as any).screenshotUrl} 
                              alt="Payment Screenshot" 
                              className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open((deposit as any).screenshotUrl, '_blank')}
                              title="Click to view full image"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open((deposit as any).screenshotUrl, '_blank')}
                              className="text-xs"
                            >
                              <ImageIcon className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No proof uploaded</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell>{formatDate(deposit.createdAt)}</TableCell>                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(deposit)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchUserAllTransactions.mutate(deposit.userId)}
                            disabled={fetchUserAllTransactions.isPending}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            All Transactions
                          </Button>
                          {deposit.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveDepositMutation.mutate(deposit.id)}
                                disabled={approveDepositMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
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
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                Review and approve/reject withdrawal requests from users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterWithdrawals(withdrawals).map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{withdrawal.userDetails.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{withdrawal.userDetails.email}</p>
                        </div>
                        {renderBankDetails(withdrawal.bankDetails, withdrawal.currency)}
                      </TableCell>
                      <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell className="font-mono text-sm">{withdrawal.upiId || '-'}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(withdrawal)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchUserAllTransactions.mutate(withdrawal.userId)}
                            disabled={fetchUserAllTransactions.isPending}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            All Transactions
                          </Button>
                          {withdrawal.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                                disabled={approveWithdrawalMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
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
          </Card>        </TabsContent>
      </Tabs>

      {/* Request Review Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {'upiRefId' in selectedRequest ? 'Deposit Request' : 'Withdrawal Request'} Review
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Review the details and approve or reject this request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Transaction ID Section */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction ID</h3>
                <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{selectedRequest.id}</p>
              </div>

              {/* Status and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</h3>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {'upiRefId' in selectedRequest ? 'Deposit' : 'Withdrawal'}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedRequest.amount)}</p>
              </div>

              {/* User Information */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedRequest.userDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
                    <p className="text-gray-900 dark:text-gray-100">{selectedRequest.userDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">User ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{selectedRequest.userId}</p>
                  </div>
                  {selectedRequest.userDetails.username && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Username</p>
                      <p className="text-gray-900 dark:text-gray-100">{selectedRequest.userDetails.username}</p>
                    </div>
                  )}
                </div>
              </div>              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Transaction Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created At</p>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currency</p>
                    <p className="text-gray-900 dark:text-gray-100">{selectedRequest.currency}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {'upiRefId' in selectedRequest ? 'UPI Reference ID' : 'UPI ID'}
                    </p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                      {'upiRefId' in selectedRequest ? selectedRequest.upiRefId : selectedRequest.upiId}
                    </p>
                  </div>
                  {selectedRequest.verifiedAt && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verified At</p>
                      <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedRequest.verifiedAt)}</p>
                    </div>
                  )}
                  {selectedRequest.verifiedBy && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verified By</p>
                      <p className="text-gray-900 dark:text-gray-100">{selectedRequest.verifiedBy}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Proof (for deposits) */}
              {'upiRefId' in selectedRequest && (selectedRequest as any).screenshotUrl && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Payment Proof</h3>
                  <div className="flex flex-col gap-3">
                    <a
                      href={(selectedRequest as any).screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={(selectedRequest as any).screenshotUrl}
                        alt="Payment Screenshot"
                        className="max-w-full max-h-96 rounded border shadow hover:scale-105 transition-transform duration-200 cursor-pointer"
                      />
                    </a>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open((selectedRequest as any).screenshotUrl, '_blank')}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = (selectedRequest as any).screenshotUrl;
                          link.download = `payment-proof-${selectedRequest.id}.jpg`;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Click image to view full size or use buttons above</p>
                  </div>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Rejection Reason</h3>
                  <p className="text-red-800 dark:text-red-200">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}              {/* Actions */}
              {selectedRequest.status === 'PENDING' && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        if ('upiRefId' in selectedRequest) {
                          approveDepositMutation.mutate(selectedRequest.id);
                        } else {
                          approveWithdrawalMutation.mutate(selectedRequest.id);
                        }
                      }}
                      disabled={approveDepositMutation.isPending || approveWithdrawalMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Request</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejecting this request
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if ('upiRefId' in selectedRequest) {
                                  rejectDepositMutation.mutate({
                                    depositId: selectedRequest.id,
                                    reason: rejectionReason
                                  });
                                } else {
                                  rejectWithdrawalMutation.mutate({
                                    withdrawalId: selectedRequest.id,
                                    reason: rejectionReason
                                  });
                                }
                              }}
                              disabled={!rejectionReason.trim() || rejectDepositMutation.isPending || rejectWithdrawalMutation.isPending}
                              variant="destructive"
                            >
                              Confirm Rejection
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Wallet Config Dialog */}
      {showWalletConfig && (
        <Dialog open={showWalletConfig} onOpenChange={setShowWalletConfig}>
          <DialogContent className="max-w-full w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl p-2 sm:p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <QrCode className="h-5 w-5" />
                QR Code Management & Payment Link Configuration
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Configure payment links for INR, NGN, and USD wallets
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Currency Selector - always visible */}
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-sm font-medium">Currency</Label>
                <Select value={selectedCurrency} onValueChange={v => setSelectedCurrency(v as 'INR'|'NGN'|'USD')}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (India)</SelectItem>
                    <SelectItem value="NGN">NGN (Nigeria)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* UPI/Link Input - label changes by currency */}
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-sm font-medium">{selectedCurrency === 'INR' ? 'UPI ID' : 'Payment Link'}</Label>
                <Input
                  value={walletConfig?.[selectedCurrency]?.upiId || ''}
                  onChange={e => setWalletConfig(prev => ({
                    ...prev,
                    [selectedCurrency]: {
                      ...prev?.[selectedCurrency],
                      upiId: e.target.value,
                      displayName: prev?.[selectedCurrency]?.displayName || '',
                      isActive: prev?.[selectedCurrency]?.isActive ?? true
                    }
                  }))}
                  placeholder={selectedCurrency === 'INR' ? 'admin@paytm' : 'Paste payment link'}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-sm font-medium">Display Name</Label>
                <Input
                  value={walletConfig?.[selectedCurrency]?.displayName || ''}
                  onChange={e => setWalletConfig(prev => ({
                    ...prev,
                    [selectedCurrency]: {
                      ...prev?.[selectedCurrency],
                      upiId: prev?.[selectedCurrency]?.upiId || '',
                      displayName: e.target.value,
                      isActive: prev?.[selectedCurrency]?.isActive ?? true
                    }
                  }))}
                  placeholder="Netwin Gaming"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="qr-active" className="text-sm">Active</Label>
                <Switch
                  id="qr-active"
                  checked={walletConfig?.[selectedCurrency]?.isActive ?? true}
                  onCheckedChange={checked => setWalletConfig(prev => ({
                    ...prev,
                    [selectedCurrency]: {
                      ...prev?.[selectedCurrency],
                      isActive: checked,
                      upiId: prev?.[selectedCurrency]?.upiId || '',
                      displayName: prev?.[selectedCurrency]?.displayName || ''
                    }
                  }))}
                />
              </div>
              {/* Only show QR code for INR */}
              {selectedCurrency === 'INR' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      QR Code Management
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">QR Code Preview</p>
                      <div className="bg-white p-4 border rounded-lg text-center">
                        {qrCodeUrl ? (
                          <div className="space-y-2">
                            <img src={qrCodeUrl} alt="UPI QR Code" className="w-40 h-40 sm:w-48 sm:h-48 mx-auto" />
                            <p className="text-xs text-gray-600">
                              UPI ID: {walletConfig?.INR?.upiId}
                            </p>
                            <p className="text-xs text-gray-600">
                              {walletConfig?.INR?.displayName}
                            </p>
                          </div>
                        ) : (
                          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                            <div className="text-center">
                              <QrCode className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-2" />
                              <p className="text-gray-400 text-xs sm:text-sm">Enter UPI ID to generate QR code</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    if (walletConfig) {
                      updateWalletConfigMutation.mutate(walletConfig);
                    }
                  }}
                  disabled={!walletConfig?.[selectedCurrency]?.upiId || updateWalletConfigMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updateWalletConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" onClick={() => setShowWalletConfig(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All Transactions Dialog */}
      {showAllTransactions && selectedUserTransactions && (
        <Dialog open={showAllTransactions} onOpenChange={setShowAllTransactions}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                All Transactions - {selectedUserTransactions.userName}
              </DialogTitle>
              <DialogDescription>
                Complete transaction history for {selectedUserTransactions.userEmail}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-hidden">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Wallet Balance</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedUserTransactions.walletBalance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Deposits</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(selectedUserTransactions.totalDeposits)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Withdrawals</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(selectedUserTransactions.totalWithdrawals)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Winnings</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(selectedUserTransactions.totalWinnings)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Entry Fees Paid</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(selectedUserTransactions.totalEntryFees)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUserTransactions.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>                          <TableCell className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                transaction.type === 'deposit' ? 'border-blue-500 text-blue-600' :
                                transaction.type === 'withdrawal' ? 'border-red-500 text-red-600' :
                                transaction.type === 'winning' ? 'border-green-500 text-green-600' :
                                transaction.type === 'entry_fee' ? 'border-purple-500 text-purple-600' :
                                'border-gray-500 text-gray-600'
                              }
                            >
                              {transaction.type === 'entry_fee' ? 'Entry Fee' : 
                               transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </Badge>
                          </TableCell>                          <TableCell className="max-w-[300px]">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-gray-100">{transaction.description}</p>
                              {transaction.tournamentName && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Tournament: {transaction.tournamentName}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`font-medium ${
                            transaction.type === 'entry_fee' || transaction.type === 'withdrawal'
                              ? 'text-red-500'
                              : 'text-green-500'
                          }`}>
                            {transaction.type === 'entry_fee' || transaction.type === 'withdrawal'
                              ? `-${formatCurrency(transaction.amount)}`
                              : `+${formatCurrency(transaction.amount)}`
                            }
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                transaction.status === 'completed' ? 'bg-green-600' :
                                transaction.status === 'pending' ? 'bg-yellow-600' :
                                transaction.status === 'failed' || transaction.status === 'rejected' ? 'bg-red-600' :
                                'bg-gray-600'
                              }
                            >
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                          </TableCell>                          <TableCell className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {transaction.reference || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>              {selectedUserTransactions.transactions.length === 0 && (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No transactions found for this user</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAllTransactions(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WalletManagement;
