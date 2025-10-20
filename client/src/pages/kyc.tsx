import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Filter, Download, Upload, MoreHorizontal, Eye, Check, X, Clock, AlertTriangle, Shield, UserCheck, UserX, FileText, Camera, CreditCard, Home, Users, TrendingUp, Activity, Settings, RefreshCw, CheckCircle, Loader2, Maximize2, ZoomIn, ThumbsUp, ThumbsDown, MessageSquare, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { format, parseISO } from "date-fns";
import { getInitials, formatCurrency } from "@/lib/utils";
import { safeFormat } from "@/lib/utils/date-utils";

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

// KYC status type (uppercase)
export type KYCStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

// Add docId to KYC document types
interface KycDocumentWithId {
  url: string;
  fileName: string;
  uploadedAt: string;
  docId: string;
}

interface KYCUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  walletBalance: number;
  kycStatus: KYCStatus;
  kycDocuments?: {
    idProof?: KycDocumentWithId;
    addressProof?: KycDocumentWithId;
    selfie?: KycDocumentWithId;
  };
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycRejectedAt?: string;
  kycRejectionReason?: string;
  verificationNotes?: string;
  riskScore?: number;
  status: 'active' | 'inactive' | 'banned';
  location?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  avatar?: string;
}

interface KYCFilters {
  status: string;
  riskLevel: string;
  dateRange: string;
  region: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface KYCStats {
  totalSubmissions: number;
  pendingReview: number;
  verified: number;
  rejected: number;
  averageProcessingTime: number;
  todaySubmissions: number;
  highRiskUsers: number;
  automatedApprovals: number;
}

const KYC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [showDocumentReviewDialog, setShowDocumentReviewDialog] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string>();
  const [filters, setFilters] = useState<KYCFilters>({
    status: 'all',
    riskLevel: 'all',
    dateRange: 'all',
    region: 'all',
    sortBy: 'kycSubmittedAt',
    sortOrder: 'desc'
  });

  const { toast } = useToast();

