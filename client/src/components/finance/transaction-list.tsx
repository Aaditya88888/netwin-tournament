import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Transaction, User } from "@shared/schema";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  formatCurrency, 
  formatDateTime, 
  getInitials, 
  getStatusColor 
} from "@/lib/utils";

const TransactionList = () => {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all transactions
  const { data: transactions, isLoading, isError } = useQuery<Transaction[]>({
    queryKey: ['/transactions'],
  });

  // Fetch all users for reference
  const { data: users } = useQuery<User[]>({
    queryKey: ['/users'],
  });
  // Get user info by ID
  const getUserInfo = (userId: number) => {
    return (users || []).find((user: User) => user.id === userId);
  };

  // Filter transactions based on selected filter and search query
  const filteredTransactions = (transactions || []).filter((transaction: Transaction) => {
    // Apply type filter
    if (filter !== "all" && transaction.type !== filter) {
      return false;
    }
    
    // Apply search filter
    if (searchQuery) {
      const user = getUserInfo(transaction.userId);
      const searchLower = searchQuery.toLowerCase();
      
      if (!user) return false;
      
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.username.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-destructive text-lg">Failed to load transactions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-game">Transaction History</CardTitle>
        <CardDescription>
          View all financial transactions on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or description..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filter}
            onValueChange={setFilter}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Transaction Type</SelectLabel>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="entry_fee">Entry Fees</SelectItem>
                <SelectItem value="reward">Rewards/Payouts</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : filteredTransactions?.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions?.map((transaction) => {
                  const user = getUserInfo(transaction.userId);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {user ? (
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 bg-primary">
                              <AvatarFallback>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">User #{transaction.userId}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        <div className="flex items-center gap-2">                        <span>{transaction.description}</span>
                          {(transaction as any).metadata?.isDemo && (
                            <Badge variant="outline" className="text-xs bg-blue-900/20 text-blue-400 border-blue-700">
                              DEMO
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.type === 'entry_fee' ? 'Entry Fee' : 
                           transaction.type === 'reward' ? 'Reward' : 
                           transaction.type === 'deposit' ? 'Deposit' : 
                           transaction.type === 'withdrawal' ? 'Withdrawal' : 
                           transaction.type}
                        </Badge>
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
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(transaction.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;
