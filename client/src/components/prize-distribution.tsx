import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RewardDistribution, PrizeDistributionRule } from '../types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy,
  Target,
  DollarSign,
  Users,
  Calculator,
  Info,
  Gift,
  Save,
  Send,
} from "lucide-react";

interface PrizeDistributionData {
  tournament: {
    id: string;
    title: string;
    status: string;
    matchType: string;
    entryFee: number;
    originalPrizePool: number;
    companyCommissionPercentage?: number;
    firstPrizePercentage?: number;
    perKillRewardPercentage?: number;
  };
  prizeCalculation: {
    totalRegistrations: number;
    totalEntryFees: number;
    companyCommission: number;
    actualPrizePool: number;
    firstPrize: number;
    killPrizePool: number;
  };
  players: Array<{
    registrationId: number;
    userId: number | null;
    userName: string;
    teamName: string;
    gameId: string;
    position: number | null;
    kills: number;
    reward: number;
    isTeamLeader: boolean;
  }>;
  canDistribute: boolean;
}

interface PrizeDistributionProps {
  tournamentId: string;
}

export function PrizeDistribution({ tournamentId }: PrizeDistributionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Manual editing state
  const [editedResults, setEditedResults] = useState<
    Record<string, { position?: number | null; kills?: number; reward?: number; rewardBreakdown?: any }>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prize distribution rule state
  const [prizeRule, setPrizeRule] = useState<PrizeDistributionRule | null>(null);
  const [customDistribution, setCustomDistribution] = useState<RewardDistribution[] | null>(null);
  const [isRecalculated, setIsRecalculated] = useState(false);

  // Fetch prize distribution data
  const {
    data: prizeData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["prize-distribution", tournamentId],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/tournaments/${tournamentId}/prize-distribution`
      );
      return response.json();
    },
    enabled: !!tournamentId,
  });

  // Distribute prizes mutation
  const distributePrizesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/tournaments/${tournamentId}/distribute-prizes`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prizes Distributed",
        description: "Prize money has been distributed to all players.",
      });
      refetch();
      queryClient.invalidateQueries({
        queryKey: ["tournament-management", tournamentId],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to distribute prizes: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    },
  });

  // Client-side recalculation function
  const recalculatePrizesMutation = useMutation({
    mutationFn: async () => {
      // First fetch the latest tournament data
      const response = await apiRequest(
        "GET",
        `/tournaments/${tournamentId}/prize-distribution`
      );
      const data = await response.json();
      
      if (!data || !data.data) {
        throw new Error("Failed to fetch tournament data");
      }
      
      const { tournament, players } = data.data;
      
      // Calculate total entry fees based on registrations
      const totalEntryFees = tournament.entryFee * players.length;
      
      // Use commission percentage from tournament data or fall back to 10%
      const commissionPercentage = tournament.companyCommissionPercentage || 10;
      const companyCommission = Math.round(totalEntryFees * (commissionPercentage / 100));
      
      // Use total entry fees as prize pool instead of the predefined prize pool
      const actualPrizePool = totalEntryFees - companyCommission;
      
      // Use percentages from tournament data or fall back to 40/60 split
      const firstPrizePercentage = tournament.firstPrizePercentage || 40; // Default 40% for first prize
      const killPrizePercentage = tournament.perKillRewardPercentage || 60;  // Default 60% for kill rewards
      
      console.log('Prize calculation using saved percentages:', { 
        commissionPercentage,
        firstPrizePercentage,
        killPrizePercentage
      });
      
      const firstPrize = Math.floor(actualPrizePool * (firstPrizePercentage / 100));
      const killPrizePool = actualPrizePool - firstPrize; // Remainder goes to kill pool to avoid rounding issues
      
      // Calculate per-kill reward based on match type (solo, duo, squad)
      let perKillReward = 0;
      if (killPrizePool > 0) {
        const matchType = tournament.matchType?.toLowerCase() || 'solo';
        
        // Calculate number of kills (total players minus the divisor based on match type)
        const getNumKills = (players: number, matchType: string) => {
          switch (matchType.toLowerCase()) {
            case 'solo': return Math.max(players - 1, 0); // Solo: players - 1
            case 'duo': return Math.max(players - 2, 0);  // Duo: players - 2
            case 'squad': return Math.max(players - 4, 0); // Squad: players - 4
            default: return Math.max(players - 1, 0);
          }
        };
        
        const numKills = getNumKills(players.length, matchType);
        
        // Calculate per-kill reward with floor to ensure integer value
        perKillReward = numKills > 0 ? Math.floor(killPrizePool / numKills) : 0;
        
        console.log(`Per kill reward calculation: ${killPrizePool} ÷ ${numKills} (${matchType} type, ${players.length} players) = ${perKillReward}`);
      }
      
      // Create updated data object
      const updatedData = {
        ...data.data,
        prizeCalculation: {
          ...data.data.prizeCalculation,
          totalEntryFees,
          companyCommission,
          actualPrizePool,
          firstPrize,
          killPrizePool,
          perKillReward: Math.round(perKillReward * 100) / 100,
          isRecalculated: true
        }
      };
      
      // Return the updated data (no need to make an API call)
      return updatedData;
    },
    onSuccess: (updatedData) => {
      const { firstPrize, perKillReward, totalRegistrations } = updatedData.prizeCalculation;
      
      toast({
        title: "Prizes Recalculated",
        description: `Prize calculation updated for ${totalRegistrations} players. First prize: ₹${firstPrize}, Per kill: ₹${perKillReward}`,
      });
      
      // Force refresh the data by invalidating the query
      queryClient.setQueryData(["prize-distribution", tournamentId], { data: updatedData });
      
      // Set recalculated flag
      setIsRecalculated(true);
      
      // Clear any edited results to show fresh data
      setEditedResults({});
      setHasUnsavedChanges(false);
      
      // Trigger a refetch to ensure we have the latest data
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to recalculate prizes: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Fetch prize distribution rule and distribution
  const { data: prizeDistData, refetch: refetchPrizeDist } = useQuery({
    queryKey: ["prize-distribution-rule", tournamentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/tournaments/${tournamentId}/prize-distribution`);
      return res.json();
    },
    enabled: !!tournamentId,
  });
  useEffect(() => {
    if (prizeDistData) {
      setPrizeRule(prizeDistData.rule);
      setCustomDistribution(prizeDistData.distribution);
    }
  }, [prizeDistData]);

  // Save override
  const saveOverride = async () => {
    if (!prizeRule || !customDistribution) return;
    await apiRequest("POST", `/tournaments/${tournamentId}/prize-distribution`, {
      rule: { ...prizeRule, adminOverride: true },
      overrideDistribution: customDistribution
    });
    toast({ title: 'Override Saved', description: 'Custom prize distribution saved.' });
    refetchPrizeDist();
  };

  const handleDistributePrizes = () => {
    // Show confirmation before distributing prizes
    if (window.confirm(
      `Are you sure you want to distribute prize money to all verified players? This action cannot be undone. 
      \n\nTotal prize pool: ₹${prizeData?.data?.prizeCalculation?.actualPrizePool || 0}
      \nThis will send money to players with verified results.`
    )) {
      distributePrizesMutation.mutate();
    }
  };

  // Save tournament results mutation
  const saveResultsMutation = useMutation({
    mutationFn: async (
      results: Array<{
        registrationId: number;
        userId?: string;
        position: number | null;
        kills: number;
        reward?: number;
      }>
    ) => {
      const response = await apiRequest(
        "POST",
        `/tournaments/${tournamentId}/results`,
        results
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Results Saved",
        description: "Tournament results have been saved successfully.",
      });
      setEditedResults({});
      setHasUnsavedChanges(false);
      refetch();
      queryClient.invalidateQueries({
        queryKey: ["tournament-management", tournamentId],
      });
    },
    onError: (error: any) => {
      console.error('Save results error:', error);
      toast({
        title: "Error",
        description: `Failed to save results: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    },
  });

  // Helper functions for manual editing
  const handlePlayerEdit = (
    registrationId: number,
    field: "position" | "kills",
    value: string
  ) => {
    const key = registrationId.toString();
    const currentPlayer = prizeData?.data.players.find(
      (p: any) => p.registrationId === registrationId
    );

    setEditedResults((prev) => {
      const newPosition = field === "position"
        ? value === ""
          ? null
          : parseInt(value) || null
        : prev[key]?.position ?? currentPlayer?.position ?? null;
      
      const newKills = field === "kills"
        ? parseInt(value) || 0
        : prev[key]?.kills ?? currentPlayer?.kills ?? 0;

      const updatedResults = {
        ...prev,
        [key]: {
          position: newPosition,
          kills: newKills,
          reward: prev[key]?.reward,
          rewardBreakdown: prev[key]?.rewardBreakdown
        },
      };

      setHasUnsavedChanges(true);
      return updatedResults;
    });
  };

  const getPlayerValue = (
    player: any,
    field: "position" | "kills"
  ): number | null => {
    if (!player.registrationId) return player[field];
    const edited = editedResults[player.registrationId.toString()];
    if (edited && edited[field] !== undefined) {
      return edited[field];
    }
    return player[field];
  };

  const handleSaveResults = () => {
    if (!prizeData?.data) return;

    const results = prizeData.data.players
      .map((player: any) => {
        if (!player.registrationId) return null;
        const edited = editedResults[player.registrationId.toString()];
        
        return {
          registrationId: player.registrationId,
          userId: player.userId,
          position: edited?.position ?? player.position,
          kills: edited?.kills ?? player.kills,
          reward: edited?.reward ?? player.reward,
        };
      })
      .filter(Boolean);

    console.log('Saving results:', results);
    saveResultsMutation.mutate(results);
  };

  const calculateRewards = () => {
    if (!prizeData?.data) return;
    
    const { players } = prizeData.data;
    const prizeCalculation = prizeData.data.prizeCalculation;
    
    const firstPrize = prizeCalculation.firstPrize || 0;
    const killPrizePool = prizeCalculation.killPrizePool || 0;
    
    // Calculate total kills to determine per-kill reward
    const totalKills = players.reduce(
      (sum: number, p: any) => sum + (getPlayerValue(p, "kills") || 0),
      0
    );
    
    const perKillReward = totalKills > 0 ? killPrizePool / totalKills : 0;

    const newEditedResults: Record<string, { position?: number | null; kills?: number; reward?: number; rewardBreakdown?: any }> = {};
    
    players.forEach((player: any) => {
      const regId = player.registrationId;
      if (!regId) return;
      
      const key = regId.toString();
      const kills = getPlayerValue(player, "kills") || 0;
      const position = getPlayerValue(player, "position");
      
      let reward = 0;
      let rewardBreakdown = {};
      
      // First prize for position 1
      if (position === 1) {
        reward += firstPrize;
        rewardBreakdown = { firstPrize: firstPrize };
      }
      
      // Kill rewards
      if (kills > 0) {
        const killReward = kills * perKillReward;
        reward += killReward;
        rewardBreakdown = { ...rewardBreakdown, killReward };
      }
      
      newEditedResults[key] = {
        position: position,
        kills: kills,
        reward: Math.round(reward * 100) / 100,
        rewardBreakdown: Object.keys(rewardBreakdown).length > 0 ? rewardBreakdown : undefined
      };
    });

    setEditedResults(newEditedResults);
    setHasUnsavedChanges(true);
    
    toast({
      title: "Rewards Calculated",
      description: `Updated rewards for ${players.length} players. First prize: ₹${firstPrize}, Per kill: ₹${perKillReward.toFixed(2)}`,
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading prize distribution data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load prize distribution data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!prizeData?.data) {
    return (
      <Alert>
        <AlertDescription>No prize distribution data available.</AlertDescription>
      </Alert>
    );
  }

  const { tournament, prizeCalculation, players, canDistribute } =
    prizeData.data;

  return (
    <div className="space-y-6">
      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Prize Distribution - {tournament.title}
          </CardTitle>
          <CardDescription>
            Manage tournament results and distribute prize money
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{tournament.status}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{tournament.matchType}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">₹{tournament.entryFee} Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="text-sm">₹{tournament.originalPrizePool} Pool</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prize Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Prize Calculation
            {isRecalculated && (
              <Badge variant="outline" className="ml-2 text-green-600">
                Recalculated
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => recalculatePrizesMutation.mutate()}
              disabled={recalculatePrizesMutation.isPending}
            >
              {recalculatePrizesMutation.isPending ? "Recalculating..." : "Recalculate Prizes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {prizeCalculation.totalRegistrations}
              </div>
              <div className="text-sm text-gray-600">Total Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹{prizeCalculation.totalEntryFees}
              </div>
              <div className="text-sm text-gray-600">Entry Fees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ₹{prizeCalculation.companyCommission}
              </div>
              <div className="text-sm text-gray-600">Commission</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ₹{prizeCalculation.actualPrizePool}
              </div>
              <div className="text-sm text-gray-600">Actual Prize Pool</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center bg-yellow-50 p-3 rounded-lg">
              <div className="text-xl font-semibold text-yellow-700">
                ₹{prizeCalculation.firstPrize ?? <span className='italic text-gray-400'>0</span>}
              </div>
              <div className="text-sm text-yellow-600">1st Prize</div>
            </div>
            <div className="text-center bg-orange-50 p-3 rounded-lg">
              <div className="text-xl font-semibold text-orange-700">
                ₹{prizeCalculation.killPrizePool ?? <span className='italic text-gray-400'>0</span>}
              </div>
              <div className="text-sm text-orange-600">Kill Prize Pool</div>
            </div>
            <div className="text-center bg-blue-50 p-3 rounded-lg">
              <div className="text-xl font-semibold text-blue-700">
                ₹{prizeCalculation.perKillReward ?? <span className='italic text-gray-400'>0</span>}
              </div>
              <div className="text-sm text-blue-600">Per Kill Reward</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Player Results & Manual Entry
          </CardTitle>
          <CardDescription>
            Edit player positions and kills manually. All registered players are shown regardless of submission status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Game ID</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Kills</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player: any, index: number) => (
                  <TableRow key={player.registrationId || `player-${index}`}>
                    <TableCell className="font-medium">
                      {player.userName || "Unknown"}
                    </TableCell>
                    <TableCell>{player.teamName}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {player.gameId}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        className="w-20"
                        value={
                          getPlayerValue(player, "position")?.toString() || ""
                        }
                        onChange={(e) =>
                          player.registrationId && handlePlayerEdit(
                            player.registrationId,
                            "position",
                            e.target.value
                          )
                        }
                        placeholder="Position"
                        disabled={!player.registrationId}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        className="w-20"
                        value={getPlayerValue(player, "kills")?.toString() || "0"}
                        onChange={(e) =>
                          player.registrationId && handlePlayerEdit(
                            player.registrationId,
                            "kills",
                            e.target.value
                          )
                        }
                        placeholder="Kills"
                        disabled={!player.registrationId}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="group relative">
                        <span className="font-semibold text-green-600 cursor-help">
                          ₹{
                            (player.registrationId && editedResults[player.registrationId.toString()]?.reward !== undefined)
                              ? editedResults[player.registrationId.toString()]?.reward
                              : player.reward ?? 0
                          }
                        </span>
                        {player.registrationId && editedResults[player.registrationId.toString()]?.rewardBreakdown && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 -bottom-1 transform translate-y-full z-10 bg-white p-2 rounded shadow-lg border text-xs w-48">
                            <div className="font-semibold border-b pb-1 mb-1">Reward Breakdown</div>
                            {editedResults[player.registrationId.toString()]?.rewardBreakdown?.firstPrize && (
                              <div className="flex justify-between">
                                <span>1st Prize:</span>
                                <span>₹{editedResults[player.registrationId.toString()]?.rewardBreakdown?.firstPrize}</span>
                              </div>
                            )}
                            {editedResults[player.registrationId.toString()]?.rewardBreakdown?.killReward && (
                              <div className="flex justify-between">
                                <span>Kill Rewards:</span>
                                <span>₹{editedResults[player.registrationId.toString()]?.rewardBreakdown?.killReward}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {player.resultSubmitted && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Submitted
                          </Badge>
                        )}
                        {player.resultVerified && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            Verified
                          </Badge>
                        )}
                        {player.isTeamLeader && (
                          <Badge variant="secondary" className="text-xs">
                            Team Leader
                          </Badge>
                        )}
                        {!player.resultSubmitted && !player.resultVerified && (
                          <span className="text-gray-400 text-xs">No result</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveResults}
                disabled={
                  !hasUnsavedChanges || saveResultsMutation.isPending
                }
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saveResultsMutation.isPending ? "Saving..." : "Save Results"}
              </Button>
              <Button
                onClick={calculateRewards}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Calculator className="h-4 w-4" />
                Calculate Rewards
              </Button>
              <Button
                onClick={handleDistributePrizes}
                disabled={
                  !canDistribute ||
                  distributePrizesMutation.isPending ||
                  players.filter(p => p.resultVerified && ((p.position === 1) || (p.kills > 0))).length === 0
                }
                className="flex items-center gap-2"
                variant="default"
              >
                <Send className="h-4 w-4" />
                {distributePrizesMutation.isPending
                  ? "Distributing..."
                  : "Distribute Prizes"}
              </Button>
            </div>
          </div>

          {!canDistribute && (
            <Alert className="mt-4">
              <AlertDescription>
                Prize distribution is not available. Make sure the tournament is
                completed and results are saved.
              </AlertDescription>
            </Alert>
          )}

          {/* Results Summary */}
          <div className="mt-6 p-4 border rounded-md bg-slate-50">
            <div className="font-semibold mb-2">Results Summary</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Players with Position</div>
                <div className="font-medium">
                  {players.filter(p => getPlayerValue(p, "position") !== null).length} / {players.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Kills</div>
                <div className="font-medium">
                  {players.reduce((sum, p) => sum + (getPlayerValue(p, "kills") || 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Prize Money</div>
                <div className="font-medium text-green-600">
                  ₹{(() => {
                    let totalPrize = 0;
                    
                    // Calculate based on edited results
                    players.forEach(p => {
                      const key = p.registrationId?.toString();
                      if (key && editedResults[key]?.reward !== undefined) {
                        totalPrize += editedResults[key].reward!;
                      } else {
                        totalPrize += p.reward || 0;
                      }
                    });
                    
                    return totalPrize;
                  })()}
                </div>
              </div>
            </div>
            
            {/* Validation alerts */}
            {(() => {
              // Check if any player has no position
              const playersWithoutPosition = players.filter(
                p => p.registrationId && getPlayerValue(p, "position") === null
              );
              
              if (playersWithoutPosition.length > 0) {
                return (
                  <Alert variant="default" className="mt-3 border-yellow-500">
                    <AlertDescription className="text-yellow-700">
                      {playersWithoutPosition.length} player(s) have no position assigned.
                      All players should have a position before distributing prizes.
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Prize Distribution Rule UI (Manual Override) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Prize Distribution Manual Override
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="firstPrize">1st Prize (₹)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>First Prize = 40% of Actual Prize Pool</p>
                        <p className="mt-1">Actual Prize Pool = Total Entry Fees - Commission</p>
                        <p className="mt-1">Commission = 10% of Total Entry Fees</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="firstPrize"
                  type="number"
                  min={0}
                  value={prizeRule?.firstPrize ?? prizeCalculation.firstPrize ?? 0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setPrizeRule(prev => {
                      const base = prev || {
                        firstPrize: prizeCalculation.firstPrize ?? 0,
                        perKillReward: prizeCalculation.perKillReward ?? 0,
                        squadSplit: tournament.matchType === 'squad',
                        firstPlacePercent: 40,
                        adminOverride: false
                      };
                      return {
                        ...base,
                        firstPrize: val,
                        adminOverride: true
                      };
                    });
                  }}
                  className="w-32"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="perKillReward">Per Kill Reward (₹)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Per Kill Reward = Kill Prize Pool ÷ Number of Kills</p>
                        <p className="mt-1">Number of Kills depends on match type:</p>
                        <ul className="list-disc ml-4 mt-1">
                          <li>Solo: Total Players - 1</li>
                          <li>Duo: Total Players - 2</li>
                          <li>Squad: Total Players - 4</li>
                        </ul>
                        <p className="mt-1">Kill Prize Pool = 60% of Actual Prize Pool</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="perKillReward"
                  type="number"
                  min={0}
                  value={prizeRule?.perKillReward ?? prizeCalculation.perKillReward ?? 0}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setPrizeRule(prev => {
                      const base = prev || {
                        firstPrize: prizeCalculation.firstPrize ?? 0,
                        perKillReward: prizeCalculation.perKillReward ?? 0,
                        squadSplit: tournament.matchType === 'squad',
                        firstPlacePercent: 40,
                        adminOverride: false
                      };
                      return {
                        ...base,
                        perKillReward: val,
                        adminOverride: true
                      };
                    });
                  }}
                  className="w-32"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button onClick={async () => {
                if (!prizeRule) return;
                
                try {
                  await apiRequest("POST", `/tournaments/${tournamentId}/prize-distribution`, {
                    rule: { ...prizeRule, adminOverride: true },
                  });
                  
                  toast({ 
                    title: 'Override Saved', 
                    description: 'Custom prize distribution saved. Recalculating rewards...' 
                  });
                  
                  // Refresh data
                  await refetchPrizeDist();
                  await refetch();
                } catch (error) {
                  console.error('Error saving prize override:', error);
                  toast({ 
                    title: 'Error', 
                    description: 'Failed to save prize override.', 
                    variant: 'destructive' 
                  });
                }
              }}>Save Override</Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setPrizeRule(null);
                  toast({ 
                    title: 'Reset to Auto', 
                    description: 'Prize distribution reset to automatic calculation.' 
                  });
                }}
              >
                Reset to Auto
              </Button>
            </div>
            {/* Live Preview and Validation */}
            <div className="mt-4">
              <div className="font-semibold">Live Preview</div>
              <div className="flex flex-col gap-2 mt-2">
                <div>
                  <span className="font-medium">1st Prize:</span>
                  <span className="ml-2 text-green-700 font-semibold">₹{prizeRule?.firstPrize ?? prizeCalculation.firstPrize ?? 0}</span>
                </div>
                <div>
                  <span className="font-medium">Per Kill:</span>
                  <span className="ml-2 text-orange-700 font-semibold">₹{prizeRule?.perKillReward ?? prizeCalculation.perKillReward ?? 0}</span>
                </div>
                {/* Validation: warn if total distributed > prize pool */}
                {(() => {
                  const totalPlayers = prizeCalculation.totalRegistrations || 0;
                  const totalKills = players.reduce((sum: number, p: any) => sum + (p.kills || 0), 0);
                  const totalDistributed = (prizeRule?.firstPrize ?? prizeCalculation.firstPrize ?? 0) + (totalKills * (prizeRule?.perKillReward ?? prizeCalculation.perKillReward ?? 0));
                  if (totalDistributed > prizeCalculation.actualPrizePool) {
                    return (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription>
                          Warning: Total distributed (₹{totalDistributed}) exceeds prize pool (₹{prizeCalculation.actualPrizePool})
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User-facing Prize Distribution Summary with Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Prize Distribution Summary
          </CardTitle>
          <CardDescription>
            Based on {prizeCalculation.totalRegistrations || 0} player registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Prize Pool Breakdown */}
            <div className="border-b pb-2">
              <div className="flex justify-between items-center">
                <span>Total Entry Fees:</span>
                <span className="font-medium">₹{prizeCalculation.totalEntryFees || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Commission (10%):</span>
                <span className="font-medium">₹{prizeCalculation.companyCommission || 0}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">Actual Prize Pool:</span>
                <span className="font-semibold">₹{prizeCalculation.actualPrizePool || 0}</span>
              </div>
            </div>
            
            {/* Prizes */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Prize Distribution</div>
              
              {/* First Prize */}
              <div className="flex justify-between items-center">
                <span>1st Prize (40% of Prize Pool):</span>
                <span className="font-semibold text-green-700">₹{prizeRule?.firstPrize ?? prizeCalculation.firstPrize ?? 0}</span>
              </div>
              
              {/* Kill Rewards */}
              <div className="flex justify-between items-center">
                <span>Kill Prize Pool (60% of Prize Pool):</span>
                <span className="font-medium">₹{prizeCalculation.killPrizePool || 0}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Per Kill Reward:
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Calculated as: Kill Prize Pool ÷ (Total Players - {
                          tournament.matchType?.toLowerCase() === 'solo' ? '1' : 
                          tournament.matchType?.toLowerCase() === 'duo' ? '2' : 
                          tournament.matchType?.toLowerCase() === 'squad' ? '4' : '1'
                        })</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="font-semibold text-orange-700">₹{prizeRule?.perKillReward ?? prizeCalculation.perKillReward ?? 0}</span>
              </div>
            </div>

            {/* Reward Positions Display */}
            {Array.isArray(tournament.rewardsDistribution) && tournament.rewardsDistribution.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">Reward Positions</div>
                {tournament.rewardsDistribution.map((reward, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>{reward.position}{reward.position === 1 ? 'st' : reward.position === 2 ? 'nd' : reward.position === 3 ? 'rd' : 'th'} Place:</span>
                    <span className="font-semibold text-green-700">₹{reward.percentage}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}