import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, Trophy, DollarSign, Clock, ArrowLeft, Eye, Pencil } from 'lucide-react';
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { Tournament, Match, MatchResult, TeamRegistration } from "@/lib/firebase/models";
import ResultVerification from "./result-verification";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";

interface MatchDetailProps {
  tournamentId: string;
}

const MatchDetail = ({ tournamentId }: MatchDetailProps) => {
  // Fetch tournament details
  const { data: tournament, isLoading: isLoadingTournament } = useQuery<Tournament>({
    queryKey: [`/tournaments/${tournamentId}`],
  });

  // Fetch registrations
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery<TeamRegistration[]>({
    queryKey: [`/tournaments/${tournamentId}/registrations`],
  });

  // Fetch results
  const { data: results, isLoading: isLoadingResults } = useQuery<MatchResult[]>({
    queryKey: [`/tournaments/${tournamentId}/results`],
  });

  if (isLoadingTournament) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-1/3 bg-card animate-pulse rounded-md"></div>
        <div className="h-60 bg-card animate-pulse rounded-md"></div>
        <div className="h-40 bg-card animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-destructive text-lg">Tournament not found</p>
            <Button 
              variant="outline" 
              asChild
              className="mt-4"
            >
              <Link href="/matches">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tournaments
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusClass = getStatusColor(tournament.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Button variant="outline" size="sm" asChild className="mr-4">
            <Link href="/matches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-game font-bold">{tournament.title}</h1>
            <div className="flex items-center mt-1">
              <Badge className={statusClass}>
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/matches/${tournamentId}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          {(tournament.status === "live" || tournament.status === "completed") && (
            <Button size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-48 bg-card-foreground/5 relative">
          {tournament.bannerImage && (
            <img 
              src={tournament.bannerImage} 
              alt={tournament.title} 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-start space-x-3">
              <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Date & Time</div>
                <div className="font-medium">{formatDateTime(tournament.startTime)}</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Game & Map</div>
                <div className="font-medium">{tournament.gameType} - {tournament.map}</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Match Type</div>
                <div className="font-medium">{tournament.matchType}</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Entry Fee</div>
                <div className="font-medium">{formatCurrency(tournament.entryFee)}</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Trophy className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Prize Pool</div>
                <div className="font-medium">{formatCurrency(tournament.prizePool)}</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Registered Teams</div>
                <div className="font-medium">{tournament.registeredTeams}/{tournament.maxTeams}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">{tournament.description || "No description provided."}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Rules & Guidelines</h3>
              <p className="text-muted-foreground whitespace-pre-line">{tournament.rules || "No rules specified."}</p>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Rewards Distribution</h3>              <div className="grid grid-cols-2 gap-4 mt-3">
                {(tournament.rewardsDistribution || []).map((reward, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-card-foreground/5 rounded-md">
                    <span className="font-medium">Position {reward.position}</span>
                    <span className="text-primary font-medium">{reward.percentage}%</span>
                  </div>
                ))}
                
                {/* Add per kill reward display */}
                {tournament.killReward && (
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-md border border-red-500/20">
                    <span className="font-medium">Per Kill</span>
                    <span className="text-red-400 font-medium">₹{tournament.killReward}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="participants">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>
        
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Registered Teams</CardTitle>
              <CardDescription>
                {isLoadingRegistrations ? "Loading..." : `${registrations?.length || 0} teams registered for this tournament`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRegistrations ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : !registrations || registrations.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No teams registered yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrations.map((registration) => (
                    <div key={registration.id} className="p-4 border border-border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{registration.teamName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {registration.paymentStatus === "completed" ? (
                              <Badge variant="success">Payment Completed</Badge>
                            ) : (
                              <Badge variant="default">Payment Pending</Badge>
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/users/${registration.userId}`}>
                            View User
                          </Link>
                        </Button>
                      </div>                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Team Members</h5>                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(registration.teamMembers || []).map((member: any, index: number) => (
                            <div key={index} className="flex items-center p-2 bg-card-foreground/5 rounded-md">
                              <div>
                                <p className="font-medium">{member.username}</p>
                                <p className="text-xs text-muted-foreground">In-game ID: {member.inGameId}</p>
                              </div>
                            </div>
                          )) || <p className="text-muted-foreground">No team members found</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Results</CardTitle>
              <CardDescription>
                {tournament.status === "upcoming" 
                  ? "Results will be available after the tournament starts." 
                  : tournament.status === "live" 
                  ? "Results are being updated as the tournament progresses." 
                  : "Final results and rankings of the tournament."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tournament.status === "upcoming" ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">The tournament hasn't started yet.</p>
                </div>
              ) : isLoadingResults ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
                  ))}
                </div>
              ) : !results || results.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No results available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">                  {results
                    .sort((a, b) => (a.position || 999) - (b.position || 999))
                    .map((result) => {
                      const registration = (registrations || []).find(r => r.id === result.registrationId);
                      
                      return (
                        <div key={result.id} className="p-4 border border-border rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-game font-bold mr-3">
                                {result.position || "?"}
                              </div>
                              <div>
                                <h4 className="font-medium">{registration?.teamName || "Unknown Team"}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Kills: {result.kills} | Reward: {formatCurrency(result.reward || 0)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {result.screenshot && (
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Screenshot
                                </Button>
                              )}
                              <Badge className={getStatusColor(result.rewardStatus)}>
                                {result.rewardStatus.charAt(0).toUpperCase() + result.rewardStatus.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verification">
          <ResultVerification tournamentId={tournamentId} status={tournament.status} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatchDetail;