  // Fetch KYC users with filters
  const { data: kycResponse, isLoading, refetch } = useQuery<{users: KYCUser[], pagination: any}>({
    queryKey: ['kycUsers', filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });

      const response = await apiRequest("GET", `/admin/kyc?${params}`);
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every minute for new submissions
  });

  // Extract users array from response
  const kycUsers = kycResponse?.users || [];

  // Fetch KYC statistics
  const { data: stats } = useQuery<KYCStats>({
    queryKey: ['kycStats'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/admin/kyc/stats");
      return response.json();
    },
    staleTime: 60000,
  });

  // Filter users based on search
  const filteredUsers = kycUsers.filter((user: KYCUser) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Handle verification action
  const handleVerification = async (userId: string, action: 'approve' | 'reject', reason?: string, notes?: string, docId?: string) => {
    console.log("FUNCTION DEPRECATED - SHOULD NOT BE CALLED");
    console.log(`Preventing old verification method for user ${userId} - Action: ${action}`);
    
    // Don't proceed with the old method
    toast({
      title: "Error",
      description: "Using deprecated method. Please refresh the page.",
      variant: "destructive",
    });
    
    return false;
    
    // The code below should never run, keeping for reference
    try {
      console.log(`Verifying KYC for user ${userId} - Action: ${action}`, { reason, notes, docId });
      setIsProcessing(true);
      await apiRequest("PATCH", `/users/${userId}/kyc`, {
        kycStatus: action === 'approve' ? 'approved' : 'rejected',
        docId,
        rejectionReason: reason,
        notes
      });

      toast({
        title: "Verification Complete",
        description: `KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });

      setVerificationAction(null);
      setRejectionReason("");
      setVerificationNotes("");
      setCurrentDocId(undefined);
      setShowUserDetails(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process KYC verification.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk verification
  const handleBulkVerification = async (action: 'approve' | 'reject') => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users for bulk verification.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      await apiRequest("POST", "/admin/kyc/bulk", {
        action,
        userIds: selectedUsers
      });

      toast({
        title: "Bulk Verification Complete",
        description: `${selectedUsers.length} users ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });

      setSelectedUsers([]);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process bulk verification.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export KYC data
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (selectedUsers.length > 0) {
        params.append('userIds', selectedUsers.join(','));
      }

      const response = await apiRequest("GET", `/admin/kyc/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyc_export_${format}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `KYC data exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export KYC data.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <X className="h-4 w-4 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'APPROVED':
        return 'bg-green-500/20 text-green-700';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-200 text-gray-500';
    }
  };

  const getRiskColor = (score?: number) => {
    if (!score) return 'bg-gray-400';
    if (score < 30) return 'bg-green-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      <Helmet>
        <title>KYC Verification | NetWin Admin</title>
        <meta name="description" content="Comprehensive KYC verification and compliance management" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              KYC Verification
            </h1>
            <p className="text-muted-foreground">
              Manage identity verification and compliance for all users
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkVerification('approve')}
                  disabled={isProcessing}
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve ({selectedUsers.length})
                </Button>
                <Button
                  onClick={() => handleBulkVerification('reject')}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject ({selectedUsers.length})
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.todaySubmissions} submitted today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.verified / stats.totalSubmissions) * 100).toFixed(1)}% approval rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageProcessingTime}h</div>
                <p className="text-xs text-muted-foreground">
                  Average verification time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.highRiskUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Require manual review
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <Label>KYC Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Risk Level</Label>
                    <Select value={filters.riskLevel} onValueChange={(value) => setFilters({...filters, riskLevel: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Region</Label>
                    <Select value={filters.region} onValueChange={(value) => setFilters({...filters, region: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="asia">Asia</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kycSubmittedAt">Submission Date</SelectItem>
                        <SelectItem value="riskScore">Risk Score</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="createdAt">Registration Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KYC Users Table */}
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
                        <TableHead>KYC Status</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Submitted</TableHead>
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
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(user.walletBalance)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
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
                            <div className="flex items-center gap-2">
                              {getStatusIcon(user.kycStatus)}
                              <Badge className={getStatusColor(user.kycStatus)}>
                                {user.kycStatus}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.riskScore !== undefined ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRiskColor(user.riskScore).replace('bg-', '') }} />
                                <span className="text-sm">{user.riskScore}/100</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>                          <TableCell>
                            <p className="text-sm">
                              {user.kycSubmittedAt ? safeFormat(user.kycSubmittedAt, 'MMM dd, yyyy', 'Not submitted') : 'Not submitted'}
                            </p>
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
                                  Review KYC
                                </DropdownMenuItem>
                                {user.kycStatus?.toUpperCase() === 'PENDING' && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      const docId = user.kycDocuments?.idProof?.docId || 
                                                 user.kycDocuments?.addressProof?.docId || 
                                                 user.kycDocuments?.selfie?.docId;
                                      // Directly call API to avoid any closure issues
                                      setIsProcessing(true);
                                      apiRequest("PATCH", `/users/${user.id}/kyc`, {
                                        kycStatus: 'APPROVED', // Ensure uppercase to match server expectations
                                        docId: docId
                                      }).then(() => {
                                        toast({
                                          title: "Success",
                                          description: "KYC approved successfully"
                                        });
                                        refetch();
                                      }).catch(err => {
                                        toast({
                                          title: "Error",
                                          description: "Failed to approve KYC",
                                          variant: "destructive"
                                        });
                                        console.error("KYC approval error:", err);
                                      }).finally(() => {
                                        setIsProcessing(false);
                                      });
                                    }}>
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedUser(user);
                                      setVerificationAction('reject');
                                    }}>
                                      <X className="h-4 w-4 mr-2 text-red-500" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No KYC submissions found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User KYC Details Sheet */}
        <Sheet open={showUserDetails} onOpenChange={setShowUserDetails}>
          <SheetContent className="w-full max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>KYC Verification Review</SheetTitle>
              <SheetDescription>
                Review and verify user's identity documents
              </SheetDescription>
            </SheetHeader>

            {selectedUser && (
              <div className="mt-6 space-y-6">
                {/* User Profile */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getStatusColor(selectedUser.kycStatus)}>
                        {selectedUser.kycStatus}
                      </Badge>
                      {selectedUser.riskScore !== undefined && (
                        <Badge variant="outline">
                          Risk Score: {selectedUser.riskScore}/100
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="documents" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="documents" className="space-y-4">
                    {selectedUser.kycDocuments ? (
                      <div className="space-y-4">
                        {/* Group ID Proof documents together */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              ID Proof
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {selectedUser.kycDocuments.idProof && safeFormat(selectedUser.kycDocuments.idProof.uploadedAt, 'MMM dd, yyyy')}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Document thumbnails in a row */}
                              <div className="grid grid-cols-3 gap-2">
                                {/* Front Side */}
                                {selectedUser.kycDocuments.idProof && (
                                  <div className="space-y-1">
                                    <div 
                                      className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                                      onClick={() => {
                                        setSelectedImage(selectedUser.kycDocuments!.idProof!.url);
                                        setShowImageViewer(true);
                                      }}
                                    >
                                      <img 
                                        src={selectedUser.kycDocuments.idProof.url}
                                        alt="Front Side" 
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 text-center">
                                        Front Side
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Back Side */}
                                {selectedUser.kycDocuments.addressProof && (
                                  <div className="space-y-1">
                                    <div 
                                      className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                                      onClick={() => {
                                        setSelectedImage(selectedUser.kycDocuments!.addressProof!.url);
                                        setShowImageViewer(true);
                                      }}
                                    >
                                      <img 
                                        src={selectedUser.kycDocuments.addressProof.url}
                                        alt="Back Side" 
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 text-center">
                                        Back Side
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Selfie */}
                                {selectedUser.kycDocuments.selfie && (
                                  <div className="space-y-1">
                                    <div 
                                      className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                                      onClick={() => {
                                        setSelectedImage(selectedUser.kycDocuments!.selfie!.url);
                                        setShowImageViewer(true);
                                      }}
                                    >
                                      <img 
                                        src={selectedUser.kycDocuments.selfie.url}
                                        alt="Selfie" 
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 text-center">
                                        Selfie
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* View all button */}
                              <Button 
                                className="w-full" 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowDocumentReviewDialog(true)}
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                View All Documents
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No documents submitted</h3>
                        <p className="text-muted-foreground">User hasn't uploaded KYC documents yet.</p>
                      </div>
                    )}

                    {/* Verification Actions */}
                    {selectedUser.kycStatus === 'PENDING' && selectedUser.kycDocuments && (
                      <div className="flex gap-4 pt-4">
                        <Button
                          onClick={() => {
                            // Get document ID
                            const docId = selectedUser.kycDocuments.idProof?.docId || 
                                       selectedUser.kycDocuments.addressProof?.docId || 
                                       selectedUser.kycDocuments.selfie?.docId;
                            
                            // Direct API call to avoid any closure issues
                            setIsProcessing(true);
                            apiRequest("PATCH", `/users/${selectedUser.id}/kyc`, {
                              kycStatus: 'approved',
                              docId: docId,
                              notes: verificationNotes
                            }).then(() => {
                              toast({
                                title: "Success",
                                description: "KYC approved successfully"
                              });
                              setShowUserDetails(false);
                              refetch();
                            }).catch(err => {
                              toast({
                                title: "Error",
                                description: "Failed to approve KYC",
                                variant: "destructive"
                              });
                              console.error("KYC approval error:", err);
                            }).finally(() => {
                              setIsProcessing(false);
                            });
                          }}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve KYC
                        </Button>
                        <Button
                          onClick={() => setVerificationAction('reject')}
                          disabled={isProcessing}
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject KYC
                        </Button>
                      </div>
                    )}

                    {/* Verification Notes */}
                    <div className="space-y-2">
                      <Label>Verification Notes</Label>
                      <Textarea
                        placeholder="Add notes about the verification process..."
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">User Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Full Name</p>
                            <p className="font-medium">{selectedUser.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{selectedUser.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{selectedUser.location || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Wallet Balance</p>
                            <p className="font-medium">{formatCurrency(selectedUser.walletBalance)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Account Status</p>
                            <p className="font-medium">{selectedUser.status}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="history">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">KYC History</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">Account Created</p>
                              <p className="text-xs text-muted-foreground">
                                {safeFormat(selectedUser.createdAt, 'MMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          {selectedUser.kycSubmittedAt && (
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-sm">KYC Submitted</p>
                                <p className="text-xs text-muted-foreground">
                                  {safeFormat(selectedUser.kycSubmittedAt, 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedUser.kycVerifiedAt && (
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-sm">KYC Verified</p>
                                <p className="text-xs text-muted-foreground">
                                  {safeFormat(selectedUser.kycVerifiedAt, 'MMM dd, yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          )}
                          {selectedUser.kycRejectedAt && (
                            <div className="flex items-center gap-3">
                              <X className="h-4 w-4 text-red-500" />
                              <div>
                                <p className="text-sm">KYC Rejected</p>
                                <p className="text-xs text-muted-foreground">
                                  {safeFormat(selectedUser.kycRejectedAt, 'MMM dd, yyyy HH:mm')}
                                </p>
                                {selectedUser.kycRejectionReason && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Reason: {selectedUser.kycRejectionReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Image Viewer Dialog */}
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt="Document"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={verificationAction === 'reject'} onOpenChange={() => setVerificationAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject KYC</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this KYC submission.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Select value={rejectionReason} onValueChange={setRejectionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document_unclear">Documents are unclear or blurry</SelectItem>
                    <SelectItem value="document_invalid">Invalid or expired documents</SelectItem>
                    <SelectItem value="information_mismatch">Information doesn't match</SelectItem>
                    <SelectItem value="fraudulent">Suspected fraudulent documents</SelectItem>
                    <SelectItem value="incomplete">Incomplete submission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Provide additional details about the rejection..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerificationAction(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedUser) {
                    // Directly call API to avoid any closure issues
                    setIsProcessing(true);
                    apiRequest("PATCH", `/users/${selectedUser.id}/kyc`, {
                      kycStatus: 'REJECTED', // Ensure uppercase to match server expectations
                      docId: currentDocId,
                      rejectionReason: rejectionReason,
                      notes: verificationNotes
                    }).then(() => {
                      toast({
                        title: "Success",
                        description: "KYC rejected successfully"
                      });
                      setVerificationAction(null);
                      setRejectionReason("");
                      setVerificationNotes("");
                      setCurrentDocId(undefined);
                      setShowUserDetails(false);
                      refetch();
                    }).catch(err => {
                      toast({
                        title: "Error",
                        description: "Failed to reject KYC",
                        variant: "destructive"
                      });
                      console.error("KYC rejection error:", err);
                    }).finally(() => {
                      setIsProcessing(false);
                    });
                  }
                }}
                disabled={!rejectionReason || isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Reject KYC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Review Dialog */}
        {selectedUser && selectedUser.kycDocuments && (
          <Dialog open={showDocumentReviewDialog} onOpenChange={setShowDocumentReviewDialog}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>ID Document Review</DialogTitle>
                <DialogDescription>
                  Review complete user identification documentation
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[70vh]">
                <div className="space-y-6">
                  {/* User info */}
                  <div className="pb-4 border-b">
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`
                        ${selectedUser.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : ''}
                        ${selectedUser.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                        ${selectedUser.kycStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {selectedUser.kycStatus}
                      </Badge>
                      {selectedUser.kycSubmittedAt && (
                        <span className="text-xs text-muted-foreground">
                          Submitted: {safeFormat(selectedUser.kycSubmittedAt, 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Document images - large view */}
                  <div className="space-y-6">
                    {/* Front side */}
                    {selectedUser.kycDocuments.idProof && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">ID Document - Front Side</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedUser.kycDocuments.idProof.fileName}
                          </p>
                        </div>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedUser.kycDocuments.idProof.url}
                            alt="Front Side" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => {
                              setSelectedImage(selectedUser.kycDocuments!.idProof!.url);
                              setShowImageViewer(true);
                              setShowDocumentReviewDialog(false);
                            }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Back side */}
                    {selectedUser.kycDocuments.addressProof && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">ID Document - Back Side</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedUser.kycDocuments.addressProof.fileName}
                          </p>
                        </div>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedUser.kycDocuments.addressProof.url}
                            alt="Back Side" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => {
                              setSelectedImage(selectedUser.kycDocuments!.addressProof!.url);
                              setShowImageViewer(true);
                              setShowDocumentReviewDialog(false);
                            }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Selfie */}
                    {selectedUser.kycDocuments.selfie && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Selfie with ID</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedUser.kycDocuments.selfie.fileName}
                          </p>
                        </div>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedUser.kycDocuments.selfie.url}
                            alt="Selfie" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => {
                              setSelectedImage(selectedUser.kycDocuments!.selfie!.url);
                              setShowImageViewer(true);
                              setShowDocumentReviewDialog(false);
                            }}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              
              <DialogFooter className="pt-4 border-t flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDocumentReviewDialog(false)}
                >
                  Close
                </Button>
                
                {selectedUser.kycStatus === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Find the document ID from the KYC documents
                        const docId = selectedUser.kycDocuments?.idProof?.docId || 
                                      selectedUser.kycDocuments?.addressProof?.docId || 
                                      selectedUser.kycDocuments?.selfie?.docId;
                        // Set verification action to show the rejection dialog, and save the doc ID
                        setVerificationAction('reject');
                        // Store the document ID for later use
                        setCurrentDocId(docId);
                        setShowDocumentReviewDialog(false);
                      }}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={() => {
                        if (selectedUser) {
                          // Find the document ID from the KYC documents
                          const docId = selectedUser.kycDocuments?.idProof?.docId || 
                                        selectedUser.kycDocuments?.addressProof?.docId || 
                                        selectedUser.kycDocuments?.selfie?.docId;
                          
                          // Direct API call to avoid any closure issues
                          setIsProcessing(true);
                          apiRequest("PATCH", `/users/${selectedUser.id}/kyc`, {
                            kycStatus: 'approved',
                            docId: docId
                          }).then(() => {
                            toast({
                              title: "Success",
                              description: "KYC approved successfully"
                            });
                            setShowDocumentReviewDialog(false);
                            refetch();
                          }).catch(err => {
                            toast({
                              title: "Error",
                              description: "Failed to approve KYC",
                              variant: "destructive"
                            });
                            console.error("KYC approval error:", err);
                          }).finally(() => {
                            setIsProcessing(false);
                          });
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
};

export default KYC;
