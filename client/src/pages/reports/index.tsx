import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";


const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">View and analyze system reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p>View detailed tournament statistics and performance metrics.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Analyze user engagement and activity patterns.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Track revenue, payouts, and financial transactions.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Monitor system performance and error logs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports; 
