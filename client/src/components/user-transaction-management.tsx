import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DollarSign,
  Plus,
  ArrowUpDown,
  Gift,
  TrendingUp,
  TrendingDown,
  History,
  Wallet,
} from "lucide-react";

interface Transaction {
  id: number;
  userId?: number;
  amount: number;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
  tournamentId?: string;
}

interface UserTransactionData {
  user: {
    id: number;
    name: string;
    email: string;
    walletBalance: number;
  };
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserData {
  id: number;
  name: string;
  email: string;
  walletBalance: number;
}

interface TransactionData {
  user: UserData;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserTransactionManagementProps {
  userId?: string;
  tournamentId?: string;
}

export function UserTransactionManagement({
  userId,
  tournamentId,
}: UserTransactionManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [isAddBonusOpen, setIsAddBonusOpen] = useState(false);

  // Fetch user transactions
  const {
    data: transactionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-transactions", userId, tournamentId, page, typeFilter],
    queryFn: async () => {
      let url = "";
      if (userId) {
        url = `/users/${userId}/transactions?page=${page}&limit=20&type=${typeFilter}`;
      } else if (tournamentId) {
        url = `/tournaments/${tournamentId}/transactions?page=${page}&limit=20&type=${typeFilter}`;
      } else {
        throw new Error("Either userId or tournamentId must be provided");
      }
      
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: !!(userId || tournamentId),
  });

  // Add bonus mutation
  const addBonusMutation = useMutation({
    mutationFn: async ({
      amount,
      description,
    }: {
      amount: number;
      description: string;
    }) => {
      const response = await apiRequest("POST", `/users/${userId}/add-bonus`, {
        amount,
        description,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Bonus of $${data.data.amount} added successfully`,
      });
      setBonusAmount("");
      setBonusDescription("");
      setIsAddBonusOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add bonus",
        variant: "destructive",
      });
    },
  });

  const handleAddBonus = () => {
    const amount = parseFloat(bonusAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    addBonusMutation.mutate({ amount, description: bonusDescription });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "bonus":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "withdraw":
      case "entry_fee":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "prize_first":
      case "prize_second":
      case "prize_kills":
        return <Gift className="h-4 w-4 text-yellow-600" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "bonus":
      case "prize_first":
      case "prize_second":
      case "prize_kills":
        return "text-green-600";
      case "withdraw":
      case "entry_fee":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatTransactionType = (type: string) => {
    const typeMap: Record<string, string> = {
      deposit: "Deposit",
      withdraw: "Withdrawal",
      entry_fee: "Entry Fee",
      bonus: "Admin Bonus",
      prize_first: "First Place Prize",
      prize_second: "Second Place Prize",
      prize_kills: "Kill Reward",
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error || !transactionData?.success) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load transaction data. Please try again.
      </div>
    );
  }

  const { user, transactions, pagination } = transactionData.data;

  // Calculate summary stats
  const totalDeposits = transactions
    .filter((t) =>
      [
        "deposit",
        "bonus",
        "prize_first",
        "prize_second",
        "prize_kills",
      ].includes(t.type)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter((t) => ["withdraw", "entry_fee"].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* User Wallet Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Overview - {user.name}
          </CardTitle>
          <CardDescription>
            Current balance and transaction summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                ${user.walletBalance.toFixed(2)}
              </div>
              <div className="text-sm text-green-600">Current Balance</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                ${totalDeposits.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600">Total Credits</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">
                ${totalWithdrawals.toFixed(2)}
              </div>
              <div className="text-sm text-red-600">Total Debits</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {transactions.length}
              </div>
              <div className="text-sm text-purple-600">Total Transactions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdraw">Withdrawals</SelectItem>
              <SelectItem value="entry_fee">Entry Fees</SelectItem>
              <SelectItem value="bonus">Bonuses</SelectItem>
              <SelectItem value="prize_first">First Place Prizes</SelectItem>
              <SelectItem value="prize_second">Second Place Prizes</SelectItem>
              <SelectItem value="prize_kills">Kill Rewards</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddBonusOpen} onOpenChange={setIsAddBonusOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Bonus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bonus to {user.name}</DialogTitle>
              <DialogDescription>
                Add bonus money to the user's wallet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Reason for bonus (optional)"
                  value={bonusDescription}
                  onChange={(e) => setBonusDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddBonus}
                  disabled={addBonusMutation.isPending}
                  className="flex-1"
                >
                  {addBonusMutation.isPending ? "Adding..." : "Add Bonus"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddBonusOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Complete transaction history for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          {formatTransactionType(transaction.type)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {transaction.description || "No description"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${getTransactionColor(
                          transaction.type
                        )}`}
                      >
                        {[
                          "deposit",
                          "bonus",
                          "prize_first",
                          "prize_second",
                          "prize_kills",
                        ].includes(transaction.type)
                          ? "+"
                          : "-"}
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transaction.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
