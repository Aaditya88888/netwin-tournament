import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import React from "react";


const RevenueChart = () => {
  return (
    <Card className="game-card rounded-lg shadow-md h-full">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-lg font-game font-bold">Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="aspect-square mb-6 bg-card-foreground/5 rounded-lg relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Monthly Revenue</p>
              <p className="text-3xl font-game font-bold text-foreground mt-2">₹247,590</p>
              <p className="text-green-500 text-sm flex items-center justify-center mt-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                21.3% Increase
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Tournament Entries</p>
            <p className="text-sm font-medium text-foreground">₹198,450</p>
          </div>
          <Progress value={80} className="h-2 bg-muted" indicatorClassName="bg-primary" />
          
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Sponsorships</p>
            <p className="text-sm font-medium text-foreground">₹35,000</p>
          </div>
          <Progress value={15} className="h-2 bg-muted" indicatorClassName="bg-secondary" />
          
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Premium Memberships</p>
            <p className="text-sm font-medium text-foreground">₹14,140</p>
          </div>
          <Progress value={5} className="h-2 bg-muted" indicatorClassName="bg-accent" />
        </div>
        
        <div className="mt-6">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/finance">
              View Detailed Report
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
