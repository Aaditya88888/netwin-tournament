import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Users, Calendar, Clock, MapPin } from 'lucide-react';
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import React from "react";

import {Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const getResultStatusColor = (status: string, userResult?: string) => {
  if (!status) return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  
  switch (status?.toLowerCase()) {
    case 'winner':
    case 'won':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'participant':
    case 'played':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'eliminated':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'upcoming':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

const UserMatches = () => {
  const { id } = useParams() as { id: string };
  
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/users/${id}`);
      return await response.json();
    }
  });
  
  const { data: matches, isLoading, isError, error } = useQuery({
    queryKey: ['user-matches', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/users/${id}/matches`);
      return await response.json();
    },
    enabled: !!id
  });

  useEffect(() => {
    document.title = `User Match History | Netwin Admin`;
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
            {user?.name || user?.username || 'User'}'s Match History
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
              <p className="text-destructive text-lg">Failed to load match history</p>
              <p className="text-sm text-muted-foreground mt-2">{error?.message || 'Unknown error'}</p>
            </div>
          ) : !matches || matches.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No match history available</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Game Info</TableHead>
                    <TableHead>Team/Position</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match: any) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(match.startTime || match.date)}</span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(match.startTime || match.date).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tournaments/${match.tournamentId}`} className="hover:underline">
                          <span className="capitalize">{match.tournamentName || <span className='italic text-gray-400'>Unknown Tournament</span>}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{match.gameType || <span className='italic text-gray-400'>Unknown Game</span>}</span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {match.map}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{match.teamName || <span className='italic text-gray-400'>Solo</span>}</span>
                          {match.position && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Trophy className="mr-1 h-3 w-3" />
                              Position: #{match.position}
                            </span>
                          )}
                          {match.kills && (
                            <span className="text-xs text-muted-foreground">
                              Kills: {match.kills}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getResultStatusColor(match.result || match.status)}>
                          {match.result || match.status ? match.result || match.status : <span className='italic text-gray-400'>Unknown</span>}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}`}>
                            View Details
                          </Link>
                        </Button>
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

export default UserMatches;
