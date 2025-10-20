import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Transaction } from "@shared/schema";
import { Tournament } from "@shared/types";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const RevenueOverview = () => {
  // Fetch all transactions for revenue calculation
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['/transactions'],
  });

  // Fetch all tournaments for tournament data
  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ['/tournaments'],
  });

  // Calculate revenue statistics
  const calculateRevenue = () => {
    if (!transactions) return { total: 0, byType: [], byMonth: [] };
    
    const total = transactions
      .filter(t => t.type === 'entry_fee' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Revenue by type
    const byTypeMap = transactions
      .filter(t => t.status === 'completed')
      .reduce((acc, t) => {
        const type = t.type;
        if (type === 'entry_fee') {
          acc.entryFees = (acc.entryFees || 0) + t.amount;
        } else if (type === 'deposit') {
          acc.deposits = (acc.deposits || 0) + t.amount;
        }
        return acc;
      }, { entryFees: 0, deposits: 0, sponsorships: 35000 }); // Adding mock sponsorship data
    
    const byType = [
      { name: 'Entry Fees', value: byTypeMap.entryFees || 0 },
      { name: 'Deposits', value: byTypeMap.deposits || 0 },
      { name: 'Sponsorships', value: byTypeMap.sponsorships || 0 },
    ];
    
    // Revenue by month (last 6 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const byMonth = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[month.getMonth()];
      
      const revenue = transactions
        .filter(t => {
          const transDate = new Date(t.createdAt);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.type === 'entry_fee' && 
                 t.status === 'completed';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const payouts = transactions
        .filter(t => {
          const transDate = new Date(t.createdAt);
          return transDate.getMonth() === month.getMonth() && 
                 transDate.getFullYear() === month.getFullYear() &&
                 t.type === 'reward' && 
                 t.status === 'completed';
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      byMonth.push({
        name: monthName,
        revenue,
        payouts,
        profit: revenue - payouts
      });
    }
    
    return { total, byType, byMonth };
  };

  // Tournament performance data
  const calculateTournamentPerformance = () => {
    if (!tournaments) return [];
      return tournaments
      .filter(t => t.status === 'completed')
      .map(t => ({
        name: t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title,
        revenue: (t.entryFee || 0) * (t.registeredTeams || 0),
        payouts: t.prizePool || 0,
        profit: ((t.entryFee || 0) * (t.registeredTeams || 0)) - (t.prizePool || 0)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const revenueData = calculateRevenue();
  const tournamentPerformance = calculateTournamentPerformance();

  // Colors for the pie chart
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>
              Overall platform revenue
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-4xl font-bold font-game mb-2">
              {isLoading ? "Loading..." : formatCurrency(revenueData.total)}
            </div>
            <p className="text-sm text-muted-foreground">
              From tournament entry fees
            </p>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>
              Revenue by source
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p>Loading...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueData.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {revenueData.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue & Payouts</CardTitle>
          <CardDescription>
            Revenue, payouts, and profit trends over the past 6 months
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <p>Loading...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueData.byMonth}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" activeDot={{ r: 8 }} name="Revenue" />
                <Line type="monotone" dataKey="payouts" stroke="hsl(var(--destructive))" name="Payouts" />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--secondary))" name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Tournament Performance</CardTitle>
          <CardDescription>
            Revenue and profit for the top 5 tournaments
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {!tournaments ? (
            <div className="h-full flex items-center justify-center">
              <p>Loading...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tournamentPerformance}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
                <Bar dataKey="payouts" fill="hsl(var(--destructive))" name="Payouts" />
                <Bar dataKey="profit" fill="hsl(var(--secondary))" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
        <CardFooter className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground flex-1">
            Showing top 5 tournaments by revenue
          </p>
          <Button variant="outline">
            View All Tournaments
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RevenueOverview;
