import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, Eye, ThumbsUp } from 'lucide-react';
import { Tournament, TeamRegistration, MatchResult } from "@shared/schema";

import {Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ResultVerificationProps {
  tournamentId: string;
  status: string;
}

const ResultVerification = ({ tournamentId, status }: ResultVerificationProps) => {
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [verification, setVerification] = useState({
    kills: 0,
    position: 0,
    isVerified: false,
    rewardStatus: "pending",
  });
  
  const { toast } = useToast();
  // Fetch tournament details
  const { data: tournament } = useQuery<Tournament>({
    queryKey: [`/tournaments/${tournamentId}`],
  });

  // Fetch registrations
  const { data: registrations } = useQuery<TeamRegistration[]>({
    queryKey: [`/tournaments/${tournamentId}/registrations`],
  });

  // Fetch results
  const { data: results, isLoading } = useQuery<MatchResult[]>({
    queryKey: [`/tournaments/${tournamentId}/results`],
  });

  // Mutation for updating result
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/results/${selectedResult.id}`, data);
    },
    onSuccess: async () => {
      toast({
        title: "Result Verified",
        description: "The result has been successfully verified and rewards processed.",
      });
      
      // Reset selected result
      setSelectedResult(null);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: [`/tournaments/${tournamentId}/results`] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Verification Failed",
        description: "Failed to verify the result. Please try again.",
        variant: "destructive",
      });
    },
  });
  const handleVerify = () => {
    // Calculate reward based on position and tournament prize pool
    let reward = 0;    if (tournament && verification.position > 0) {
      const rewardDistribution = (tournament.rewardsDistribution || []).find(
        (rd: any) => rd.position === verification.position
      );
      
      if (rewardDistribution) {
        reward = ((tournament.prizePool || 0) * rewardDistribution.percentage) / 100;
      }
    }
    
    const verificationData = {
      ...verification,
      reward,
      rewardStatus: "processed",
    };
    
    mutation.mutate(verificationData);
  };
  const pendingResults = results?.filter((result: MatchResult) => !result.isVerified) || [];
  const verifiedResults = results?.filter((result: MatchResult) => result.isVerified) || [];
  // Find registration info for a result
  const getTeamInfo = (registrationId: number, result?: any) => {
    const reg = (registrations || []).find((reg: TeamRegistration) => reg.id === registrationId);
    // Fallback: if registration not found, try to get teamName from result (if present)
    if (reg) return reg;
    if (result && typeof result === 'object' && 'teamName' in result) return { teamName: result.teamName };
    return null;
  };

  if (status === "scheduled") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <p className="text-muted-foreground">The tournament hasn't started yet. Verification will be available after the tournament begins.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Result Verification</CardTitle>
          <CardDescription>
            Verify submitted results and declare winners to process rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-card animate-pulse rounded-md"></div>
              ))}
            </div>
          ) : pendingResults.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No pending results to verify.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending Verification</h3>
              
              {pendingResults.map((result) => {
                const team = getTeamInfo(result.registrationId, result);
                let members: any[] = [];
                // Try to get teamMembers from registration, or fallback to teammates array or just the main user
                if (team && 'teamMembers' in team && Array.isArray((team as any).teamMembers)) {
                  // Defensive: support both {username}, {displayName}, {name} for each member
                  members = (team as any).teamMembers.map((member: any) => ({
                    username: member.username || member.displayName || member.name || "Unknown",
                    gameId: member.gameId || "-",
                    isOwner: member.isOwner || false
                  }));
                } else if (team && 'teammates' in team && Array.isArray((team as any).teammates)) {
                  members = (team as any).teammates.map((username: string) => ({ username, gameId: "-", isOwner: false }));
                  // Try to get owner from team object (id, userId, or similar)
                  const owner = (team as any).owner || (team as any).userName || (team as any).userId || null;
                  if (owner && typeof owner === 'string') {
                    members.unshift({ username: owner, gameId: "-", isOwner: true });
                  }
                } else if (team) {
                  // Try to get owner from team object (userName, userId, etc)
                  const owner = (team as any).owner || (team as any).userName || (team as any).userId || null;
                  if (owner && typeof owner === 'string') {
                    members = [{ username: owner, gameId: "-", isOwner: true }];
                  }
                }
                return (
                  <div key={result.id} className="p-4 border border-border rounded-md">
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-lg">{team?.teamName || "Unknown Team"}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {members.length > 0 ? (
                          members.map((member: any, idx: number) => {
                            // Defensive: support both {username}, {displayName}, {name}
                            const username = (member && (member.username || member.displayName || member.name)) || "Unknown";
                            const gameId = member && (member.gameId || "-");
                            const isOwner = !!member.isOwner;
                            return (
                              <div key={idx} className="p-2 border rounded bg-muted/30">
                                <div className="font-medium">{username}</div>
                                <div className="text-xs text-muted-foreground">Game ID: {gameId}</div>
                                <div className="text-xs text-muted-foreground">{isOwner ? "Owner" : "Member"}</div>
                                {/* Editable fields for kills and position for each member */}
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Kills"
                                    value={result[`${username}_kills`] || ""}
                                    onChange={e => {
                                      result[`${username}_kills`] = parseInt(e.target.value) || 0;
                                      setVerification({...verification});
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="Position"
                                    value={result[`${username}_position`] || ""}
                                    onChange={e => {
                                      result[`${username}_position`] = parseInt(e.target.value) || 0;
                                      setVerification({...verification});
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-muted-foreground">No team members found</div>
                        )}
                      </div>
                    </div>
                    {/* Existing verify button and logic */}
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setSelectedResult(result);
                          setVerification({
                            kills: result.kills || 0,
                            position: result.position || 0,
                            isVerified: false,
                            rewardStatus: "pending",
                          });
                        }}
                      >
                        Verify Result
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {verifiedResults.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-medium">Verified Results</h3>
              
              {verifiedResults.map((result) => {
                const team = getTeamInfo(result.registrationId, result);
                
                return (
                  <div key={result.id} className="p-4 border border-border rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-game font-bold mr-3">
                          {result.position || "?"}
                        </div>
                        <div>
                          <h4 className="font-medium">{team?.teamName || "Unknown Team"}</h4>
                          <div className="flex items-center mt-1">
                            <Badge variant="outline" className="mr-2">Kills: {result.kills}</Badge>
                            <Badge className="bg-green-500/20 text-green-500">
                              Reward: {formatCurrency(result.reward || 0)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-green-500">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span>Verified</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification modal */}
      <AlertDialog 
        open={!!selectedResult} 
        onOpenChange={(open) => !open && setSelectedResult(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Tournament Result</AlertDialogTitle>
            <AlertDialogDescription>
              Review and verify the submitted result. Once verified, rewards will be automatically processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="team-name">Team</Label>
              <Input 
                id="team-name" 
                value={getTeamInfo(selectedResult?.registrationId, selectedResult)?.teamName || "Unknown Team"} 
                disabled 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kills">Kills</Label>
                <Input 
                  id="kills" 
                  type="number" 
                  min="0"
                  value={verification.kills}
                  onChange={(e) => setVerification({
                    ...verification,
                    kills: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="position">Position</Label>
                <Input 
                  id="position" 
                  type="number" 
                  min="1"
                  value={verification.position}
                  onChange={(e) => setVerification({
                    ...verification,
                    position: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            
            {selectedResult?.screenshot && (
              <div>
                <Label>Screenshot</Label>
                <div className="mt-2 border border-border rounded-md p-2 flex items-center justify-center h-40 bg-card-foreground/5">
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Screenshot
                  </Button>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Add any notes about the verification..."
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setVerification({
                  ...verification,
                  isVerified: true,
                  rewardStatus: "processed"
                });
                handleVerify();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Verify & Process Reward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResultVerification;
