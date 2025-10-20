import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import React from "react";

import {Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const getTransactionStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success': 
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'refunded':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

const getTransactionTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'deposit':
    case 'win':
    case 'bonus': 
      return 'text-green-600';
    case 'withdrawal':
    case 'entry_fee':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getTransactionTypeSign = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'deposit':
    case 'win':
    case 'bonus':
    case 'refund':
      return '+';
    case 'withdrawal':
    case 'entry_fee':
    case 'penalty':
      return '-';
    default:
      return '';
  }
};

const UserTransactions = () => {
  const { id } = useParams() as { id: string };
  
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/users/${id}`);
      return await response.json();
    }
  });
  
  const { data: transactions, isLoading, isError, error } = useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/users/${id}/transactions`);
      return await response.json();
    },
    enabled: !!id
  });

  useEffect(() => {
    document.title = `User Transactions | Netwin Admin`;
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/users/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to User
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-game">
            {user?.name || user?.username || 'User'}'s Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <p className="text-destructive text-lg">Failed to load transactions</p>
              <p className="text-sm text-muted-foreground mt-2">{error?.message || 'Unknown error'}</p>
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No transaction history available</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {transaction.id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{transaction.type || 'Unknown'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-[200px] block">
                          {transaction.description || 'No description'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getTransactionTypeColor(transaction.type)}>
                          {getTransactionTypeSign(transaction.type)}
                          {formatCurrency(transaction.amount || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionStatusColor(transaction.status)}>
                          {transaction.status || 'Unknown'}
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
    </div>
  );
};

export default UserTransactions;
