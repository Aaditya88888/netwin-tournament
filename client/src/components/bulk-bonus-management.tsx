import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Gift, Users, DollarSign, RefreshCw, Send, CheckCircle, X, AlertCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: number;
  name: string;
  email: string;
  walletBalance: number;
  status: string;
  kycStatus: string;
}

interface BulkBonusResult {
  userId: number;
  userName: string;
  success: boolean;
  newBalance?: number;
  error?: string;
}

export function BulkBonusManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKycStatus, setFilterKycStatus] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastResults, setLastResults] = useState<BulkBonusResult[]>([]);

  // Fetch all users
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users", "bulk-bonus", filterStatus, filterKycStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterKycStatus !== "all") params.append("kycStatus", filterKycStatus);
      
      const response = await apiRequest("GET", `/users/search?${params.toString()}`);
      const data = await response.json();
      return data.users || [];
    },
  });

  // Bulk add bonus mutation
  const bulkBonusMutation = useMutation({
    mutationFn: async ({
      userIds,
      amount,
      description,
    }: {
      userIds: number[];
      amount: number;
      description: string;
    }) => {
      const response = await apiRequest("POST", "/users/bulk-add-bonus", {
        userIds,
        amount,
        description,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setLastResults(data.data.results);
      toast({
        title: "Bulk Bonus Completed",
        description: `Successfully processed ${data.data.summary.successful} out of ${data.data.summary.total} users`,
      });
      setBonusAmount("");
      setBonusDescription("");
      setSelectedUsers([]);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process bulk bonus",
        variant: "destructive",
      });
    },
  });

  const handleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleBulkBonus = () => {
    const amount = parseFloat(bonusAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user to receive the bonus",
        variant: "destructive",
      });
      return;
    }

    bulkBonusMutation.mutate({
      userIds: selectedUsers,
      amount,
      description: bonusDescription || "Bulk admin bonus",
    });
  };

  const filteredUsers = users?.filter((user: User) => {
    if (filterStatus !== "all" && user.status !== filterStatus) return false;
    if (filterKycStatus !== "all" && user.kycStatus !== filterKycStatus) return false;
    return true;
  }) || [];

  const totalSelectedAmount = selectedUsers.length * parseFloat(bonusAmount || "0");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gift className="h-5 w-5 mr-2" />
            Bulk Bonus Management
          </CardTitle>
          <CardDescription>
            Add bonus money to multiple users at once. Use filters to target specific user groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            <div className="flex-1 min-w-48">
              <Label htmlFor="kyc-filter">Filter by KYC Status</Label>
              <select
                id="kyc-filter"
                value={filterKycStatus}
                onChange={(e) => setFilterKycStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              >
                <option value="all">All KYC Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {selectedUsers.length} of {filteredUsers.length} users selected
                </span>
              </div>
              {totalSelectedAmount > 0 && (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Total: ${totalSelectedAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={selectedUsers.length === 0}>
                  <Gift className="h-4 w-4 mr-2" />
                  Add Bonus
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bulk Bonus</DialogTitle>
                  <DialogDescription>
                    Add bonus money to {selectedUsers.length} selected users.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bonus-amount">Bonus Amount (per user)</Label>
                    <Input
                      id="bonus-amount"
                      type="number"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bonus-description">Description</Label>
                    <Textarea
                      id="bonus-description"
                      value={bonusDescription}
                      onChange={(e) => setBonusDescription(e.target.value)}
                      placeholder="Reason for bonus (optional)"
                      rows={3}
                    />
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span>Recipients:</span>
                      <span className="font-medium">{selectedUsers.length} users</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Amount per user:</span>
                      <span className="font-medium">${bonusAmount || "0.00"}</span>
                    </div>
                    <div className="flex justify-between items-center font-medium">
                      <span>Total amount:</span>
                      <span>${totalSelectedAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleBulkBonus}
                    disabled={bulkBonusMutation.isPending}
                    className="w-full"
                  >
                    {bulkBonusMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {bulkBonusMutation.isPending ? "Processing..." : "Add Bonus"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({filteredUsers.length})</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredUsers.length === 0}
            >
              {selectedUsers.length === filteredUsers.length ? "Deselect All" : "Select All"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load users</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.kycStatus === "approved"
                            ? "default"
                            : user.kycStatus === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {user.kycStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${user.walletBalance?.toFixed(2) || "0.00"}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Last Results */}
      {lastResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Last Bulk Bonus Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>New Balance</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.userName}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Success
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <X className="h-4 w-4 mr-1" />
                          Failed
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.newBalance ? `$${result.newBalance.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {result.error && (
                        <span className="text-sm text-destructive">{result.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
