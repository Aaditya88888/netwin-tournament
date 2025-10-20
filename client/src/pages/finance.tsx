import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { BulkBonusManagement } from "@/components/bulk-bonus-management";
import { UserTransactionManagement } from "@/components/user-transaction-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  CreditCard,
  Wallet,
  ArrowUpDown,
  RefreshCw,
  Download,
  Trophy,
} from "lucide-react";

interface FinanceStats {
  totalWalletBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalBonuses: number;
  totalPrizesDistributed: number;
  totalRevenue: number;
  pendingWithdrawals: number;
  monthlyRevenue: number;
}

interface Transaction {
  id: number;
  userId: number;
  userName?: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
  tournamentId?: string;
}

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch finance statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["finance-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/admin/finance/stats");
      return await response.json() as FinanceStats;
    },
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/transactions?limit=50&sort=createdAt&order=desc");
      return await response.json() as Transaction[];
    },
  });

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "bonus":
        return "default";
      case "withdraw":
        return "destructive";
      case "entry_fee":
        return "secondary";
      case "prize_first":
      case "prize_second":
      case "prize_kills":
        return "outline";
      default:
        return "secondary";
    }
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

  return (
    <>
      <Helmet>
        <title>Finance & Wallet Management | NetWin Admin</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Finance & Wallet Management</h1>
            <p className="text-muted-foreground">
              Manage user wallets, bonuses, and financial transactions
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bulk-bonus">Bulk Bonus</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Finance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Wallet Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.totalWalletBalance || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all user wallets
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {formatCurrency(stats?.monthlyRevenue || 0)} this month
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bonuses Given</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.totalBonuses || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total bonus money distributed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prizes Distributed</CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.totalPrizesDistributed || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tournament prize money
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest financial activities across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading transactions...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions?.slice(0, 10).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center">
                              {getTransactionIcon(transaction.type)}
                              <Badge
                                variant={getTransactionTypeColor(transaction.type)}
                                className="ml-2"
                              >
                                {transaction.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {transaction.userName || `User ${transaction.userId}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                transaction.status === "completed"
                                  ? "default"
                                  : transaction.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-48 truncate">
                              {transaction.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-bonus" className="space-y-6">
            <BulkBonusManagement />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <UserTransactionManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Generate and download financial reports and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Financial reporting features coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
