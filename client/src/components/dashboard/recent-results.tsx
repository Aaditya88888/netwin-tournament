import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tournament } from "@shared/types";
import React from "react";


const RecentResults = () => {
  const { data: results, isLoading } = useQuery<Tournament[]>({
    queryKey: ['/tournaments/completed'],
  });

  return (
    <Card className="game-card rounded-lg shadow-md">
      <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-game font-bold">Recent Tournament Results</CardTitle>
        <Link href="/matches" className="text-sm text-primary hover:text-primary/80">View all</Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <p>Loading results...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tournament</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Winner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prize</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(results || []).slice(0, 4).map((tournament: Tournament, index: number) => (
                <tr key={tournament.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 bg-primary">
                        <AvatarFallback className="font-game">B</AvatarFallback>
                      </Avatar>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-foreground">{tournament.title}</div>
                        <div className="text-xs text-muted-foreground">{tournament.maxTeams} Teams</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {index === 0 ? "Team Phoenix" : 
                       index === 1 ? "xSpartan" :
                       index === 2 ? "Vengeance Duo" : "Domination Squad"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {index === 0 ? "23 Kills" : 
                       index === 1 ? "11 Kills" :
                       index === 2 ? "17 Kills" : "19 Kills"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {formatCurrency(tournament.prizePool * 0.5)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(tournament.startTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/matches/${tournament.id}`} className="text-primary hover:text-primary/80">Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentResults;
