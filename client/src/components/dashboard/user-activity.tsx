import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import React from "react";


const UserActivity = () => {
  return (
    <Card className="game-card rounded-lg shadow-md">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-lg font-game font-bold">User Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">New Registrations</p>
              <p className="text-sm font-medium text-foreground">147</p>
            </div>
            <Progress value={75} className="h-2 bg-muted" indicatorClassName="bg-primary" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active Players</p>
              <p className="text-sm font-medium text-foreground">3,210</p>
            </div>
            <Progress value={65} className="h-2 bg-muted" indicatorClassName="bg-accent" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tournament Entries</p>
              <p className="text-sm font-medium text-foreground">892</p>
            </div>
            <Progress value={85} className="h-2 bg-muted" indicatorClassName="bg-secondary" />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">KYC Verified</p>
              <p className="text-sm font-medium text-foreground">2,651</p>
            </div>
            <Progress value={55} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
          </div>
          
          <div className="mt-6">
            <Button className="w-full" asChild>
              <Link href="/users">
                Manage Users
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActivity;
